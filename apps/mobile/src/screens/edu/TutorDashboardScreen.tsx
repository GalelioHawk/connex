import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import dayjs from 'dayjs';

export default function TutorDashboardScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const sessionId = useAuthStore((s) => s.sessionId)! as Id<'sessions'>;

  const bookings = useQuery(api.eduBookings.listMyBookings, { sessionId });
  const students = useQuery(api.eduBookings.listMyStudents, { sessionId });
  const ledger = useQuery(api.eduLedger.listMyLedgerSummary, { sessionId });

  const upcoming = bookings?.filter((b) => b.status === 'scheduled') ?? [];

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.text }]}>My Tutoring</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.body}>
        <View style={s.actionsRow}>
          <TouchableOpacity style={[s.action, { backgroundColor: colors.accent }]} onPress={() => navigation.navigate('CreateBooking', {})}>
            <Ionicons name="calendar" size={18} color="#fff" />
            <Text style={s.actionText}>Schedule lesson</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.action, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]} onPress={() => navigation.navigate('StudentRoster')}>
            <Ionicons name="people" size={18} color={colors.text} />
            <Text style={[s.actionText, { color: colors.text }]}>My students</Text>
          </TouchableOpacity>
        </View>

        <View style={s.actionsRow}>
          <TouchableOpacity style={[s.action, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]} onPress={() => navigation.navigate('HomeworkList')}>
            <Ionicons name="document-text" size={18} color={colors.text} />
            <Text style={[s.actionText, { color: colors.text }]}>Homework</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.action, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]} onPress={() => navigation.navigate('MyBookings')}>
            <Ionicons name="list" size={18} color={colors.text} />
            <Text style={[s.actionText, { color: colors.text }]}>All bookings</Text>
          </TouchableOpacity>
        </View>

        <Text style={[s.sectionTitle, { color: colors.text }]}>Upcoming lessons</Text>
        {bookings === undefined ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
        ) : upcoming.length === 0 ? (
          <Text style={{ color: colors.textSecondary }}>Nothing scheduled yet.</Text>
        ) : (
          upcoming.slice(0, 5).map((b, i) => (
            <View key={i} style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[s.cardIcon, { backgroundColor: `${colors.accent}22` }]}>
                <Ionicons name="time" size={20} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.cardTitle, { color: colors.text }]}>{b.student_name}</Text>
                <Text style={{ color: colors.textSecondary }}>{dayjs(b.scheduled_at).format('ddd D MMM, HH:mm')} · {b.duration_minutes}min</Text>
              </View>
            </View>
          ))
        )}

        <Text style={[s.sectionTitle, { color: colors.text }]}>Who owes what</Text>
        {ledger === undefined ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
        ) : students?.length === 0 ? (
          <Text style={{ color: colors.textSecondary }}>Add a student to start tracking payments.</Text>
        ) : (
          ledger.map((row) => (
            <TouchableOpacity
              key={row.student_id}
              style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => navigation.navigate('StudentLedger', { studentId: row.student_id })}
            >
              <View style={{ flex: 1 }}>
                <Text style={[s.cardTitle, { color: colors.text }]}>{row.student_name}</Text>
              </View>
              <Text style={{ color: row.balance_zar > 0 ? '#E67E22' : colors.textSecondary, fontWeight: '900' }}>
                {row.balance_zar > 0 ? `Owes R${row.balance_zar}` : 'Paid up'}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, height: 52 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '900' },
  body: { padding: 16, paddingBottom: 60 },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  action: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 13, paddingVertical: 13 },
  actionText: { color: '#fff', fontWeight: '900' },
  sectionTitle: { fontSize: 18, fontWeight: '900', marginTop: 22, marginBottom: 10 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, padding: 13, marginBottom: 9 },
  cardIcon: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '900' },
});
