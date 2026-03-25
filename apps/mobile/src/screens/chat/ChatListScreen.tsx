import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  Modal, FlatList, ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Path } from 'react-native-svg';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import NewChatModal from '../../components/chat/NewChatModal';
import CameraScreen from './CameraScreen';
import ConvoListItem from '../../components/chat/ConvoListItem';
import StatusIcon from '../../components/shared/StatusIcon';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import type { Id } from '../../../convex/_generated/dataModel';

dayjs.extend(relativeTime);

function CommunitiesIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx="5"  cy="8"  r="2.8" stroke={color} strokeWidth={1.8} />
      <Path d="M1 19.5c0-2 1.8-3.5 4-3.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx="19" cy="8"  r="2.8" stroke={color} strokeWidth={1.8} />
      <Path d="M23 19.5c0-2-1.8-3.5-4-3.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx="12" cy="7"  r="3.2" stroke={color} strokeWidth={1.8} />
      <Path d="M6 21c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

type Tab = 'Texts' | 'Status' | 'Calls' | 'Communities';
const TABS: Tab[] = ['Texts', 'Status', 'Calls', 'Communities'];
const TAB_ICONS: Record<Exclude<Tab, 'Status' | 'Communities'>, { active: string; inactive: string }> = {
  Texts: { active: 'chatbubbles', inactive: 'chatbubbles-outline' },
  Calls: { active: 'call',        inactive: 'call-outline' },
};

export default function ChatListScreen() {
  const navigation  = useNavigation<any>();
  const sessionId   = useAuthStore((s) => s.sessionId)!;
  const currentUser = useAuthStore((s) => s.user)!;
  const { colors }  = useTheme();

  const [activeTab,   setActiveTab]   = useState<Tab>('Texts');
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [cameraOpen,  setCameraOpen]  = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);

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

  const loading = convos === undefined;

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
          <View style={[s.empty, { justifyContent: 'flex-start', paddingTop: 100 }]}>
            <View style={[s.emptyIconWrap, { backgroundColor: colors.surface }]}>
              <StatusIcon color={colors.textMuted} size={44} />
            </View>
            <Text style={[s.emptyTitle, { color: colors.text }]}>No updates yet</Text>
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>
              Status updates from your contacts will appear here
            </Text>
          </View>
        )}
      />
    );
  }

  const hasUnseenStatuses = statusData?.contacts.some((c) => c.hasUnseen) ?? false;

  function renderTabIcon(tab: Tab, active: boolean) {
    const color = active ? colors.text : colors.textMuted;
    if (tab === 'Communities') return <CommunitiesIcon color={color} />;
    if (tab === 'Status') return <StatusIcon color={color} showDot={hasUnseenStatuses} />;
    const icon = TAB_ICONS[tab as keyof typeof TAB_ICONS][active ? 'active' : 'inactive'];
    return <Ionicons name={icon as any} size={24} color={color} />;
  }

  function renderTextsTab() {
    if (loading) {
      return (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      );
    }
    if (!convos || convos.length === 0) {
      return (
        <View style={s.empty}>
          <View style={[s.emptyIconWrap, { backgroundColor: colors.surface }]}>
            <Ionicons name="chatbubble-ellipses-outline" size={44} color={colors.textMuted} />
          </View>
          <Text style={[s.emptyTitle, { color: colors.text }]}>No messages yet</Text>
          <Text style={[s.emptyText, { color: colors.textSecondary }]}>Start a conversation by tapping the compose button</Text>
        </View>
      );
    }
    const statusMap = new Map(
      (statusData?.contacts ?? []).map((c) => [c.userId, c]),
    );

    return (
      <FlatList
        data={convos}
        keyExtractor={(c) => c.id}
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
        }
      />
    );
  }

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />

      <View style={s.header}>
        <Text style={[s.headerTitle, { color: colors.text }]}>Chats</Text>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.iconBtn} onPress={() => setCameraOpen(true)}>
            <Ionicons name="camera-outline" size={24} color={colors.headerIcon} />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn}>
            <Ionicons name="search-outline" size={24} color={colors.headerIcon} />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={() => setNewChatOpen(true)}>
            <Ionicons name="add-circle-outline" size={26} color={colors.headerIcon} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[s.tabBar, { borderBottomColor: colors.border }]}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={s.tabItem}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            {renderTabIcon(tab, activeTab === tab)}
            {activeTab === tab && <View style={[s.tabIndicator, { backgroundColor: colors.text }]} />}
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.content}>
        {activeTab === 'Texts' && renderTextsTab()}
        {activeTab === 'Status' && renderStatusTab()}
        {activeTab === 'Calls' && (
          <View style={s.empty}>
            <View style={[s.emptyIconWrap, { backgroundColor: colors.surface }]}>
              <Ionicons name="call-outline" size={44} color={colors.textMuted} />
            </View>
            <Text style={[s.emptyTitle, { color: colors.text }]}>No recent calls</Text>
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>Your call history will appear here</Text>
          </View>
        )}
        {activeTab === 'Communities' && (
          <View style={s.empty}>
            <View style={[s.emptyIconWrap, { backgroundColor: colors.surface }]}>
              <Ionicons name="people-circle-outline" size={44} color={colors.textMuted} />
            </View>
            <Text style={[s.emptyTitle, { color: colors.text }]}>No communities yet</Text>
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>Join or create a community to connect with groups</Text>
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
  root:          { flex: 1 },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  headerTitle:   { fontSize: 26, fontWeight: '900', letterSpacing: -0.8 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn:       { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  tabBar:        { flexDirection: 'row', borderBottomWidth: 1 },
  tabItem:       { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabIndicator:  { position: 'absolute', bottom: 0, height: 2.5, width: '50%', borderRadius: 2 },
  content:       { flex: 1 },
  separator:     { height: StyleSheet.hairlineWidth },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  emptyIconWrap: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle:    { fontSize: 17, fontWeight: '800' },
  emptyText:     { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
