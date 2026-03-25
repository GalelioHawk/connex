import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, FlatList, StyleSheet, KeyboardAvoidingView,
  Platform, Text, TouchableOpacity, ActivityIndicator, AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { useMessageStore } from '../../store/messageStore';
import { chatService, MessageWithSender } from '../../services/chat';
import { supabase } from '../../services/supabase';
import { useTheme } from '../../hooks/useTheme';
import MessageBubble from '../../components/chat/MessageBubble';
import ChatInput from '../../components/chat/ChatInput';
import type { ChatStackParams } from '../../navigation';

type RouteType = RouteProp<ChatStackParams, 'ChatRoom'>;

export default function ChatRoomScreen() {
  const navigation = useNavigation();
  const route      = useRoute<RouteType>();
  const { conversationId, title } = route.params;
  const { colors } = useTheme();

  const accessToken = useAuthStore((s) => s.accessToken)!;
  const user        = useAuthStore((s) => s.user)!;
  const lastPushed  = useMessageStore((s) => s.lastPushedMessage);
  const clearPushed = useMessageStore((s) => s.clearPushedMessage);

  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);

  const flatRef   = useRef<FlatList>(null);
  const latestAt  = useRef<string | null>(null);
  const senderMap = useRef<Record<string, MessageWithSender['sender']>>({});

  // ─── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    loadMessages();
  }, []);

  // ─── Supabase Realtime — instant delivery ─────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`room:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as MessageWithSender;
          const sender: MessageWithSender['sender'] =
            senderMap.current[row.sender_id] ??
            (row.sender_id === user.id
              ? { id: user.id, name: user.name, avatar_url: user.avatar_url }
              : { id: row.sender_id, name: title, avatar_url: null });

          const msg: MessageWithSender = { ...row, sender };

          setMessages((prev) => {
            if (prev.find((m) => m.id === msg.id)) return prev;
            latestAt.current = msg.created_at;
            setTimeout(scrollToBottom, 50);
            return [...prev, msg];
          });

          senderMap.current[row.sender_id] = sender;

          if (msg.sender_id !== user.id) {
            chatService.markRead(conversationId, accessToken).catch(() => {});
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as { id: string; status: string };
          setMessages((prev) =>
            prev.map((m) =>
              m.id === updated.id
                ? { ...m, status: updated.status as MessageWithSender['status'] }
                : m,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // ─── Fallback poll every 30 s for new messages ────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (latestAt.current) catchUpMessages();
    }, 30000);
    return () => clearInterval(interval);
  }, [conversationId]);

  // ─── Tick fallback: poll status every 8 s ─────────────────────────────────
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const { messages: latest } = await chatService.getMessages(conversationId, accessToken);
        setMessages((prev) =>
          prev.map((m) => {
            const updated = latest.find((l) => l.id === m.id);
            return updated && updated.status !== m.status
              ? { ...m, status: updated.status }
              : m;
          }),
        );
      } catch { /* ignore */ }
    }, 8000);
    return () => clearInterval(interval);
  }, [conversationId]);

  // ─── App returns to foreground → catch up ─────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && latestAt.current) catchUpMessages();
    });
    return () => sub.remove();
  }, []);

  // ─── Push notification fallback ───────────────────────────────────────────
  useEffect(() => {
    if (!lastPushed) return;
    if (lastPushed.conversation_id !== conversationId) return;
    if (lastPushed.sender_id === user.id) { clearPushed(); return; }

    setMessages((prev) => {
      if (prev.find((m) => m.id === lastPushed.id)) return prev;
      latestAt.current = lastPushed.created_at;
      return [...prev, lastPushed];
    });
    scrollToBottom();
    chatService.markRead(conversationId, accessToken).catch(() => {});
    clearPushed();
  }, [lastPushed]);

  async function loadMessages() {
    try {
      const { messages: msgs } = await chatService.getMessages(conversationId, accessToken);
      setMessages(msgs);
      if (msgs.length > 0) latestAt.current = msgs[msgs.length - 1].created_at;
      msgs.forEach((m) => { if (m.sender) senderMap.current[m.sender_id] = m.sender; });
      setTimeout(scrollToBottom, 100);
      chatService.markRead(conversationId, accessToken).catch(() => {});
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  async function catchUpMessages() {
    if (!latestAt.current) return;
    try {
      const { messages: newMsgs } = await chatService.getMessages(
        conversationId, accessToken, undefined, latestAt.current,
      );
      if (newMsgs.length === 0) return;
      let hadFresh = false;
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const fresh = newMsgs.filter((m) => !existingIds.has(m.id));
        if (fresh.length === 0) return prev;
        hadFresh = true;
        latestAt.current = fresh[fresh.length - 1].created_at;
        setTimeout(scrollToBottom, 50);
        return [...prev, ...fresh];
      });
      if (hadFresh) {
        chatService.markRead(conversationId, accessToken).catch(() => {});
      }
    } catch { /* ignore */ }
  }

  // ─── Send ─────────────────────────────────────────────────────────────────
  async function handleSend(text: string) {
    if (sending) return;
    setSending(true);

    const optimistic: MessageWithSender = {
      id:              `tmp-${Date.now()}`,
      conversation_id: conversationId,
      sender_id:       user.id,
      content:         text,
      type:            'text',
      media_url:       null,
      status:          'sent',
      created_at:      new Date().toISOString(),
      sender:          { id: user.id, name: user.name, avatar_url: user.avatar_url },
    };

    setMessages((prev) => [...prev, optimistic]);
    scrollToBottom();

    try {
      const { message } = await chatService.sendMessage(conversationId, text, accessToken);
      latestAt.current = message.created_at;
      setMessages((prev) => {
        const rest = prev.filter((m) => m.id !== optimistic.id && m.id !== message.id);
        return [...rest, message];
      });
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  }

  const scrollToBottom = useCallback(() => {
    flatRef.current?.scrollToEnd({ animated: true });
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>

      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.headerIcon} />
        </TouchableOpacity>
        <View style={[s.headerAvatar, { backgroundColor: colors.avatarBg }]}>
          <Text style={s.headerAvatarText}>{title.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={s.headerMid}>
          <Text style={[s.headerTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        </View>
        <TouchableOpacity style={s.headerBtn}>
          <Ionicons name="videocam-outline" size={24} color={colors.headerIcon} />
        </TouchableOpacity>
        <TouchableOpacity style={s.headerBtn}>
          <Ionicons name="call-outline" size={22} color={colors.headerIcon} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : messages.length === 0 ? (
          <View style={s.center}>
            <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.textMuted} />
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>No messages yet{'\n'}Say hello</Text>
          </View>
        ) : (
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={s.messageList}
            renderItem={({ item }) => (
              <MessageBubble
                content={item.content ?? ''}
                isMine={item.sender_id === user.id}
                status={item.status as 'sent' | 'delivered' | 'read'}
                createdAt={item.created_at}
                senderName={item.sender_id !== user.id ? item.sender?.name : undefined}
              />
            )}
            onContentSizeChange={scrollToBottom}
          />
        )}

        <ChatInput onSend={handleSend} disabled={sending} />
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:             { flex: 1 },
  flex:             { flex: 1 },
  header:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
  backBtn:          { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerAvatar:     { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerMid:        { flex: 1 },
  headerTitle:      { fontSize: 16, fontWeight: '800' },
  headerBtn:        { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  messageList:      { paddingVertical: 12 },
  center:           { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText:        { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
