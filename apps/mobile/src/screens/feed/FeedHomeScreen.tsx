import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';

export default function FeedHomeScreen() {
  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#111111" />
      <View style={s.header}>
        <Text style={s.title}>Feed</Text>
      </View>
      <View style={s.empty}>
        <Text style={s.emptyIcon}>📢</Text>
        <Text style={s.emptyTitle}>Nothing here yet</Text>
        <Text style={s.emptyText}>Community posts and alerts will appear here</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#111111' },
  header:     { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#2C2C2E' },
  title:      { fontSize: 26, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.8 },
  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 40 },
  emptyIcon:  { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  emptyText:  { fontSize: 14, color: '#8E8E93', textAlign: 'center', lineHeight: 20 },
});
