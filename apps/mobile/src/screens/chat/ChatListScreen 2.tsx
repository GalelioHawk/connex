import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  Modal, FlatList, ActivityIndicator, RefreshControl, AppState,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Path } from 'react-native-svg';
import { useAuthStore } from '../../store/authStore';
import { useMessageStore } from '../../store/messageStore';
import { chatService, ConvoWithMeta } from '../../services/chat';
import { useTheme } from '../../hooks/useTheme';
import NewChatModal from '../../components/chat/NewChatModal';
import CameraScreen from './CameraScreen';
import ConvoListItem from '../../components/chat/ConvoListItem';

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

function StatusIcon({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12.8" cy="11.2" r="8.9" stroke={color} strokeWidth={2} strokeDasharray="5 3" />
      <Circle cx="12.8" cy="11.2" r="3.45" stroke={color} strokeWidth={2} />
      <Path d="M8.1 16.9L5.2 20.5L9.5 19.05" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Top tabs ─────────────────────────────────────────────────────────────────
type Tab = 'Texts' | 'Status' | 'Calls' | 'Communities';
const TABS: Tab[] = ['Texts', 'Status', 'Calls', 'Communities'];

const TAB_ICONS: Record<Exclude<Tab, 'Status' | 'Communities'>, { active: string; inactive: string }> = {
  Texts: { active: 'chatbubbles', inactive: 'chatbubbles-outline' },
  Calls: { active: 'call', inactive: 'call-outline' },
};

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ChatListScreen() {
  const navigation  = useNavigation<any>();
  const accessToken = useAuthStore((s) => s.accessToken)!;
  const currentUser = useAuthStore((s) => s.user)!;
  const { colors } = useTheme();

  const [activeTab, setActiveTab]     = useState<Tab>('Texts');
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [cameraOpen, setCameraOpen]   = useState(false);
  const [convos, setConvos]           = useState<ConvoWithMeta[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

  useEffect(() => {
    loadConversations(true);
  }, []);

  // Realtime — update the specific conversation in state the instant a message arrives.
  useEffect(() => {
    const channel = supabase
      .channel('chat-list-messages')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const row = payload.new as { id: string; conversation_id: string; status: string };
          setConvos((prev) => prev.map((conv) => {
            if (conv.id !== row.conversation_id) return conv;
            if ((conv.last_message as any)?.id !== row.id) return conv;
            return { ...conv, last_message: { ...conv.last_message, status: row.status } as any };
          }));
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const row = payload.new as {
            id: string; conversation_id: string; sender_id: string;
            content: string | null; type: string; created_at: string; status: string;
          };
          setConvos((prev) => {
            const idx = prev.findIndex((c) => c.id === row.conversation_id);
            if (idx === -1) {
              loadConversations();
              return prev;
            }
            const updated = {
              ...prev[idx],
              last_message: {
                id:              row.id,
                conversation_id: row.conversation_id,
                sender_id:       row.sender_id,
                content:         row.content,
                type:            row.type as any,
                media_url:       null,
                status:          row.status as any,
                created_at:      row.created_at,
              },
              unread_count:
                row.sender_id !== currentUser.id
                  ? prev[idx].unread_count + 1
                  : prev[idx].unread_count,
            };
            const rest = prev.filter((_, i) => i !== idx);
            return [updated, ...rest];
          });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
      const interval = setInterval(() => {
        loadConversations();
      }, 30000);
      return () => clearInterval(interval);
    }, []),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') loadConversations();
    });
    return () => sub.remove();
  }, []);

  const newMessageConvId = useMessageStore((s) => s.newMessageConversationId);
  useEffect(() => {
    if (newMessageConvId) loadConversations();
  }, [newMessageConvId]);

  async function loadConversations(isInitial = false) {
    try {
      const { conversations } = await chatService.getConversations(accessToken);
      if (!conversations) return;
      if (!isInitial && conversations.length === 0) {
        setConvos((prev) => (prev.length > 0 ? prev : conversations));
      } else {
        setConvos(conversations);
      }
      conversations.forEach((conv) => {
        const lm = conv.last_message as (typeof conv.last_message & { status?: string }) | null;
        if (lm?.id && lm.sender_id !== currentUser.id && lm.status === 'sent') {
          chatService.markDelivered(lm.id, accessToken).catch(() => {});
        }
      });
    } catch (err) {
      console.warn('[ChatList] loadConversations error:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations(true);
    setRefreshing(false);
  }, []);

  function handleCapture(_uri: string, _type: 'photo' | 'video') {
    setCameraOpen(false);
    setActiveTab('Status');
  }

  function openConversation(convo: ConvoWithMeta) {
    const title = convo.type === 'group'
      ? (convo.name ?? 'Group')
      : (convo.other_user?.name ?? 'Chat');
    setConvos((prev) =>
      prev.map((c) => c.id === convo.id ? { ...c, unread_count: 0 } : c),
    );
    navigation.navigate('ChatRoom', { conversationId: convo.id, title });
  }

  function renderTabIcon(tab: Tab, active: boolean) {
    const color = active ? colors.text : colors.textMuted;
    if (tab === 'Communities') return <CommunitiesIcon color={color} />;
    if (tab === 'Status') return <StatusIcon color={color} />;
    const icon = TAB_ICONS[tab][active ? 'active' : 'inactive'];
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
    if (convos.length === 0) {
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
    return (
      <FlatList
        data={convos}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <ConvoListItem
            name={item.type === 'group' ? (item.name ?? 'Group') : (item.other_user?.name ?? 'Chat')}
            avatarLetter={
              item.type === 'group'
                ? (item.name?.[0] ?? 'G')
                : (item.other_user?.name?.[0] ?? '?')
            }
            lastMessage={item.last_message?.content ?? null}
            lastTime={item.last_message?.created_at ?? item.created_at}
            lastMessageStatus={(item.last_message as any)?.status ?? null}
            lastMessageIsMine={item.last_message?.sender_id === currentUser.id}
            unreadCount={item.unread_count}
            isGroup={item.type === 'group'}
            onPress={() => openConversation(item)}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
        }
        ItemSeparatorComponent={() => <View style={[s.separator, { backgroundColor: colors.separator, marginLeft: 84 }]} />}
      />
    );
  }

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />

      {/* Header */}
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

      {/* Top tabs */}
      <View style={[s.tabBar, { borderBottomColor: colors.border }]}>
        {TABS.map(tab => (
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

      {/* Content */}
      <View style={s.content}>
        {activeTab === 'Texts' && renderTextsTab()}
        {activeTab === 'Status' && (
          <View style={s.empty}>
            <View style={[s.emptyIconWrap, { backgroundColor: colors.surface }]}>
              <StatusIcon color={colors.textMuted} size={44} />
            </View>
            <Text style={[s.emptyTitle, { color: colors.text }]}>No status updates</Text>
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>Your contacts' status updates will appear here</Text>
          </View>
        )}
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

      {/* New chat modal */}
      <NewChatModal
        visible={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onConversationCreated={(convoId, title) => {
          setNewChatOpen(false);
          loadConversations();
          navigation.navigate('ChatRoom', { conversationId: convoId, title });
        }}
      />

      {/* Camera — full screen */}
      <Modal visible={cameraOpen} animationType="slide" statusBarTranslucent>
        <CameraScreen
          onClose={() => setCameraOpen(false)}
          onCapture={handleCapture}
        />
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
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
  separator:     { height: 1 },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  emptyIconWrap: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle:    { fontSize: 17, fontWeight: '800' },
  emptyText:     { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
