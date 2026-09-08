import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import type { EduStackParams } from '../../navigation';

type RouteType = RouteProp<EduStackParams, 'MarkHomework'>;

export default function MarkHomeworkScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteType>();
  const { assignmentId } = route.params;
  const { colors } = useTheme();
  const sessionId = useAuthStore((s) => s.sessionId)! as Id<'sessions'>;

  const detail = useQuery(api.eduHomework.getHomeworkDetail, { sessionId, assignmentId: assignmentId as Id<'homeworkAssignments'> });
  const markHomework = useMutation(api.eduHomework.markHomework);

  const [score, setScore] = useState('');
  const [max, setMax] = useState('10');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!score || !max) return Alert.alert('Enter a score', 'Add a score out of the total marks.');
    setSaving(true);
    try {
      await markHomework({
        sessionId,
        assignmentId: assignmentId as Id<'homeworkAssignments'>,
        markScore: Number(score),
        markMax: Number(max),
        markFeedback: feedback || undefined,
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert('Could not save mark', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  }

  if (detail === undefined) {
    return <SafeAreaView style={[s.root, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} /></SafeAreaView>;
  }
  if (!detail?.submission) return null;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.text }]} numberOfLines={1}>Mark: {detail.title}</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.body}>
        <Text style={{ color: colors.textSecondary }}>{detail.student_name}</Text>
        {detail.submission.text_answer && <Text style={{ color: colors.text, marginTop: 12 }}>{detail.submission.text_answer}</Text>}
        {detail.submission.file_url && (
          <TouchableOpacity style={[s.attachment, { borderColor: colors.border }]} onPress={() => Linking.openURL(detail.submission!.file_url!)}>
            <Ionicons name="image" size={20} color={colors.accent} />
            <Text style={{ color: colors.accent, fontWeight: '800' }}>View submitted file</Text>
          </TouchableOpacity>
        )}

        <Text style={[s.label, { color: colors.textSecondary }]}>Score</Text>
        <View style={s.scoreRow}>
          <TextInput value={score} onChangeText={setScore} placeholder="e.g. 8" keyboardType="numeric" placeholderTextColor={colors.textMuted} style={[s.input, s.scoreInput, { borderColor: colors.border, color: colors.text }]} />
          <Text style={{ color: colors.textSecondary, fontSize: 18, fontWeight: '800' }}>/</Text>
          <TextInput value={max} onChangeText={setMax} placeholder="10" keyboardType="numeric" placeholderTextColor={colors.textMuted} style={[s.input, s.scoreInput, { borderColor: colors.border, color: colors.text }]} />
        </View>

        <Text style={[s.label, { color: colors.textSecondary }]}>Feedback (optional)</Text>
        <TextInput
          value={feedback}
          onChangeText={setFeedback}
          placeholder="What did they do well? What to improve?"
          placeholderTextColor={colors.textMuted}
          multiline
          style={[s.input, s.multiline, { borderColor: colors.border, color: colors.text }]}
        />

        <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.accent }, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
          <Text style={s.saveBtnText}>{saving ? 'Saving...' : 'Save mark'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, height: 52 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '900', paddingHorizontal: 8 },
  body: { padding: 20, paddingBottom: 60 },
  attachment: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 14 },
  label: { fontWeight: '800', marginTop: 18, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 13 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scoreInput: { flex: 1, textAlign: 'center' },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  saveBtn: { borderRadius: 14, alignItems: 'center', paddingVertical: 15, marginTop: 30 },
  saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
});
