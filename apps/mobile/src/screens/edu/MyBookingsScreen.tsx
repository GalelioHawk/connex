import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import dayjs from 'dayjs';

const STATUS_COLOR: Record<string, string> = {
  scheduled: '#4D96FF', completed: '#00A86B', cancelled: '#E67E22', no_show: '#E74C3C',
};

export default function MyBookingsScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const sessionId = useAuthStore((s) => s.sessionId)! as Id<'sessions'>;
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');

  const bookings = useQuery(api.eduBookings.listMyBookings, { sessionId });
  const now = Date.now();
  const filtered = (bookings ?? []).filter((b) =>
    filter === 'upcoming' ? b.scheduled_at >= now && b.status === 'scheduled' : b.scheduled_at < now || b.status !== 'scheduled',
  );

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.text }]}>Bookings</Text>
        <View style={s.backBtn} />
      </View>

      <View style={s.tabs}>
        {(['upcoming', 'past'] as const).map((f) => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[s.tab, { borderColor: colors.border }, filter === f && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
            <Text style={{ color: filter === f ? '#fff' : colors.textSecondary, fontWeight: '800', textTransform: 'capitalize' }}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}>
            <View style={{ flex: 1 }}>
              <Text style={[s.cardTitle, { color: colors.text }]}>{item.student_name}</Text>
              <Text style={{ color: colors.textSecondary }}>{dayjs(item.scheduled_at).format('ddd D MMM, HH:mm')} · {item.duration_minutes}min{item.subject_code ? ` · ${item.subject_code}` : ''}</Text>
            </View>
            <Text style={{ color: STATUS_COLOR[item.status] ?? colors.textSecondary, fontWeight: '900', textTransform: 'capitalize' }}>{item.status.replace('_', ' ')}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={bookings === undefined ? <ActivityIndicator color={colors.accent} style={{ marginTop: 30 }} /> : (
          <View style={s.empty}>
            <Ionicons name="calendar-outline" size={42} color={colors.textMuted} />
            <Text style={{ color: colors.textSecondary }}>No {filter} bookings.</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, height: 52 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '900' },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  tab: { flex: 1, borderWidth: 1, borderRadius: 12, alignItems: 'center', paddingVertical: 9 },
  list: { paddingHorizontal: 16, paddingBottom: 60 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '900' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
});
