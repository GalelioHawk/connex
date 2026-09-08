import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import type { EduStackParams } from '../../navigation';
import dayjs from 'dayjs';

type RouteType = RouteProp<EduStackParams, 'HomeworkDetail'>;

export default function HomeworkDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteType>();
  const { assignmentId } = route.params;
  const { colors } = useTheme();
  const sessionId = useAuthStore((s) => s.sessionId)! as Id<'sessions'>;

  const detail = useQuery(api.eduHomework.getHomeworkDetail, { sessionId, assignmentId: assignmentId as Id<'homeworkAssignments'> });
  const generateUploadUrl = useMutation(api.eduHomework.generateHomeworkUploadUrl);
  const submitHomework = useMutation(api.eduHomework.submitHomework);

  const [textAnswer, setTextAnswer] = useState('');
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function pickFile() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!result.canceled && result.assets[0]) setPickedUri(result.assets[0].uri);
  }

  async function submit() {
    if (!pickedUri && !textAnswer.trim()) {
      return Alert.alert('Add something', 'Attach a photo of your work or type an answer.');
    }
    setSubmitting(true);
    try {
      let storageId: string | undefined;
      if (pickedUri) {
        const uploadUrl = await generateUploadUrl({ sessionId });
        const response = await fetch(pickedUri);
        const blob = await response.blob();
        const uploadRes = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': blob.type || 'image/jpeg' }, body: blob });
        if (!uploadRes.ok) throw new Error('Upload failed');
        ({ storageId } = await uploadRes.json());
      }
      await submitHomework({
        sessionId,
        assignmentId: assignmentId as Id<'homeworkAssignments'>,
        storageId: storageId as Id<'_storage'> | undefined,
        textAnswer: textAnswer || undefined,
      });
      setPickedUri(null);
      setTextAnswer('');
    } catch (error) {
      Alert.alert('Could not submit', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (detail === undefined) {
    return <SafeAreaView style={[s.root, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} /></SafeAreaView>;
  }
  if (!detail) return null;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.text }]} numberOfLines={1}>{detail.title}</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.body}>
        <Text style={{ color: colors.textSecondary }}>{detail.is_tutor ? detail.student_name : detail.tutor_name}{detail.subject_code ? ` · ${detail.subject_code}` : ''}</Text>
        {detail.due_at && <Text style={{ color: colors.textMuted, marginTop: 2 }}>Due {dayjs(detail.due_at).format('D MMM, HH:mm')}</Text>}
        <Text style={[s.instructions, { color: colors.text }]}>{detail.instructions}</Text>
        {detail.attachment_url && (
          <TouchableOpacity style={[s.attachment, { borderColor: colors.border }]} onPress={() => Linking.openURL(detail.attachment_url!)}>
            <Ionicons name="document-attach" size={20} color={colors.accent} />
            <Text style={{ color: colors.accent, fontWeight: '800' }}>View attachment</Text>
          </TouchableOpacity>
        )}

        {detail.submission ? (
          <View style={[s.submissionBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Submission</Text>
            <Text style={{ color: colors.textSecondary }}>Submitted {dayjs(detail.submission.submitted_at).format('D MMM, HH:mm')}</Text>
            {detail.submission.text_answer && <Text style={{ color: colors.text, marginTop: 8 }}>{detail.submission.text_answer}</Text>}
            {detail.submission.file_url && (
              <TouchableOpacity style={[s.attachment, { borderColor: colors.border }]} onPress={() => Linking.openURL(detail.submission!.file_url!)}>
                <Ionicons name="image" size={20} color={colors.accent} />
                <Text style={{ color: colors.accent, fontWeight: '800' }}>View submitted file</Text>
              </TouchableOpacity>
            )}
            {detail.submission.marked_at ? (
              <View style={{ marginTop: 12 }}>
                <Text style={[s.sectionTitle, { color: colors.text }]}>Mark: {detail.submission.mark_score}/{detail.submission.mark_max}</Text>
                {detail.submission.mark_feedback && <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{detail.submission.mark_feedback}</Text>}
              </View>
            ) : detail.is_tutor ? (
              <TouchableOpacity style={[s.markBtn, { backgroundColor: colors.accent }]} onPress={() => navigation.navigate('MarkHomework', { assignmentId })}>
                <Text style={s.markBtnText}>Mark this submission</Text>
              </TouchableOpacity>
            ) : (
              <Text style={{ color: colors.textMuted, marginTop: 8 }}>Waiting to be marked.</Text>
            )}
          </View>
        ) : !detail.is_tutor ? (
          <View style={s.submitForm}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Submit your work</Text>
            <TextInput
              value={textAnswer}
              onChangeText={setTextAnswer}
              placeholder="Type your answer (optional if attaching a photo)"
              placeholderTextColor={colors.textMuted}
              multiline
              style={[s.input, { borderColor: colors.border, color: colors.text }]}
            />
            <TouchableOpacity style={[s.attachBtn, { borderColor: colors.border }]} onPress={pickFile}>
              <Ionicons name="camera" size={18} color={colors.text} />
              <Text style={{ color: colors.text, fontWeight: '800' }}>{pickedUri ? 'Photo attached' : 'Attach a photo'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.submitBtn, { backgroundColor: colors.accent }, submitting && { opacity: 0.6 }]} onPress={submit} disabled={submitting}>
              <Text style={s.submitBtnText}>{submitting ? 'Submitting...' : 'Submit homework'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={{ color: colors.textMuted, marginTop: 20 }}>Not submitted yet.</Text>
        )}
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
  instructions: { fontSize: 16, lineHeight: 23, marginTop: 14 },
  attachment: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '900' },
  submissionBox: { borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 24 },
  submitForm: { marginTop: 24, gap: 12 },
  input: { borderWidth: 1, borderRadius: 12, padding: 13, minHeight: 90, textAlignVertical: 'top' },
  attachBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingVertical: 12 },
  submitBtn: { borderRadius: 14, alignItems: 'center', paddingVertical: 15 },
  submitBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  markBtn: { borderRadius: 12, alignItems: 'center', paddingVertical: 12, marginTop: 12 },
  markBtnText: { color: '#fff', fontWeight: '900' },
});
