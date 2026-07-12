import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  Modal, FlatList, ActivityIndicator, RefreshControl, Image,
  TextInput, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuthStore } from '../../store/authStore';
import { useChatTabStore, type ChatTab } from '../../store/chatTabStore';
import { useTheme } from '../../hooks/useTheme';
import NewChatModal from '../../components/chat/NewChatModal';
import CameraScreen from './CameraScreen';
import ConvoListItem from '../../components/chat/ConvoListItem';
import UpdatesIcon from '../../components/shared/UpdatesIcon';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import type { Id } from '../../../convex/_generated/dataModel';

dayjs.extend(relativeTime);

const WA_GREEN = '#25D366';

const TAB_TITLES: Record<ChatTab, string> = {
  Texts:       'Chats',
  Status:      'Updates',
  Calls:       'Calls',
  Communities: 'Communities',
};

export default function ChatListScreen() {
  const navigation  = useNavigation<any>();
  const sessionId   = useAuthStore((s) => s.sessionId)!;
  const currentUser = useAuthStore((s) => s.user)!;
  const { colors, isDark } = useTheme();

  // Section driven by the WhatsApp-style bottom bar
  const activeTab    = useChatTabStore((s) => s.tab);
  const setActiveTab = useChatTabStore((s) => s.setTab);

  const [newChatOpen, setNewChatOpen] = useState(false);
  const [cameraOpen,  setCameraOpen]  = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);
  const [query,       setQuery]       = useState('');

  // WhatsApp dark mode is true black
  const bg = isDark ? '#000000' : colors.background;

  // ─── Reactive conversations — auto-updates when messages arrive ──────────
  const convos = useQuery(
    api.chat.listConversations,
    sessionId ? { sessionId: sessionId as Id<'sessions'> } : 'skip',
  );

  // ─── Status updates ───────────────────────────────────────────────────────
  const statusData = useQuery(
    api.status.list,
    sessionId ? { sessionId: sessionId as Id<'sessions'> } : 'skip',
  );

  // ─── Message requests ────────────────────────────────────────────────────
  const messageRequests = useQuery(
    api.chat.listMessageRequests,
    sessionId ? { sessionId: sessionId as Id<'sessions'> } : 'skip',
  );

  // ─── Call history ────────────────────────────────────────────────────────
  const callHistory = useQuery(
    api.calls.listCallHistory,
    sessionId ? { sessionId: sessionId as Id<'sessions'> } : 'skip',
  );

  const markAllDeliveredMutation = useMutation(api.chat.markAllDelivered);

  const loading = convos === undefined;

  // Automatically mark all incoming messages as delivered when conversations or requests update
  useEffect(() => {
    if (!sessionId) return;

    // Check if there are any incoming messages from others still in 'sent' state
    const hasSentIncoming =
      (convos || []).some(c => c != null && c.last_message && c.last_message.sender_id !== currentUser.id && (c.last_message as any).status === 'sent') ||
      (messageRequests || []).some(r => r != null && r.last_message != null);

    if (hasSentIncoming) {
      markAllDeliveredMutation({ sessionId: sessionId as Id<'sessions'> }).catch(() => {});
    }
  }, [convos, messageRequests, sessionId]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // useQuery auto-refreshes; just give UI feedback
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  function openConversation(convo: any) {
    const title     = convo.type === 'group' ? (convo.name ?? 'Group') : (convo.other_user?.name ?? 'Chat');
    const avatarUrl = convo.type === 'direct' ? (convo.other_user?.avatar_url ?? null) : null;
    const userId    = convo.type === 'direct' ? (convo.other_user?.id ?? null) : null;
    navigation.navigate('ChatRoom', { conversationId: convo.id, title, avatarUrl, userId });
  }

  function renderStatusTab() {
    const own      = statusData?.own      ?? [];
    const contacts = statusData?.contacts ?? [];

    return (
      <FlatList
        data={contacts}
        keyExtractor={(c) => c.userId}
        contentContainerStyle={s.listContent}
        ListHeaderComponent={() => (
          <View>
            {/* ── My Status ── */}
            <View style={[st.statusRow, { borderBottomColor: colors.border }]}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  if (own.length > 0) {
                    navigation.navigate('StatusViewer', {
                      userId:    currentUser.id,
                      name:      'My Status',
                      avatarUrl: null,
                    });
                  } else {
                    navigation.navigate('StatusCreator');
                  }
                }}
                style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 14 }}
              >
                <View style={st.ringWrap}>
                  {/* Own status avatar — no notification ring, show real profile pic */}
                  {currentUser.avatar_url ? (
                    <Image source={{ uri: currentUser.avatar_url }} style={st.avatarImg} />
                  ) : (
                    <View style={[st.avatarInner, { backgroundColor: colors.surface }]}>
                      <Text style={[st.avatarLetter, { color: colors.text }]}>
                        {currentUser.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  {own.length === 0 && (
                    <View style={[st.addDot, { backgroundColor: colors.accent }]}>
                      <Ionicons name="add" size={10} color="#fff" />
                    </View>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[st.contactName, { color: colors.text }]}>My Status</Text>
                  <Text style={[st.contactSub, { color: colors.textSecondary }]}>
                    {own.length > 0
                      ? `${own.length} update${own.length > 1 ? 's' : ''} · ${dayjs(own[0].createdAt).fromNow()}`
                      : 'Tap to add a status update'}
                  </Text>
                </View>
              </TouchableOpacity>
              {/* Camera + Pen grouped tight together */}
              <View style={st.iconGroup}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('StatusCreator', { initialMode: 'media' })}
                  style={st.cameraBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="camera-outline" size={22} color={colors.accent} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => navigation.navigate('StatusCreator', { initialMode: 'text' })}
                  style={st.cameraBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil-outline" size={22} color={colors.accent} />
                </TouchableOpacity>
              </View>
            </View>

            {contacts.length > 0 && (
              <Text style={[st.sectionLabel, { color: colors.textSecondary, borderBottomColor: colors.border }]}>
                Recent updates
              </Text>
            )}
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[st.statusRow, { borderBottomColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('StatusViewer', {
              userId:    item.userId,
              name:      item.name,
              avatarUrl: item.avatarUrl ?? null,
            })}
          >
            <View style={st.ringWrap}>
              <View style={[st.ring, item.hasUnseen ? st.ringUnseen : st.ringSeen, { borderColor: item.hasUnseen ? '#25D366' : colors.textMuted }]}>
                {item.avatarUrl ? (
                  <Image source={{ uri: item.avatarUrl }} style={st.avatarImg} />
                ) : (
                  <View style={[st.avatarInner, { backgroundColor: colors.surface }]}>
                    <Text style={[st.avatarLetter, { color: colors.text }]}>{item.name.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[st.contactName, { color: colors.text }]}>{item.name}</Text>
              <Text style={[st.contactSub, { color: colors.textSecondary }]}>
                {dayjs(item.latestAt).fromNow()}
                {item.count > 1 ? ` · ${item.count} updates` : ''}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View style={[s.empty, { justifyContent: 'flex-start', paddingTop: 160 }]}>
            <UpdatesIcon color={colors.textMuted} size={28} />
            <Text style={[s.emptyTitle, { color: colors.textMuted, fontSize: 13, fontWeight: '600', marginTop: 6 }]}>
              No updates yet
            </Text>
          </View>
        )}
      />
    );
  }

  function renderTextsTab() {
    if (loading) {
      return (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      );
    }
    const statusMap = new Map(
      (statusData?.contacts ?? []).map((c) => [c.userId, c]),
    );

    const hasRequests = messageRequests && messageRequests.length > 0;

    const needle = query.trim().toLowerCase();
    const visibleConvos = (convos ?? [])
      .filter((c): c is NonNullable<typeof c> => c != null)
      .filter((c) => {
        if (!needle) return true;
        const name = c.type === 'group' ? (c.name ?? 'Group') : (c.other_user?.name ?? '');
        const last = c.last_message?.content ?? '';
        return name.toLowerCase().includes(needle) || last.toLowerCase().includes(needle);
      });

    return (
      <FlatList
        data={visibleConvos}
        keyExtractor={(c) => c.id}
        contentContainerStyle={s.listContent}
        ListHeaderComponent={hasRequests && !needle ? () => (
          // WhatsApp "Archived"-style row → Connex message requests
          <TouchableOpacity
            style={s.requestRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('MessageRequests')}
          >
            <View style={s.requestIconWrap}>
              <Ionicons name="archive-outline" size={22} color={colors.textSecondary} />
            </View>
            <View style={[s.requestBody, { borderBottomColor: colors.separator }]}>
              <Text style={[s.requestText, { color: colors.text }]}>Requests</Text>
              <Text style={[s.requestCount, { color: colors.textSecondary }]}>
                {messageRequests.length}
              </Text>
            </View>
          </TouchableOpacity>
        ) : null}
        renderItem={({ item }) => {
          const otherUserId     = item.type === 'direct' ? (item.other_user?.id ?? null) : null;
          const contactStatus   = otherUserId ? statusMap.get(otherUserId) : undefined;
          return (
            <ConvoListItem
              name={item.type === 'group' ? (item.name ?? 'Group') : (item.other_user?.name ?? 'Chat')}
              avatarLetter={
                item.type === 'group'
                  ? (item.name?.[0] ?? 'G')
                  : (item.other_user?.name?.[0] ?? '?')
              }
              avatarUrl={item.type === 'direct' ? item.other_user?.avatar_url : null}
              lastMessage={item.last_message?.content ?? null}
              lastMessageDeleted={
                item.last_message !== null &&
                item.last_message?.content === null &&
                item.last_message?.type === 'text'
              }
              lastTime={item.last_message?.created_at ?? item.created_at}
              lastMessageStatus={(item.last_message as any)?.status ?? null}
              lastMessageIsMine={item.last_message?.sender_id === currentUser.id}
              unreadCount={item.unread_count}
              isGroup={item.type === 'group'}
              lastMessageType={item.last_message?.type as any}
              onPress={() => openConversation(item)}
              hasStatus={!!contactStatus}
              hasUnseenStatus={contactStatus?.hasUnseen ?? false}
              onAvatarPress={contactStatus && otherUserId ? () => navigation.navigate('StatusViewer', {
                userId:    otherUserId,
                name:      item.other_user?.name ?? 'Chat',
                avatarUrl: item.other_user?.avatar_url ?? null,
              }) : undefined}
            />
          );
        }}
        ListEmptyComponent={() => (
          <View style={[s.empty, { justifyContent: 'flex-start', paddingTop: 160 }]}>
            <Ionicons
              name={needle ? 'search-outline' : 'chatbubble-ellipses-outline'}
              size={28}
              color={colors.textMuted}
            />
            <Text style={[s.emptyTitle, { color: colors.textMuted, fontSize: 13, fontWeight: '600', marginTop: 6 }]}>
              {needle ? 'No chats found' : 'No messages yet'}
            </Text>
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
        }
      />
    );
  }

  function formatCallDuration(startedAt: number, endedAt: number | null) {
    if (!endedAt || endedAt <= startedAt) return null;
    const totalSeconds = Math.max(1, Math.round((endedAt - startedAt) / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  }

  function getCallSummary(item: NonNullable<typeof callHistory>[number]) {
    if (item.status === 'missed') {
      return item.isOutgoing ? 'Unanswered call' : 'Missed call';
    }
    if (item.status === 'ringing') return item.isOutgoing ? 'Outgoing call ringing' : 'Incoming call ringing';
    if (item.status === 'active') return 'Ongoing call';

    const duration = formatCallDuration(item.startedAt, item.endedAt);
    const direction = item.isOutgoing ? 'Outgoing' : 'Incoming';
    const medium = item.type === 'video' ? 'video call' : 'voice call';
    return duration ? `${direction} ${medium} · ${duration}` : `${direction} ${medium}`;
  }

  function openCallConversation(item: NonNullable<typeof callHistory>[number]) {
    navigation.navigate('ChatRoom', {
      conversationId: item.conversationId,
      title: item.otherUserName,
      avatarUrl: item.otherUserAvatarUrl ?? null,
      userId: item.otherUserId,
    });
  }

  function renderCallsTab() {
    if (callHistory === undefined) {
      return (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      );
    }

    return (
      <FlatList
        data={callHistory}
        keyExtractor={(item) => item.callId}
        contentContainerStyle={s.listContent}
        renderItem={({ item }) => {
          const missed = item.status === 'missed' && !item.isOutgoing;
          const iconColor = missed ? '#E53E3E' : colors.accent;
          const timeLabel = dayjs(item.startedAt).isSame(dayjs(), 'day')
            ? dayjs(item.startedAt).format('HH:mm')
            : dayjs(item.startedAt).fromNow();

          return (
            <TouchableOpacity
              style={[s.callRow, { borderBottomColor: colors.border }]}
              activeOpacity={0.75}
              onPress={() => openCallConversation(item)}
            >
              <View style={[s.callAvatar, { backgroundColor: colors.avatarBg }]}>
                {item.otherUserAvatarUrl ? (
                  <Image source={{ uri: item.otherUserAvatarUrl }} style={s.callAvatarImg} />
                ) : (
                  <Text style={s.callAvatarLetter}>
                    {item.otherUserName.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>

              <View style={s.callMain}>
                <Text
                  style={[s.callName, { color: missed ? '#E53E3E' : colors.text }]}
                  numberOfLines={1}
                >
                  {item.otherUserName}
                </Text>
                <View style={s.callMetaRow}>
                  <Ionicons
                    name={item.isOutgoing ? 'arrow-up-outline' : 'arrow-down-outline'}
                    size={13}
                    color={iconColor}
                  />
                  <Text style={[s.callSub, { color: missed ? '#E53E3E' : colors.textSecondary }]} numberOfLines={1}>
                    {getCallSummary(item)}
                  </Text>
                </View>
              </View>

              <View style={s.callRight}>
                <Text style={[s.callTime, { color: colors.textMuted }]}>{timeLabel}</Text>
                <Ionicons
                  name={item.type === 'video' ? 'videocam-outline' : 'call-outline'}
                  size={21}
                  color={colors.accent}
                />
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={() => (
          <View style={[s.empty, { justifyContent: 'flex-start', paddingTop: 160 }]}>
            <Ionicons name="call-outline" size={28} color={colors.textMuted} />
            <Text style={[s.emptyTitle, { color: colors.textMuted, fontSize: 13, fontWeight: '600', marginTop: 6 }]}>
              No recent calls
            </Text>
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
        }
      />
    );
  }

  function openMoreMenu() {
    Alert.alert('Connex', undefined, [
      { text: 'New group',    onPress: () => navigation.navigate('NewGroup') },
      { text: 'SOS contacts', onPress: () => navigation.navigate('SOSContacts') },
      { text: 'Profile',      onPress: () => navigation.navigate('Profile') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <SafeAreaView style={[s.root, { backgroundColor: bg }]} edges={['top']}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={bg} />

      {/* Top action row — WhatsApp style: ⋯ left, camera + green ＋ right */}
      <View style={s.topRow}>
        <TouchableOpacity
          style={[s.circleBtn, { backgroundColor: colors.surface }]}
          onPress={openMoreMenu}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="More options"
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.headerIcon} />
        </TouchableOpacity>

        <View style={s.topRowRight}>
          <TouchableOpacity
            style={[s.circleBtn, { backgroundColor: colors.surface }]}
            onPress={() => setCameraOpen(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Open camera"
          >
            <Ionicons name="camera-outline" size={21} color={colors.headerIcon} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.circleBtn, { backgroundColor: WA_GREEN }]}
            onPress={() => setNewChatOpen(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="New chat"
          >
            <Ionicons name="add" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Big title — follows the active section like WhatsApp */}
      <Text style={[s.bigTitle, { color: colors.text }]}>{TAB_TITLES[activeTab]}</Text>

      {/* Search pill */}
      {activeTab === 'Texts' && (
        <View style={[s.searchPill, { backgroundColor: colors.surface }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[s.searchInput, { color: colors.text }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery('')}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={s.content}>
        {activeTab === 'Texts' && renderTextsTab()}
        {activeTab === 'Status' && renderStatusTab()}
        {activeTab === 'Calls' && renderCallsTab()}
        {activeTab === 'Communities' && (
          <View style={[s.empty, { justifyContent: 'flex-start', paddingTop: 160 }]}>
            <Ionicons name="people-circle-outline" size={28} color={colors.textMuted} />
            <Text style={[s.emptyTitle, { color: colors.textMuted, fontSize: 13, fontWeight: '600', marginTop: 6 }]}>
              No communities yet
            </Text>
          </View>
        )}
      </View>

      <NewChatModal
        visible={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onConversationCreated={(convoId, title) => {
          setNewChatOpen(false);
          navigation.navigate('ChatRoom', { conversationId: convoId, title });
        }}
      />

      <Modal visible={cameraOpen} animationType="slide" statusBarTranslucent>
        <CameraScreen
          onClose={() => setCameraOpen(false)}
          onCapture={() => {
            setCameraOpen(false);
            setActiveTab('Status');
          }}
        />
      </Modal>
    </SafeAreaView>
  );
}

const RING = 52;
const AVATAR = 44;

const st = StyleSheet.create({
  statusRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 14 },
  sectionLabel: { fontSize: 13, fontWeight: '600', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  ringWrap:     { position: 'relative', width: RING, height: RING },
  ring:         { width: RING, height: RING, borderRadius: RING / 2, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  ringActive:   {},
  ringAdd:      { borderStyle: 'dashed' },
  ringUnseen:   {},
  ringSeen:     { opacity: 0.5 },
  avatarInner:  { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, alignItems: 'center', justifyContent: 'center' },
  avatarImg:    { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2 },
  avatarLetter: { fontSize: 18, fontWeight: '700' },
  addDot:       { position: 'absolute', bottom: 0, right: 0, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  contactName:  { fontSize: 15, fontWeight: '600' },
  contactSub:   { fontSize: 13, marginTop: 2 },
  iconGroup:    { flexDirection: 'row', alignItems: 'center', gap: 0 },
  cameraBtn:    { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});

const s = StyleSheet.create({
  root:        { flex: 1 },
  topRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 },
  topRowRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  circleBtn:   { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  bigTitle:    { fontSize: 33, fontWeight: '800', letterSpacing: -0.5, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 22,
    paddingHorizontal: 14,
    minHeight: 42,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 9 },
  content:     { flex: 1, marginTop: 6 },
  listContent: { paddingBottom: 130 },
  separator:   { height: StyleSheet.hairlineWidth },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  emptyIconWrap: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle:  { fontSize: 17, fontWeight: '800' },
  emptyText:   { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
  },
  requestIconWrap: {
    width: 58,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  requestBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingRight: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  requestText:  { fontSize: 16, fontWeight: '600' },
  requestCount: { fontSize: 14 },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  callAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  callAvatarImg: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  callAvatarLetter: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  callMain: {
    flex: 1,
    minWidth: 0,
  },
  callName: {
    fontSize: 15,
    fontWeight: '700',
  },
  callMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  callSub: {
    flex: 1,
    fontSize: 13,
  },
  callRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  callTime: {
    fontSize: 12,
  },
});
