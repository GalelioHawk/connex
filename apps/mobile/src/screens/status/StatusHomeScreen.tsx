import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

export default function StatusHomeScreen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Text style={[s.title, { color: colors.text }]}>Status</Text>
      </View>
      <View style={s.empty}>
        <Ionicons name="disc-outline" size={64} color={colors.textMuted} />
        <Text style={[s.emptyTitle, { color: colors.text }]}>No updates yet</Text>
        <Text style={[s.emptyBody, { color: colors.textSecondary }]}>
          Status updates are coming soon.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1 },
  header:     { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  title:      { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptyBody:  { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
