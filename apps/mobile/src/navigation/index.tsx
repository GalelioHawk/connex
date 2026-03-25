import React, { useState } from 'react';
import IncomingCallBanner from '../components/chat/IncomingCallBanner';
import {
  View, TouchableOpacity, StyleSheet,
  Text, ScrollView,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useTheme } from '../hooks/useTheme';
import { navigationRef } from './navigationRef';
import type { ThemeColors } from '../theme/colors';

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
      <Tab.Screen name="Edu"     component={require('../screens/edu/EduHomeScreen').default} />
      <Tab.Screen name="Profile" component={require('../screens/profile/ProfileScreen').default} />
    </Tab.Navigator>
  );
}

// ─── Bottom tab bar ───────────────────────────────────────────────────────────
const HIDE_ON = ['ChatRoom', 'NewGroup', 'SOSContacts', 'ContactInfo', 'StatusViewer', 'StatusCreator', 'Call'];

const TABS = [
  { name: 'Chat',      active: 'chatbubbles', inactive: 'chatbubbles-outline', comingSoon: false, isTheme: false, isSOS: false },
  { name: 'Feed',      active: 'newspaper',   inactive: 'newspaper-outline',   comingSoon: false, isTheme: false, isSOS: false },
  { name: 'Edu',       active: 'book',        inactive: 'book-outline',        comingSoon: false, isTheme: false, isSOS: false },
  { name: 'Profile',   active: 'person',      inactive: 'person-outline',      comingSoon: false, isTheme: false, isSOS: false },
  { name: 'SOS',       active: 'shield',      inactive: 'shield-outline',      comingSoon: false, isTheme: false, isSOS: true  },
  { name: 'Pay',       active: 'wallet',      inactive: 'wallet-outline',      comingSoon: true,  isTheme: false, isSOS: false },
  { name: 'Logistics', active: 'car',         inactive: 'car-outline',         comingSoon: true,  isTheme: false, isSOS: false },
  { name: 'Theme',     active: 'moon',        inactive: 'moon-outline',        comingSoon: false, isTheme: true,  isSOS: false },
];

interface FloatingMenuProps {
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
  currentRoute: string;
}

function FloatingMenu({ colors, isDark, toggleTheme, currentRoute }: FloatingMenuProps) {
  const [activeTab, setActiveTab] = useState('Chat');

  const visible = !HIDE_ON.includes(currentRoute);
  if (!visible) return null;

  const go = (tabName: string) => {
    navigationRef.current?.navigate(tabName as never);
    setActiveTab(tabName);
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={[s.bar, { backgroundColor: colors.tabBar, borderTopColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.row}
          bounces={false}
        >
          {TABS.map((tab) => {
            const focused    = !tab.isTheme && !tab.isSOS && !tab.comingSoon && activeTab === tab.name;
            const iconName   = tab.isTheme
              ? (isDark ? 'moon' : 'sunny-outline')
              : (focused ? tab.active : tab.inactive);
            const iconColor  = tab.comingSoon
              ? colors.textMuted
              : tab.isSOS
                ? '#E53E3E'
                : focused
                  ? colors.accent
                  : colors.textMuted;
            const labelColor = iconColor;

            return (
              <TouchableOpacity
                key={tab.name}
                style={[s.item, tab.comingSoon && s.itemDim]}
                onPress={() => {
                  if (tab.comingSoon) return;
                  if (tab.isTheme) { toggleTheme(); return; }
                  if (tab.isSOS) {
                    (navigationRef.current as any)?.navigate('Chat', { screen: 'SOSContacts' });
                    return;
                  }
                  go(tab.name);
                }}
                activeOpacity={tab.comingSoon ? 1 : 0.7}
              >
                <View style={s.iconWrap}>
                  <Ionicons name={iconName as any} size={22} color={iconColor} />
                  {tab.comingSoon && (
                    <View style={s.badge}>
                      <Text style={s.badgeText}>Soon</Text>
                    </View>
                  )}
                </View>
                <Text style={[s.label, { color: labelColor }, focused && s.labelActive]}>
                  {tab.isTheme ? (isDark ? 'Dark' : 'Light') : tab.name}
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
  bar: {
    position:    'absolute',
    bottom:      0,
    left:        0,
    right:       0,
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowColor:    '#000',
    shadowOffset:   { width: 0, height: -2 },
    shadowOpacity:  0.08,
    shadowRadius:   8,
    elevation:      16,
  },
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 8,
    paddingBottom:     20,
    paddingTop:        10,
    gap:               4,
  },
  item: {
    alignItems:  'center',
    paddingHorizontal: 16,
    gap: 3,
  },
  itemDim: {
    opacity: 0.5,
  },
  iconWrap: {
    position: 'relative',
  },
  badge: {
    position:        'absolute',
    top:             -4,
    right:           -14,
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
        {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
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
