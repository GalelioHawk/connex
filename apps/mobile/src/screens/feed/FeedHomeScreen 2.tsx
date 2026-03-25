import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export default function FeedHomeScreen() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Text style={[s.title, { color: colors.text }]}>Feed</Text>
      </View>
      <View style={s.empty}>
        <Text style={s.emptyIcon}>📢</Text>
        <Text style={[s.emptyTitle, { color: colors.text }]}>Nothing here yet</Text>
        <Text style={[s.emptyText, { color: colors.textSecondary }]}>Community posts and alerts will appear here</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1 },
  header:     { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1 },
  title:      { fontSize: 26, fontWeight: '900', letterSpacing: -0.8 },
  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 40 },
  emptyIcon:  { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  emptyText:  { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
