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
import MessageBubble from '../../components/chat/MessageBubble';
import ChatInput from '../../components/chat/ChatInput';
import type { ChatStackParams } from '../../navigation';

type RouteType = RouteProp<ChatStackParams, 'ChatRoom'>;

export default function ChatRoomScreen() {
  const navigation = useNavigation();
  const route      = useRoute<RouteType>();
  const { conversationId, title } = route.params;

  const accessToken    = useAuthStore((s) => s.accessToken)!;
  const user           = useAuthStore((s) => s.user)!;
  const lastPushed     = useMessageStore((s) => s.lastPushedMessage);
  const clearPushed    = useMessageStore((s) => s.clearPushedMessage);

  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);

  const flatRef  = useRef<FlatList>(null);
  const latestAt = useRef<string | null>(null);

  // ─── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    loadMessages();
    chatService.markRead(conversationId, accessToken).catch(() => {});
  }, []);

  // ─── Incoming push message from store → append instantly ──────────────────
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

  // ─── App returns to foreground → catch up on missed messages ──────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && latestAt.current) {
        catchUpMessages();
      }
    });
    return () => sub.remove();
  }, []);

  async function loadMessages() {
    try {
      const { messages: msgs } = await chatService.getMessages(conversationId, accessToken);
      setMessages(msgs);
      if (msgs.length > 0) latestAt.current = msgs[msgs.length - 1].created_at;
      setTimeout(scrollToBottom, 100);
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
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const fresh = newMsgs.filter((m) => !existingIds.has(m.id));
        if (fresh.length === 0) return prev;
        latestAt.current = fresh[fresh.length - 1].created_at;
        setTimeout(scrollToBottom, 50);
        return [...prev, ...fresh];
      });
    } catch { /* ignore */ }
  }

  // ─── Send ──────────────────────────────────────────────────────────────────
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
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? message : m)));
      latestAt.current = message.created_at;
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  }

  const scrollToBottom = useCallback(() => {
    flatRef.current?.scrollToEnd({ animated: true });
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.root} edges={['top']}>

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={s.headerAvatar}>
          <Text style={s.headerAvatarText}>{title.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={s.headerMid}>
          <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
        </View>
        <TouchableOpacity style={s.headerBtn}>
          <Ionicons name="call-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={s.headerBtn}>
          <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color="#00A86B" />
          </View>
        ) : messages.length === 0 ? (
          <View style={s.center}>
            <Ionicons name="chatbubble-ellipses-outline" size={48} color="#4C4C4E" />
            <Text style={s.emptyText}>No messages yet{'\n'}Say hello</Text>
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
  root:             { flex: 1, backgroundColor: '#111111' },
  flex:             { flex: 1 },
  header:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2C2C2E', gap: 8 },
  backBtn:          { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerAvatar:     { width: 38, height: 38, borderRadius: 19, backgroundColor: '#1E3A5F', alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerMid:        { flex: 1 },
  headerTitle:      { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  headerBtn:        { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  messageList:      { paddingVertical: 12 },
  center:           { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText:        { fontSize: 15, color: '#8E8E93', textAlign: 'center', lineHeight: 22 },
});
