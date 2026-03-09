import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { navigationRef } from './navigationRef';

import OnboardingScreen   from '../screens/auth/OnboardingScreen';
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
      <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
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

// ─── Main tab navigator ───────────────────────────────────────────────────────
export type MainTabParams = {
  Chat:    undefined;
  Feed:    undefined;
  Edu:     undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParams>();

function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#00A86B',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: '#2C2C2E',
          borderTopWidth: 0,
          borderRadius: 32,
          height: 64,
          marginHorizontal: 16,
          marginBottom: 24,
          paddingTop: 8,
          paddingBottom: 8,
          shadowColor: '#636366',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 24,
          elevation: 20,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, { active: string; inactive: string }> = {
            Chat:    { active: 'chatbubbles',    inactive: 'chatbubbles-outline' },
            Feed:    { active: 'newspaper',     inactive: 'newspaper-outline' },
            Edu:     { active: 'book',          inactive: 'book-outline' },
            Profile: { active: 'person',        inactive: 'person-outline' },
          };
          const icon = icons[route.name];
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
      <Tab.Screen name="Chat"    component={ChatNavigator} />
      <Tab.Screen name="Feed"    component={FeedHomeScreen} />
      <Tab.Screen name="Edu"     component={EduHomeScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ─── Root navigator ───────────────────────────────────────────────────────────
export default function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <NavigationContainer ref={navigationRef}>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
