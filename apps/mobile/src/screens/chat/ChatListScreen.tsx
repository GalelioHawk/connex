import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  Modal, FlatList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Path } from 'react-native-svg';

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
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { useMessageStore } from '../../store/messageStore';
import { chatService, ConvoWithMeta } from '../../services/chat';
import NewChatModal from '../../components/chat/NewChatModal';
import CameraScreen from './CameraScreen';
import ConvoListItem from '../../components/chat/ConvoListItem';

// ─── Top tabs ─────────────────────────────────────────────────────────────────
type Tab = 'Texts' | 'Status' | 'Calls' | 'Communities';
const TABS: Tab[] = ['Texts', 'Status', 'Calls', 'Communities'];

const TAB_ICONS: Record<Tab, { active: string; inactive: string }> = {
  Texts:       { active: 'chatbubbles',      inactive: 'chatbubbles-outline' },
  Status:      { active: 'radio-button-on', inactive: 'radio-button-off-outline' },
  Calls:       { active: 'call',            inactive: 'call-outline' },
  Communities: { active: 'people',           inactive: 'people-outline' },
};

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIconWrap}>
        <Ionicons name={icon as any} size={44} color="#4C4C4E" />
      </View>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyText}>{text}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ChatListScreen() {
  const navigation  = useNavigation<any>();
  const accessToken = useAuthStore((s) => s.accessToken)!;

  const [activeTab, setActiveTab]     = useState<Tab>('Texts');
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [cameraOpen, setCameraOpen]   = useState(false);
  const [convos, setConvos]           = useState<ConvoWithMeta[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  // When a push message arrives in any conversation, refresh the list
  const newMessageConvId = useMessageStore((s) => s.newMessageConversationId);
  useEffect(() => {
    if (newMessageConvId) loadConversations();
  }, [newMessageConvId]);

  async function loadConversations() {
    try {
      const { conversations } = await chatService.getConversations(accessToken);
      setConvos(conversations);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  }, []);

  function handleCapture(uri: string, type: 'photo' | 'video') {
    setCameraOpen(false);
    setActiveTab('Status');
  }

  function openConversation(convo: ConvoWithMeta) {
    const title = convo.type === 'group'
      ? (convo.name ?? 'Group')
      : (convo.other_user?.name ?? 'Chat');
    navigation.navigate('ChatRoom', { conversationId: convo.id, title });
  }

  function renderTextsTab() {
    if (loading) {
      return (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#00A86B" />
        </View>
      );
    }

    if (convos.length === 0) {
      return (
        <EmptyState
          icon="chatbubble-ellipses-outline"
          title="No messages yet"
          text="Start a conversation by tapping the compose button"
        />
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
            unreadCount={item.unread_count}
            isGroup={item.type === 'group'}
            onPress={() => openConversation(item)}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ItemSeparatorComponent={() => <View style={s.separator} />}
      />
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#111111" />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Chats</Text>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.iconBtn} onPress={() => setCameraOpen(true)}>
            <Ionicons name="camera-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn}>
            <Ionicons name="search-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={() => setNewChatOpen(true)}>
            <Ionicons name="add-circle-outline" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Top tabs */}
      <View style={s.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={s.tabItem}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            {tab === 'Communities'
              ? <CommunitiesIcon color={activeTab === tab ? '#FFFFFF' : '#4C4C4E'} />
              : <Ionicons
                  name={TAB_ICONS[tab][activeTab === tab ? 'active' : 'inactive'] as any}
                  size={24}
                  color={activeTab === tab ? '#FFFFFF' : '#4C4C4E'}
                />
            }
            {activeTab === tab && <View style={s.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={s.content}>
        {activeTab === 'Texts' && renderTextsTab()}
        {activeTab === 'Status' && (
          <EmptyState icon="radio-button-off-outline" title="No status updates" text="Your contacts' status updates will appear here" />
        )}
        {activeTab === 'Calls' && (
          <EmptyState icon="call-outline" title="No recent calls" text="Your call history will appear here" />
        )}
        {activeTab === 'Communities' && (
          <EmptyState icon="people-circle-outline" title="No communities yet" text="Join or create a community to connect with groups" />
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
  root:          { flex: 1, backgroundColor: '#111111' },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  headerTitle:   { fontSize: 26, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.8 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn:       { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  tabBar:        { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#2C2C2E' },
  tabItem:       { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabIndicator:  { position: 'absolute', bottom: 0, height: 2.5, width: '50%', backgroundColor: '#FFFFFF', borderRadius: 2 },
  content:       { flex: 1 },
  separator:     { height: 1, backgroundColor: '#2C2C2E', marginLeft: 84 },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  emptyIconWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#1C1C1E', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle:    { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  emptyText:     { fontSize: 14, color: '#8E8E93', textAlign: 'center', lineHeight: 20 },
});
