import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ConvexProvider } from 'convex/react';
import { convex } from './src/services/convex';
import RootNavigator from './src/navigation';
import usePushNotifications from './src/hooks/usePushNotifications';
import usePresence from './src/hooks/usePresence';

function AppContent() {
  usePushNotifications();
  usePresence();
  return <RootNavigator />;
}

export default function App() {
  return (
    <ConvexProvider client={convex}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AppContent />
      </SafeAreaProvider>
    </ConvexProvider>
  );
}
