import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';

const STATUS_COLOR: Record<string, string> = { assigned: '#4D96FF', submitted: '#E67E22', marked: '#00A86B' };

export default function HomeworkListScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const sessionId = useAuthStore((s) => s.sessionId)! as Id<'sessions'>;

  const myTutorProfile = useQuery(api.eduBookings.myTutorProfile, { sessionId });
  const isTutor = !!myTutorProfile;
  const tutorHomework = useQuery(api.eduHomework.listHomeworkForTutor, isTutor ? { sessionId } : 'skip');
  const studentHomework = useQuery(api.eduHomework.listHomeworkForStudent, !isTutor ? { sessionId } : 'skip');
  const homework = isTutor ? tutorHomework : studentHomework;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.text }]}>Homework</Text>
        <View style={s.backBtn} />
      </View>

      <FlatList
        data={homework ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => navigation.navigate('HomeworkDetail', { assignmentId: item.id })}>
            <View style={{ flex: 1 }}>
              <Text style={[s.cardTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={{ color: colors.textSecondary }} numberOfLines={1}>{isTutor ? item.student_name : item.tutor_name}{item.subject_code ? ` · ${item.subject_code}` : ''}</Text>
            </View>
            <Text style={{ color: STATUS_COLOR[item.status] ?? colors.textSecondary, fontWeight: '900', textTransform: 'capitalize' }}>{item.status}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={homework === undefined ? <ActivityIndicator color={colors.accent} style={{ marginTop: 30 }} /> : (
          <View style={s.empty}>
            <Ionicons name="document-text-outline" size={42} color={colors.textMuted} />
            <Text style={{ color: colors.textSecondary }}>No homework yet.</Text>
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
  list: { padding: 16, paddingBottom: 60 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '900' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
});
