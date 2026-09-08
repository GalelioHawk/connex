import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import type { EduStackParams } from '../../navigation';
import dayjs from 'dayjs';

const DAY_OPTIONS = Array.from({ length: 10 }, (_, i) => dayjs().add(i, 'day'));
const TIME_OPTIONS = Array.from({ length: 28 }, (_, i) => {
  const totalMinutes = 7 * 60 + i * 30; // 07:00 -> 20:30
  return { hour: Math.floor(totalMinutes / 60), minute: totalMinutes % 60 };
});

type RouteType = RouteProp<EduStackParams, 'CreateBooking'>;

export default function CreateBookingScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteType>();
  const { colors } = useTheme();
  const sessionId = useAuthStore((s) => s.sessionId)! as Id<'sessions'>;

  const students = useQuery(api.eduBookings.listMyStudents, { sessionId });
  const createBooking = useMutation(api.eduBookings.createBooking);

  const [studentId, setStudentId] = useState<string | undefined>(route.params?.studentId);
  const [subjectCode, setSubjectCode] = useState('');
  const [dayIndex, setDayIndex] = useState(0);
  const [time, setTime] = useState(TIME_OPTIONS[6]); // 10:00 default
  const [duration, setDuration] = useState(60);
  const [mode, setMode] = useState<'online' | 'in_person'>('online');
  const [saving, setSaving] = useState(false);

  const scheduledAt = useMemo(
    () => DAY_OPTIONS[dayIndex].hour(time.hour).minute(time.minute).second(0).millisecond(0),
    [dayIndex, time],
  );

  async function save() {
    if (!studentId) return Alert.alert('Choose a student', 'Select which student this lesson is for.');
    setSaving(true);
    try {
      await createBooking({
        sessionId,
        studentId: studentId as Id<'tutorStudents'>,
        subjectCode: subjectCode || undefined,
        scheduledAt: scheduledAt.valueOf(),
        durationMinutes: duration,
        mode,
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert('Could not create booking', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.text }]}>Schedule lesson</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.body}>
        <Text style={[s.label, { color: colors.textSecondary }]}>Student</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
          {students?.map((st) => (
            <TouchableOpacity key={st.id} onPress={() => setStudentId(st.id)} style={[s.chip, { borderColor: colors.border }, studentId === st.id && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
              <Text style={{ color: studentId === st.id ? '#fff' : colors.textSecondary, fontWeight: '800' }}>{st.display_name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {students?.length === 0 && <Text style={{ color: colors.textMuted }}>Add a student first from "My students".</Text>}

        <Text style={[s.label, { color: colors.textSecondary }]}>Subject (optional)</Text>
        <TextInput value={subjectCode} onChangeText={setSubjectCode} placeholder="e.g. mathematics" placeholderTextColor={colors.textMuted} style={[s.input, { borderColor: colors.border, color: colors.text }]} />

        <Text style={[s.label, { color: colors.textSecondary }]}>Day</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
          {DAY_OPTIONS.map((d, i) => (
            <TouchableOpacity key={i} onPress={() => setDayIndex(i)} style={[s.chip, { borderColor: colors.border }, dayIndex === i && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
              <Text style={{ color: dayIndex === i ? '#fff' : colors.textSecondary, fontWeight: '800' }}>{i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.format('ddd D MMM')}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[s.label, { color: colors.textSecondary }]}>Time</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
          {TIME_OPTIONS.map((t, i) => {
            const active = t.hour === time.hour && t.minute === time.minute;
            const label = `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
            return (
              <TouchableOpacity key={i} onPress={() => setTime(t)} style={[s.chip, { borderColor: colors.border }, active && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
                <Text style={{ color: active ? '#fff' : colors.textSecondary, fontWeight: '800' }}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={[s.label, { color: colors.textSecondary }]}>Duration</Text>
        <View style={s.chipRow}>
          {[30, 45, 60, 90].map((mins) => (
            <TouchableOpacity key={mins} onPress={() => setDuration(mins)} style={[s.chip, { borderColor: colors.border }, duration === mins && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
              <Text style={{ color: duration === mins ? '#fff' : colors.textSecondary, fontWeight: '800' }}>{mins}min</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[s.label, { color: colors.textSecondary }]}>Mode</Text>
        <View style={s.chipRow}>
          {(['online', 'in_person'] as const).map((m) => (
            <TouchableOpacity key={m} onPress={() => setMode(m)} style={[s.chip, { borderColor: colors.border }, mode === m && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
              <Text style={{ color: mode === m ? '#fff' : colors.textSecondary, fontWeight: '800' }}>{m === 'online' ? 'Online' : 'In-person'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={{ color: colors.textSecondary, marginTop: 18 }}>{scheduledAt.format('dddd D MMMM, HH:mm')}</Text>

        <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.accent }, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
          <Text style={s.saveBtnText}>{saving ? 'Saving...' : 'Schedule lesson'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, height: 52 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '900' },
  body: { padding: 20, paddingBottom: 60 },
  label: { fontWeight: '800', marginTop: 18, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 13 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 15, paddingHorizontal: 13, paddingVertical: 9 },
  saveBtn: { borderRadius: 14, alignItems: 'center', paddingVertical: 15, marginTop: 30 },
  saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
});
