import React, { useRef, useCallback, useEffect } from 'react';
import {
  View, FlatList, StyleSheet, KeyboardAvoidingView,
  Platform, Text, TouchableOpacity, ActivityIndicator,
  Alert, ActionSheetIOS, Image,
} from 'react-native';
import dayjs from 'dayjs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import MessageBubble from '../../components/chat/MessageBubble';
import ChatInput from '../../components/chat/ChatInput';
import type { ChatStackParams } from '../../navigation';

type RouteType = RouteProp<ChatStackParams, 'ChatRoom'>;

type ListItem =
  | { type: 'message';   data: any }
  | { type: 'separator'; label: string };

function getDateLabel(iso: string): string {
  const d     = dayjs(iso);
  const today = dayjs().startOf('day');
  if (d.isAfter(today))                        return 'Today';
  if (d.isAfter(today.subtract(1, 'day')))     return 'Yesterday';
  if (d.isAfter(today.subtract(7, 'day')))     return d.format('dddd');
  return d.format('D MMM YYYY');
}

function buildListItems(msgs: any[]): ListItem[] {
  const items: ListItem[] = [];
  let lastDate = '';
  for (const msg of msgs) {
    const date = dayjs(msg.created_at).format('YYYY-MM-DD');
    if (date !== lastDate) {
      items.push({ type: 'separator', label: getDateLabel(msg.created_at) });
      lastDate = date;
    }
    items.push({ type: 'message', data: msg });
  }
  return items;
}

function formatLastSeen(ts: number): string {
  const d = dayjs(ts);
  const today = dayjs().startOf('day');
  if (d.isAfter(today)) return `today at ${d.format('HH:mm')}`;
  if (d.isAfter(today.subtract(1, 'day'))) return `yesterday at ${d.format('HH:mm')}`;
  if (d.isAfter(today.subtract(7, 'day'))) return d.format('ddd [at] HH:mm');
  return d.format('DD/MM/YY');
}

// Predefined set of premium vibrant avatar colors based on name hashing
function getAvatarColor(name: string): string {
  const code = name.charCodeAt(0) || 0;
  const colors = [
    '#FF6B6B', // Coral Red
    '#4D96FF', // Royal Blue
    '#6BCB77', // Emerald Green
    '#FFD93D', // Amber Yellow
    '#9B5DE5', // Amethyst Purple
    '#F15BB5', // Hot Pink
    '#00F5D4', // Turquoise
  ];
  return colors[code % colors.length];
}

export default function ChatRoomScreen() {
  const navigation = useNavigation();
  const route      = useRoute<RouteType>();
  const { conversationId, title, avatarUrl, userId } = route.params;
  const { colors, fonts } = useTheme();

  const sessionId  = useAuthStore((s) => s.sessionId)!;
  const user       = useAuthStore((s) => s.user)!;

  const flatRef = useRef<FlatList>(null);

// ─── Reactive data — auto-updates instantly when anything changes ──────────
  const messages = useQuery(
    api.chat.listMessages,
    sessionId ? { sessionId: sessionId as Id<'sessions'>, conversationId: conversationId as Id<'conversations'> } : 'skip',
  );

  const presence = useQuery(
    api.chat.getOtherUserPresence,
    sessionId ? { sessionId: sessionId as Id<'sessions'>, conversationId: conversationId as Id<'conversations'> } : 'skip',
  );

  const conversation = useQuery(
    api.chat.getConversation,
    sessionId ? { sessionId: sessionId as Id<'sessions'>, conversationId: conversationId as Id<'conversations'> } : 'skip',
  );

  const sendMessageMutation      = useMutation(api.chat.sendMessage);
  const deleteMessageMutation    = useMutation(api.chat.deleteMessage);
  const markReadMutation         = useMutation(api.chat.markRead);
  const initiateCallMutation     = useMutation(api.calls.initiateCall);
  const generateUploadUrl        = useMutation(api.chat.generateUploadUrl);
  const getMediaUrl              = useMutation(api.chat.getMediaUrl);
  const acceptConversationMut    = useMutation(api.chat.acceptConversation);
  const declineConversationMut   = useMutation(api.chat.declineConversation);

  // ─── Mark read when screen opens / messages load ──────────────────────────
  useEffect(() => {
    if (messages && messages.length > 0) {
      markReadMutation({
        sessionId:      sessionId as Id<'sessions'>,
        conversationId: conversationId as Id<'conversations'>,
      }).catch(() => {});
    }
  }, [messages?.length]);

  // ─── Scroll to bottom on new messages ────────────────────────────────────
  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(scrollToBottom, 50);
    }
  }, [messages?.length]);

  const scrollToBottom = useCallback(() => {
    flatRef.current?.scrollToEnd({ animated: true });
  }, []);

  // ─── Send text ────────────────────────────────────────────────────────────
  async function handleSend(text: string) {
    try {
      await sendMessageMutation({
        sessionId:      sessionId as Id<'sessions'>,
        conversationId: conversationId as Id<'conversations'>,
        content:        text,
      });
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to send message.');
    }
  }

  // ─── Send media (image / video) ───────────────────────────────────────────
  async function handleSendMedia(uri: string, type: 'image' | 'video') {
    try {
      // If already a remote URL (e.g. Giphy sticker), send directly
      if (uri.startsWith('http')) {
        await sendMessageMutation({
          sessionId:      sessionId as Id<'sessions'>,
          conversationId: conversationId as Id<'conversations'>,
          content:        '',
          type,
          mediaUrl:       uri,
        } as any);
        return;
      }

      // Upload local file to Convex storage
      const uploadUrl = await generateUploadUrl({ sessionId: sessionId as Id<'sessions'> });
      const response  = await fetch(uri);
      const blob      = await response.blob();
      const mimeType  = blob.type || (type === 'video' ? 'video/mp4' : 'image/jpeg');

      const uploadRes = await fetch(uploadUrl, {
        method:  'POST',
        headers: { 'Content-Type': mimeType },
        body:    blob,
      });
      if (!uploadRes.ok) throw new Error('Upload failed');
      const { storageId } = await uploadRes.json();

      const mediaUrl = await getMediaUrl({
        sessionId: sessionId as Id<'sessions'>,
        storageId,
      });
      if (!mediaUrl) throw new Error('Could not get media URL');

      await sendMessageMutation({
        sessionId:      sessionId as Id<'sessions'>,
        conversationId: conversationId as Id<'conversations'>,
        content:        '',
        type,
        mediaUrl,
      } as any);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to send media.');
    }
  }

  // ─── Delete ───────────────────────────────────────────────────────────────
  function handleLongPress(msg: any) {
    if (msg.sender_id !== user.id) return;

    const options   = ['Delete for me', 'Delete for everyone', 'Cancel'];
    const cancelIdx = 2;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIdx, destructiveButtonIndex: 0 },
        (idx) => { if (idx !== cancelIdx) doDelete(msg, idx === 1); },
      );
    } else {
      Alert.alert('Delete message', undefined, [
        { text: 'Delete for me',       style: 'destructive', onPress: () => doDelete(msg, false) },
        { text: 'Delete for everyone', style: 'destructive', onPress: () => doDelete(msg, true)  },
        { text: 'Cancel',              style: 'cancel' },
      ]);
    }
  }

  async function doDelete(msg: any, forEveryone: boolean) {
    try {
      await deleteMessageMutation({
        sessionId:         sessionId as Id<'sessions'>,
        messageId:         msg.id    as Id<'messages'>,
        deleteForEveryone: forEveryone,
      });
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to delete message.');
    }
  }

  // ─── Call ─────────────────────────────────────────────────────────────────
  async function handleCall(callType: 'voice' | 'video') {
    if (!userId) return; // group chats — no calls yet
    try {
      const { callId, channelName } = await initiateCallMutation({
        sessionId:      sessionId as Id<'sessions'>,
        conversationId: conversationId as Id<'conversations'>,
        calleeId:       userId        as Id<'users'>,
        callType,
      });
      (navigation as any).navigate('Call', {
        callId,
        channelName,
        callType,
        otherUserName:     title,
        otherUserAvatarUrl: avatarUrl ?? null,
        isOutgoing:        true,
        conversationId,
      });
    } catch (err: any) {
      Alert.alert('Call failed', err.message ?? 'Could not start the call.');
    }
  }

  // ─── Accept / Decline Requests ─────────────────────────────────────────────
  async function handleAccept() {
    try {
      await acceptConversationMut({
        sessionId:      sessionId as Id<'sessions'>,
        conversationId: conversationId as Id<'conversations'>,
      });
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to accept message request.');
    }
  }

  async function handleDecline() {
    Alert.alert(
      'Decline Request',
      'Are you sure you want to decline this request? This will permanently delete the conversation.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline', style: 'destructive',
          onPress: async () => {
            try {
              await declineConversationMut({
                sessionId:      sessionId as Id<'sessions'>,
                conversationId: conversationId as Id<'conversations'>,
              });
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'Failed to decline request.');
            }
          }
        }
      ]
    );
  }

  async function handleBlock() {
    Alert.alert(
      'Block ' + title,
      'Are you sure you want to block this user? They will not be able to find you or message you.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block', style: 'destructive',
          onPress: async () => {
            try {
              // Decline and delete conversation (acts as block for now)
              await declineConversationMut({
                sessionId:      sessionId as Id<'sessions'>,
                conversationId: conversationId as Id<'conversations'>,
              });
              navigation.goBack();
              Alert.alert('Blocked', 'You have blocked ' + title);
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'Failed to block user.');
            }
          }
        }
      ]
    );
  }

  function renderRequestHeader() {
    const name = title ?? 'Unknown User';
    const initials = name.charAt(0).toUpperCase();
    const avatarBg = getAvatarColor(name);

    return (
      <View style={s.requestHeaderContainer}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={s.requestHeaderAvatar} />
        ) : (
          <View style={[s.requestHeaderAvatar, { backgroundColor: avatarBg }]}>
            <Text style={s.requestHeaderAvatarText}>{initials}</Text>
          </View>
        )}
        <Text style={[s.requestHeaderName, { color: colors.text }]}>{name}</Text>
        {userId && (
          <Text style={[s.requestHeaderSub, { color: colors.textSecondary }]}>Connex Member</Text>
        )}
        <View style={[s.requestHeaderCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.accent} style={{ marginBottom: 4 }} />
          <Text style={[s.requestHeaderCardText, { color: colors.textSecondary }]}>
            This request is from someone not in your contacts. They won't know you've read their messages until you accept.
          </Text>
        </View>
      </View>
    );
  }

  const loading = messages === undefined;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>

      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.headerIcon} />
        </TouchableOpacity>
        <TouchableOpacity
          style={s.headerProfile}
          onPress={() => (navigation as any).navigate(
            conversation?.type === 'group' ? 'GroupInfo' : 'ContactInfo',
            conversation?.type === 'group'
              ? { conversationId, title }
              : { title, avatarUrl, userId },
          )}
          activeOpacity={0.75}
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={s.headerAvatar} />
          ) : (
            <View style={[s.headerAvatar, { backgroundColor: colors.avatarBg }]}>
              <Text style={s.headerAvatarText}>{title.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={s.headerTitleWrap}>
            <Text style={[s.headerTitle, { color: colors.text, fontSize: fonts.body }]} numberOfLines={1}>{title}</Text>
            {presence?.isOnline ? (
              <Text style={[s.headerStatus, { color: colors.accent, fontSize: fonts.xs }]}>Online</Text>
            ) : presence?.lastSeen ? (
              <Text style={[s.headerStatus, { color: colors.textMuted, fontSize: fonts.xs }]}>
                Last seen {formatLastSeen(presence.lastSeen)}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
        {!!userId && (
          <>
            <TouchableOpacity style={s.headerBtn} onPress={() => handleCall('video')}>
              <Ionicons name="videocam-outline" size={24} color={colors.headerIcon} />
            </TouchableOpacity>
            <TouchableOpacity style={s.headerBtn} onPress={() => handleCall('voice')}>
              <Ionicons name="call-outline" size={22} color={colors.headerIcon} />
            </TouchableOpacity>
          </>
        )}
      </View>

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : messages!.length === 0 ? (
          <View style={s.center}>
            <Ionicons name="chatbubble-ellipses-outline" size={28} color={colors.textMuted} />
            <Text style={[s.emptyText, { color: colors.textMuted, fontSize: 13, marginTop: 4 }]}>No messages yet</Text>
          </View>
        ) : (
          <FlatList
            ref={flatRef}
            data={buildListItems(messages!)}
            keyExtractor={(item, i) => item.type === 'separator' ? `sep-${i}` : item.data.id}
            ListHeaderComponent={conversation?.status === 'pending' && conversation?.created_by !== user.id ? renderRequestHeader : null}
            contentContainerStyle={s.messageList}
            renderItem={({ item }) => {
              if (item.type === 'separator') {
                return (
                  <View style={s.dateSep}>
                    <Text style={[s.dateSepText, { color: colors.textMuted, backgroundColor: colors.surface }]}>
                      {item.label}
                    </Text>
                  </View>
                );
              }
              const msg = item.data;
              return (
                <MessageBubble
                  content={msg.content}
                  isMine={msg.sender_id === user.id}
                  isDeleted={!!msg.deleted_at}
                  status={msg.status as 'sent' | 'delivered' | 'read'}
                  createdAt={msg.created_at}
                  senderName={msg.sender_id !== user.id ? msg.sender?.name : undefined}
                  senderBubbleColor={msg.sender?.bubble_color ?? null}
                  onLongPress={() => handleLongPress(msg)}
                  mediaUrl={msg.media_url ?? null}
                  msgType={msg.type ?? null}
                />
              );
            }}
            onContentSizeChange={scrollToBottom}
          />
        )}

        {conversation?.status === 'pending' && conversation?.created_by !== user.id ? (
          <View style={[s.requestBanner, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <Text style={[s.requestSubtext, { color: colors.textSecondary, fontSize: fonts.xs }]}>
              If you accept, they will be able to message and call you, and see details like your active status and when you've read messages.
            </Text>
            <View style={s.requestButtonsHorizontal}>
              <TouchableOpacity
                style={[s.btnMuted, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={handleBlock}
                activeOpacity={0.7}
              >
                <Text style={[s.btnMutedText, { color: colors.textSecondary, fontSize: fonts.sm }]}>Block</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.btnMuted, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={handleDecline}
                activeOpacity={0.7}
              >
                <Text style={[s.btnMutedText, { color: '#FF4D4D', fontSize: fonts.sm }]}>Delete</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.btnAcceptFilled, { backgroundColor: colors.accent }]}
                onPress={handleAccept}
                activeOpacity={0.7}
              >
                <Text style={[s.btnAcceptFilledText, { fontSize: fonts.sm }]}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <ChatInput onSend={handleSend} onSendMedia={handleSendMedia} />
        )}
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1 },
  flex:          { flex: 1 },
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
  backBtn:       { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerAvatar:  { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerProfile:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitleWrap:  { flex: 1, justifyContent: 'center' },
  headerTitle:      { fontSize: 16, fontWeight: '800' },
  headerStatus:     { fontSize: 12, fontWeight: '500', marginTop: 1 },
  headerBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  messageList:   { paddingVertical: 12 },
  dateSep:       { alignItems: 'center', marginVertical: 8 },
  dateSepText:   { fontSize: 12, fontWeight: '600', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText:     { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  requestBanner: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderTopWidth: 1,
    alignItems: 'stretch',
    gap: 12,
  },
  requestText: {
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  requestSubtext: {
    textAlign: 'center',
    lineHeight: 16,
    fontWeight: '500',
    marginHorizontal: 8,
  },
  requestButtonsHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  btnMuted: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnMutedText: {
    fontWeight: '600',
  },
  btnAcceptFilled: {
    flex: 1.2,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnAcceptFilledText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  requestHeaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  requestHeaderAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  requestHeaderAvatarText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '800',
  },
  requestHeaderName: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 12,
    letterSpacing: -0.3,
  },
  requestHeaderSub: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  requestHeaderCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  requestHeaderCardText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    fontWeight: '500',
  },
  btnDecline: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDeclineText: {
    fontWeight: '700',
  },
  btnAccept: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnAcceptText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderTopWidth: 1,
    gap: 8,
  },
  pendingText: {
    fontWeight: '600',
  },
});
