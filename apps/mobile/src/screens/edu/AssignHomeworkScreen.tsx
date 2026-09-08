import React, { useState } from 'react';
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

type RouteType = RouteProp<EduStackParams, 'AssignHomework'>;

export default function AssignHomeworkScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteType>();
  const { colors } = useTheme();
  const sessionId = useAuthStore((s) => s.sessionId)! as Id<'sessions'>;

  const students = useQuery(api.eduBookings.listMyStudents, { sessionId });
  const assignHomework = useMutation(api.eduHomework.assignHomework);

  const [studentId, setStudentId] = useState<string | undefined>(route.params?.studentId);
  const [subjectCode, setSubjectCode] = useState('');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!studentId) return Alert.alert('Choose a student', 'Select which student this is for.');
    if (!title.trim() || !instructions.trim()) return Alert.alert('Missing details', 'Add a title and instructions.');
    setSaving(true);
    try {
      await assignHomework({
        sessionId,
        studentId: studentId as Id<'tutorStudents'>,
        subjectCode: subjectCode || undefined,
        title,
        instructions,
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert('Could not assign homework', error instanceof Error ? error.message : 'Try again.');
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
        <Text style={[s.title, { color: colors.text }]}>Assign homework</Text>
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

        <Text style={[s.label, { color: colors.textSecondary }]}>Subject (optional)</Text>
        <TextInput value={subjectCode} onChangeText={setSubjectCode} placeholder="e.g. mathematics" placeholderTextColor={colors.textMuted} style={[s.input, { borderColor: colors.border, color: colors.text }]} />

        <Text style={[s.label, { color: colors.textSecondary }]}>Title</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Algebra worksheet 3" placeholderTextColor={colors.textMuted} style={[s.input, { borderColor: colors.border, color: colors.text }]} />

        <Text style={[s.label, { color: colors.textSecondary }]}>Instructions</Text>
        <TextInput
          value={instructions}
          onChangeText={setInstructions}
          placeholder="What should the student do?"
          placeholderTextColor={colors.textMuted}
          multiline
          style={[s.input, s.multiline, { borderColor: colors.border, color: colors.text }]}
        />

        <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.accent }, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
          <Text style={s.saveBtnText}>{saving ? 'Assigning...' : 'Assign homework'}</Text>
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
  multiline: { minHeight: 110, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 15, paddingHorizontal: 13, paddingVertical: 9 },
  saveBtn: { borderRadius: 14, alignItems: 'center', paddingVertical: 15, marginTop: 30 },
  saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
});
