import React, { useState } from 'react';
import IncomingCallBanner from '../components/chat/IncomingCallBanner';
import {
  View, TouchableOpacity, StyleSheet,
  Text, ScrollView, Image, Dimensions,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useChatTabStore, type ChatTab } from '../store/chatTabStore';
import { useTheme } from '../hooks/useTheme';
import { navigationRef } from './navigationRef';
import UpdatesIcon from '../components/shared/UpdatesIcon';
import CommunitiesIcon from '../components/shared/CommunitiesIcon';
import type { ThemeColors } from '../theme/colors';
import SessionErrorBoundary from '../components/shared/SessionErrorBoundary';

// ─── Auth stack ───────────────────────────────────────────────────────────────
export type AuthStackParams = { Onboarding: undefined; Register: undefined; Login: undefined };
const AuthStack = createNativeStackNavigator<AuthStackParams>();
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Onboarding" component={require('../screens/auth/WordmarkOnboardingScreen').default} />
      <AuthStack.Screen name="Register"   component={require('../screens/auth/RegisterScreen').default} />
      <AuthStack.Screen name="Login"      component={require('../screens/auth/LoginScreen').default} />
    </AuthStack.Navigator>
  );
}

// ─── Chat stack ───────────────────────────────────────────────────────────────
export type ChatStackParams = {
  ChatList:      undefined;
  ChatRoom:      { conversationId: string; title: string; avatarUrl?: string | null; userId?: string | null };
  ContactInfo:   { title: string; avatarUrl?: string | null; userId?: string | null };
  GroupInfo:     { conversationId: string; title: string };
  MessageRequests: undefined;
  NewGroup:      undefined;
  SOSContacts:   undefined;
  StatusViewer:  { userId: string; name: string; avatarUrl: string | null };
  StatusCreator: { initialMode?: 'media' | 'text' } | undefined;
  Call: {
    callId:            string;
    channelName:       string;
    callType:          'voice' | 'video';
    otherUserName:     string;
    otherUserAvatarUrl: string | null;
    isOutgoing:        boolean;
    conversationId:    string;
  };
};
const ChatStack = createNativeStackNavigator<ChatStackParams>();
function ChatNavigator() {
  return (
    <ChatStack.Navigator screenOptions={{ headerShown: false }}>
      <ChatStack.Screen name="ChatList"      component={require('../screens/chat/ChatListScreen').default} />
      <ChatStack.Screen name="ChatRoom"      component={require('../screens/chat/ChatRoomScreen').default} />
      <ChatStack.Screen name="ContactInfo"   component={require('../screens/chat/ContactInfoScreen').default} />
      <ChatStack.Screen name="GroupInfo"     component={require('../screens/chat/GroupInfoScreen').default} />
      <ChatStack.Screen name="MessageRequests" component={require('../screens/chat/MessageRequestsScreen').default} />
      <ChatStack.Screen name="NewGroup"      component={require('../screens/chat/NewGroupScreen').default} />
      <ChatStack.Screen name="SOSContacts"   component={require('../screens/sos/SOSContactsScreen').default} />
      <ChatStack.Screen
        name="StatusViewer"
        component={require('../screens/chat/StatusViewerScreen').default}
        options={{ animation: 'slide_from_bottom' }}
      />
      <ChatStack.Screen name="StatusCreator" component={require('../screens/chat/StatusCreatorScreen').default} />
      <ChatStack.Screen
        name="Call"
        component={require('../screens/chat/CallScreen').default}
        options={{ animation: 'slide_from_bottom' }}
      />
    </ChatStack.Navigator>
  );
}
// ─── Edu stack ────────────────────────────────────────────────────────────────
export type EduStackParams = {
  EduHome:        undefined;
  TutorDashboard: undefined;
  MyBookings:     undefined;
  BookingDetail:  { bookingId: string };
  CreateBooking:  { studentId?: string };
  StudentRoster:  undefined;
  HomeworkList:   undefined;
  HomeworkDetail: { assignmentId: string };
  AssignHomework: { studentId?: string };
  MarkHomework:   { assignmentId: string };
  StudentLedger:  { studentId: string };
  Call: {
    callId:            string;
    channelName:       string;
    callType:          'voice' | 'video';
    otherUserName:     string;
    otherUserAvatarUrl: string | null;
    isOutgoing:        boolean;
    conversationId:    string;
  };
};
const EduStack = createNativeStackNavigator<EduStackParams>();
function EduNavigator() {
  return (
    <EduStack.Navigator screenOptions={{ headerShown: false }}>
      <EduStack.Screen name="EduHome"        component={require('../screens/edu/EduHomeScreen').default} />
      <EduStack.Screen name="TutorDashboard" component={require('../screens/edu/TutorDashboardScreen').default} />
      <EduStack.Screen name="MyBookings"     component={require('../screens/edu/MyBookingsScreen').default} />
      <EduStack.Screen name="BookingDetail"  component={require('../screens/edu/BookingDetailScreen').default} />
      <EduStack.Screen name="CreateBooking"  component={require('../screens/edu/CreateBookingScreen').default} />
      <EduStack.Screen name="StudentRoster"  component={require('../screens/edu/StudentRosterScreen').default} />
      <EduStack.Screen name="HomeworkList"   component={require('../screens/edu/HomeworkListScreen').default} />
      <EduStack.Screen name="HomeworkDetail" component={require('../screens/edu/HomeworkDetailScreen').default} />
      <EduStack.Screen name="AssignHomework" component={require('../screens/edu/AssignHomeworkScreen').default} />
      <EduStack.Screen name="MarkHomework"   component={require('../screens/edu/MarkHomeworkScreen').default} />
      <EduStack.Screen name="StudentLedger"  component={require('../screens/edu/StudentLedgerScreen').default} />
      <EduStack.Screen
        name="Call"
        component={require('../screens/chat/CallScreen').default}
        options={{ animation: 'slide_from_bottom' }}
      />
    </EduStack.Navigator>
  );
}

// ─── Tab navigator (no visible tab bar) ──────────────────────────────────────
export type MainTabParams = {
  Chat: undefined; Feed: undefined; Edu: undefined; Profile: undefined;
};
const Tab = createBottomTabNavigator<MainTabParams>();
function MainNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
      <Tab.Screen name="Chat"    component={ChatNavigator} />
      <Tab.Screen name="Feed"    component={require('../screens/feed/FeedHomeScreen').default} />
      <Tab.Screen name="Edu"     component={EduNavigator} />
      <Tab.Screen name="Profile" component={require('../screens/profile/ProfileScreen').default} />
    </Tab.Navigator>
  );
}

// ─── Bottom tab bar ───────────────────────────────────────────────────────────
const HIDE_ON = [
  'ChatRoom', 'NewGroup', 'SOSContacts', 'ContactInfo', 'GroupInfo', 'MessageRequests', 'StatusViewer', 'StatusCreator', 'Call',
  'BookingDetail', 'CreateBooking', 'HomeworkDetail', 'AssignHomework', 'MarkHomework', 'StudentLedger',
];

interface FloatingMenuProps {
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
  currentRoute: string;
}

function FloatingMenu({ colors, isDark, toggleTheme, currentRoute }: FloatingMenuProps) {
  const insets     = useSafeAreaInsets();
  const sessionId  = useAuthStore((state) => state.sessionId);
  const user       = useAuthStore((state) => state.user);
  const chatTab    = useChatTabStore((state) => state.tab);
  const setChatTab = useChatTabStore((state) => state.setTab);

  // Shared subscriptions with ChatListScreen (same queries — no extra load)
  const convos = useQuery(
    api.chat.listConversations,
    sessionId ? { sessionId: sessionId as Id<'sessions'> } : 'skip',
  );
  const statusData = useQuery(
    api.status.list,
    sessionId ? { sessionId: sessionId as Id<'sessions'> } : 'skip',
  );
  const totalUnread = (convos ?? []).reduce(
    (sum, convo) => sum + (convo?.unread_count ?? 0),
    0,
  );
  const hasUnseenStatus = statusData?.contacts?.some((c) => c.hasUnseen) ?? false;

  const visible = !HIDE_ON.includes(currentRoute);
  if (!visible) return null;

  // The chat screen ('' = initial route — the app opens on the chat list)
  const onChatScreen = currentRoute === 'ChatList' || currentRoute === '';

  const goTab = (name: string) => navigationRef.current?.navigate(name as never);
  const goChatSection = (section: ChatTab) => {
    goTab('Chat');
    setChatTab(section);
  };

  const bubbleBg  = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.07)';
  const barBottom = Math.max(insets.bottom - 16, 10);
  const dotBorder = isDark ? '#1C1C1E' : colors.tabBar;

  // The first 5 items exactly fill the visible pill; the rest follow on swipe
  const itemWidth = (Dimensions.get('window').width - 24 - 12) / 5;
  const inactive  = isDark ? '#C9C9CE' : '#5A5A5E';
  const activeCol = isDark ? '#FFFFFF' : colors.text;

  interface BarItem {
    key:        string;
    label:      string;
    icon:       (color: string) => React.ReactNode;
    onPress:    () => void;
    active?:    boolean;
    tint?:      string;   // fixed colour (SOS red)
    hasBadge?:  boolean;  // unread count
    youDot?:    boolean;  // green presence dot on avatar
    soon?:      boolean;  // coming-soon, disabled
  }

  const onFeed    = currentRoute === 'Feed';
  const onEdu     = currentRoute === 'EduHome';
  const onProfile = currentRoute === 'Profile';

  // Founder-specified order: Chats, Calls, SOS, Updates, Feed, Edu, Communities… You last
  const items: BarItem[] = [
    {
      key: 'Chats', label: 'Chats', active: onChatScreen && chatTab === 'Texts', hasBadge: true,
      icon: (color) => <Ionicons name="chatbubbles" size={24} color={color} />,
      onPress: () => goChatSection('Texts'),
    },
    {
      key: 'Calls', label: 'Calls', active: onChatScreen && chatTab === 'Calls',
      icon: (color) => <Ionicons name="call" size={24} color={color} />,
      onPress: () => goChatSection('Calls'),
    },
    {
      key: 'SOS', label: 'SOS', tint: '#E53E3E',
      icon: () => <Ionicons name="shield" size={23} color="#E53E3E" />,
      onPress: () => (navigationRef.current as any)?.navigate('Chat', { screen: 'SOSContacts' }),
    },
    {
      key: 'Updates', label: 'Updates', active: onChatScreen && chatTab === 'Status',
      icon: (color) => <UpdatesIcon size={26} color={color} showDot={hasUnseenStatus} />,
      onPress: () => goChatSection('Status'),
    },
    {
      key: 'Feed', label: 'Feed', active: onFeed,
      icon: (color) => (
        <Ionicons name={onFeed ? 'newspaper' : 'newspaper-outline'} size={23} color={color} />
      ),
      onPress: () => goTab('Feed'),
    },
    {
      key: 'Edu', label: 'Edu', active: onEdu,
      icon: (color) => (
        <Ionicons name={onEdu ? 'book' : 'book-outline'} size={23} color={color} />
      ),
      onPress: () => goTab('Edu'),
    },
    {
      key: 'Communities', label: 'Communities', active: onChatScreen && chatTab === 'Communities',
      icon: (color) => <CommunitiesIcon size={27} color={color} />,
      onPress: () => goChatSection('Communities'),
    },
    {
      key: 'Pay', label: 'Pay', soon: true,
      icon: (color) => <Ionicons name="wallet-outline" size={23} color={color} />,
      onPress: () => undefined,
    },
    {
      key: 'Logistics', label: 'Logistics', soon: true,
      icon: (color) => <Ionicons name="car-outline" size={23} color={color} />,
      onPress: () => undefined,
    },
    {
      key: 'Theme', label: isDark ? 'Dark' : 'Light',
      icon: (color) => (
        <Ionicons name={isDark ? 'moon' : 'sunny-outline'} size={23} color={color} />
      ),
      onPress: toggleTheme,
    },
    {
      key: 'You', label: 'You', youDot: true, active: onProfile,
      icon: (color) =>
        user?.avatar_url ? (
          <Image source={{ uri: user.avatar_url }} style={s.avatarIcon} />
        ) : (
          <Ionicons name="person-circle" size={27} color={color} />
        ),
      onPress: () => goTab('Profile'),
    },
  ];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={[s.bar, { bottom: barBottom }]}>
        {/* Frosted-glass background like WhatsApp's bar */}
        <BlurView
          intensity={70}
          tint={isDark ? 'dark' : 'light'}
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: isDark ? 'rgba(28,28,30,0.55)' : 'rgba(255,255,255,0.55)' },
          ]}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.row}
          bounces={false}
        >
          {items.map((item) => {
            const color = item.soon
              ? colors.textMuted
              : item.tint ?? (item.active ? activeCol : inactive);
            return (
              <TouchableOpacity
                key={item.key}
                style={[s.waItem, { width: itemWidth }, item.soon && s.itemDim]}
                onPress={item.soon ? undefined : item.onPress}
                activeOpacity={item.soon ? 1 : 0.7}
              >
                <View style={[s.iconBubble, item.active && { backgroundColor: bubbleBg }]}>
                  {item.icon(color)}
                  {item.hasBadge && totalUnread > 0 && (
                    <View style={s.countBadge}>
                      <Text style={s.countBadgeText}>
                        {totalUnread > 99 ? '99+' : totalUnread}
                      </Text>
                    </View>
                  )}
                  {item.youDot && (
                    <View style={[s.onlineDot, { borderColor: dotBorder }]} />
                  )}
                  {item.soon && (
                    <View style={s.badge}>
                      <Text style={s.badgeText}>Soon</Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[s.waLabel, { color }, item.active && s.labelActive]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // WhatsApp-style floating pill bar
  bar: {
    position:     'absolute',
    left:         12,
    right:        12,
    borderRadius: 30,
    shadowColor:    '#000',
    shadowOffset:   { width: 0, height: 6 },
    shadowOpacity:  0.25,
    shadowRadius:   14,
    elevation:      16,
    overflow:       'hidden',
  },
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 10,
    paddingVertical:   8,
    gap:               2,
  },
  item: {
    alignItems:  'center',
    paddingHorizontal: 10,
    gap: 2,
  },
  itemDim: {
    opacity: 0.5,
  },
  iconBubble: {
    minWidth:       62,
    height:         36,
    borderRadius:   18,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  avatarIcon: {
    width:        27,
    height:       27,
    borderRadius: 13.5,
  },
  waItem: {
    alignItems: 'center',
    gap: 3,
  },
  waLabel: {
    fontSize:   12,
    fontWeight: '500',
  },
  countBadge: {
    position:        'absolute',
    top:             -5,
    right:           6,
    minWidth:        20,
    height:          20,
    borderRadius:    10,
    backgroundColor: '#25D366',
    alignItems:      'center',
    justifyContent:  'center',
    paddingHorizontal: 5,
  },
  countBadgeText: {
    color:      '#FFFFFF',
    fontSize:   12,
    fontWeight: '700',
  },
  onlineDot: {
    position:        'absolute',
    top:             -2,
    right:           12,
    width:           11,
    height:          11,
    borderRadius:    5.5,
    backgroundColor: '#25D366',
    borderWidth:     2,
  },
  badge: {
    position:        'absolute',
    top:             -6,
    right:           -6,
    backgroundColor: '#C9973F',
    borderRadius:    4,
    paddingHorizontal: 4,
    paddingVertical:   1,
    width:           32,
  },
  badgeText: {
    color:      '#fff',
    fontSize:   8,
    fontWeight: '700',
    textAlign:  'center',
  },
  label: {
    fontSize:   10,
    fontWeight: '600',
  },
  labelActive: {
    fontWeight: '700',
  },
});

// ─── Root navigator ───────────────────────────────────────────────────────────
export default function RootNavigator() {
  const isAuthenticated    = useAuthStore((s) => s.isAuthenticated && !!s.sessionId);
  const sessionId          = useAuthStore((s) => s.sessionId);
  const { colors, isDark } = useTheme();
  const toggleTheme        = useThemeStore((s) => s.toggleTheme);
  const [currentRoute, setCurrentRoute] = useState('');

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer
        ref={navigationRef}
        onStateChange={() => {
          const route = navigationRef.current?.getCurrentRoute()?.name ?? '';
          setCurrentRoute(route);
        }}
      >
        {isAuthenticated ? (
          <SessionErrorBoundary resetKey={sessionId}>
            <MainNavigator />
          </SessionErrorBoundary>
        ) : <AuthNavigator />}
      </NavigationContainer>

      {isAuthenticated && (
        <FloatingMenu
          colors={colors}
          isDark={isDark}
          toggleTheme={toggleTheme}
          currentRoute={currentRoute}
        />
      )}
      {isAuthenticated && currentRoute !== 'Call' && <IncomingCallBanner />}
    </View>
  );
}
