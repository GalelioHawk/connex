import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';
import { navigationRef } from './navigationRef';

import WordmarkOnboardingScreen from '../screens/auth/WordmarkOnboardingScreen';
import RegisterScreen     from '../screens/auth/RegisterScreen';
import LoginScreen        from '../screens/auth/LoginScreen';
import ChatListScreen     from '../screens/chat/ChatListScreen';
import ChatRoomScreen     from '../screens/chat/ChatRoomScreen';
import NewGroupScreen     from '../screens/chat/NewGroupScreen';
import SOSContactsScreen  from '../screens/sos/SOSContactsScreen';
import FeedHomeScreen     from '../screens/feed/FeedHomeScreen';
import EduHomeScreen      from '../screens/edu/EduHomeScreen';
import ProfileScreen      from '../screens/profile/ProfileScreen';

// ─── Auth stack ───────────────────────────────────────────────────────────────
export type AuthStackParams = {
  Onboarding: undefined;
  Register:   undefined;
  Login:      undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParams>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Onboarding" component={WordmarkOnboardingScreen} />
      <AuthStack.Screen name="Register"   component={RegisterScreen} />
      <AuthStack.Screen name="Login"      component={LoginScreen} />
    </AuthStack.Navigator>
  );
}

// ─── Chat stack ───────────────────────────────────────────────────────────────
export type ChatStackParams = {
  ChatList:    undefined;
  ChatRoom:    { conversationId: string; title: string };
  NewGroup:    undefined;
  SOSContacts: undefined;
};

const ChatStack = createNativeStackNavigator<ChatStackParams>();

function ChatNavigator() {
  return (
    <ChatStack.Navigator screenOptions={{ headerShown: false }}>
      <ChatStack.Screen name="ChatList"    component={ChatListScreen} />
      <ChatStack.Screen name="ChatRoom"    component={ChatRoomScreen} />
      <ChatStack.Screen name="NewGroup"    component={NewGroupScreen} />
      <ChatStack.Screen name="SOSContacts" component={SOSContactsScreen} />
    </ChatStack.Navigator>
  );
}

// ─── Tab bar visibility helper ────────────────────────────────────────────────
const HIDE_ON_SCREENS = ['ChatRoom', 'NewGroup', 'SOSContacts'];

function getTabBarStyle(route: any, tabBarBg: string) {
  const routeName = getFocusedRouteNameFromRoute(route);
  if (routeName && HIDE_ON_SCREENS.includes(routeName)) {
    return { display: 'none' as const };
  }
  return {
    position: 'absolute' as const,
    backgroundColor: tabBarBg,
    borderTopWidth: 0,
    borderRadius: 32,
    height: 64,
    marginHorizontal: 16,
    marginBottom: 24,
    paddingTop: 8,
    paddingBottom: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
  };
}

// ─── Dummy screen for the theme toggle tab ───────────────────────────────────
function ThemeToggleScreen() { return null; }

// ─── Main tab navigator ───────────────────────────────────────────────────────
export type MainTabParams = {
  Chat:    undefined;
  Feed:    undefined;
  Edu:     undefined;
  Profile: undefined;
  Theme:   undefined;
};

const Tab = createBottomTabNavigator<MainTabParams>();

function MainNavigator() {
  const { colors, isDark } = useTheme();
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const tabBarStyle = {
    position: 'absolute' as const,
    backgroundColor: colors.tabBar,
    borderTopWidth: 0,
    borderRadius: 32,
    height: 64,
    marginHorizontal: 16,
    marginBottom: 24,
    paddingTop: 8,
    paddingBottom: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.5 : 0.15,
    shadowRadius: 16,
    elevation: 20,
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
        tabBarStyle: tabBarStyle,
        tabBarIcon: ({ focused, color }) => {
          const icons: Record<string, { active: string; inactive: string }> = {
            Chat:    { active: 'chatbubbles',   inactive: 'chatbubbles-outline' },
            Feed:    { active: 'newspaper',     inactive: 'newspaper-outline' },
            Edu:     { active: 'book',          inactive: 'book-outline' },
            Profile: { active: 'person',        inactive: 'person-outline' },
            Theme:   { active: isDark ? 'moon' : 'sunny', inactive: isDark ? 'moon-outline' : 'sunny-outline' },
          };
          const icon = icons[route.name];
          if (!icon) return null;
          return (
            <Ionicons
              name={(focused ? icon.active : icon.inactive) as any}
              size={22}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen
        name="Chat"
        component={ChatNavigator}
        options={({ route }) => ({ tabBarStyle: getTabBarStyle(route, colors.tabBar) })}
      />
      <Tab.Screen name="Feed"    component={FeedHomeScreen} />
      <Tab.Screen name="Edu"     component={EduHomeScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen
        name="Theme"
        component={ThemeToggleScreen}
        options={{ tabBarLabel: isDark ? 'Dark' : 'Light' }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            toggleTheme();
          },
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Root navigator ───────────────────────────────────────────────────────────
export default function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken     = useAuthStore((s) => s.accessToken);
  const refreshToken    = useAuthStore((s) => s.refreshToken);
  const updateToken     = useAuthStore((s) => s.updateToken);
  const clearAuth       = useAuthStore((s) => s.clearAuth);

  // Restore Supabase session on startup so Realtime WebSocket authenticates.
  useEffect(() => {
    if (!isAuthenticated || !accessToken || !refreshToken) return;
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .catch(() => {});
  }, [isAuthenticated]);

  // Keep authStore tokens in sync when Supabase auto-refreshes them.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        updateToken(session.access_token, session.refresh_token);
      } else if (event === 'SIGNED_OUT') {
        clearAuth();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
