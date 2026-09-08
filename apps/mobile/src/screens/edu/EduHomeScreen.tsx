import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Linking, Modal, SafeAreaView, ScrollView,
  Share, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';

type EduTab = 'papers' | 'notes' | 'tutors' | 'help';

export default function EduHomeScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const sessionId = useAuthStore((state) => state.sessionId)! as Id<'sessions'>;
  const myTutorProfile = useQuery(api.eduBookings.myTutorProfile, { sessionId });
  const myBookings = useQuery(api.eduBookings.listMyBookings, { sessionId });
  const [tab, setTab] = useState<EduTab>('papers');
  const [grade, setGrade] = useState(12);
  const [search, setSearch] = useState('');
  const [subjectId, setSubjectId] = useState<Id<'eduSubjects'> | undefined>();
  const [paper, setPaper] = useState<any | null>(null);
  const [note, setNote] = useState<any | null>(null);
  const [questionOpen, setQuestionOpen] = useState(false);
  const [questionTitle, setQuestionTitle] = useState('');
  const [questionBody, setQuestionBody] = useState('');

  const subjects = useQuery(api.edu.listSubjects, { sessionId, grade });
  const papers = useQuery(api.edu.listPapers, { sessionId, grade, subjectId, search: search || undefined });
  const notes = useQuery(api.eduNotes.listNotes, { sessionId, grade, search: search || undefined });
  const tutors = useQuery(api.eduTutors.listTutors, { sessionId, grade, search: search || undefined });
  const helpPosts = useQuery(api.eduHelp.listPosts, { sessionId, grade, search: search || undefined, filter: 'all' });
  const stats = useQuery(api.edu.getStats, { sessionId, grade });
  const recordRecent = useMutation(api.edu.recordRecentView);
  const requestTutor = useMutation(api.eduTutors.requestTutor);
  const createQuestion = useMutation(api.eduHelp.createPost);

  const selectedSubject = useMemo(
    () => subjects?.find((subject) => subject.id === subjectId),
    [subjects, subjectId],
  );

  function changeGrade(next: number) {
    setGrade(next);
    setSubjectId(undefined);
  }

  async function openPaper(item: any) {
    if (!item.pdf_url) {
      Alert.alert('Paper source pending', 'This paper is catalogued, but its verified DBE download link still needs to be attached.');
      return;
    }
    await recordRecent({ sessionId, itemType: 'paper', itemId: item.id, title: item.subject_name, subtitle: `${item.year} ${item.session ?? ''}`.trim() });
    setPaper(item);
  }

  async function contactTutor(tutorId: string) {
    try {
      const result = await requestTutor({ sessionId, tutorId: tutorId as Id<'eduTutors'> });
      Alert.alert(result.already_requested ? 'Already requested' : 'Request sent', result.already_requested ? 'Your request is already waiting for a response.' : 'The tutor request has been recorded.');
    } catch (error) {
      Alert.alert('Could not send request', error instanceof Error ? error.message : 'Try again.');
    }
  }

  async function submitQuestion() {
    const subject = selectedSubject ?? subjects?.[0];
    if (!subject) return Alert.alert('Choose a subject', 'Select a subject before posting a question.');
    try {
      await createQuestion({ sessionId, grade, subjectCode: subject.code, subjectName: subject.name, title: questionTitle, body: questionBody });
      setQuestionTitle(''); setQuestionBody(''); setQuestionOpen(false);
    } catch (error) {
      Alert.alert('Could not post question', error instanceof Error ? error.message : 'Try again.');
    }
  }

  const data = tab === 'papers' ? papers : tab === 'notes' ? notes : tab === 'tutors' ? tutors : helpPosts;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]}>
      <FlatList
        data={data ?? []}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={s.list}
        ListHeaderComponent={(
          <>
            <View style={s.header}>
              <View><Text style={[s.brand, { color: colors.text }]}>Connex <Text style={{ color: colors.accent }}>Edu</Text></Text><Text style={{ color: colors.textSecondary }}>Learn, revise, achieve.</Text></View>
              {tab === 'help' && <TouchableOpacity style={[s.askButton, { backgroundColor: colors.accent }]} onPress={() => setQuestionOpen(true)}><Ionicons name="add" size={20} color="#fff" /><Text style={s.askText}>Ask</Text></TouchableOpacity>}
            </View>
            {myTutorProfile ? (
              <TouchableOpacity style={[s.tutoringBanner, { backgroundColor: colors.accent }]} onPress={() => navigation.navigate('TutorDashboard')}>
                <Ionicons name="school" size={20} color="#fff" />
                <Text style={s.tutoringBannerText}>My Tutoring Dashboard</Text>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </TouchableOpacity>
            ) : myBookings && myBookings.length > 0 ? (
              <TouchableOpacity style={[s.tutoringBanner, { backgroundColor: colors.accent }]} onPress={() => navigation.navigate('MyBookings')}>
                <Ionicons name="calendar" size={20} color="#fff" />
                <Text style={s.tutoringBannerText}>My Lessons & Homework</Text>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </TouchableOpacity>
            ) : null}
            <View style={s.gradeRow}>{[10, 11, 12].map((item) => <TouchableOpacity key={item} onPress={() => changeGrade(item)} style={[s.grade, { borderColor: colors.border }, grade === item && { backgroundColor: colors.accent, borderColor: colors.accent }]}><Text style={{ color: grade === item ? '#fff' : colors.textSecondary, fontWeight: '800' }}>Grade {item}</Text></TouchableOpacity>)}</View>
            <View style={[s.search, { backgroundColor: colors.surface }]}><Ionicons name="search" size={18} color={colors.textMuted} /><TextInput value={search} onChangeText={setSearch} placeholder={`Search ${tab}`} placeholderTextColor={colors.textMuted} style={{ flex: 1, color: colors.text, fontSize: 15 }} /></View>
            <View style={[s.stats, { backgroundColor: colors.surface }]}>
              <Stat value={stats?.question_papers ?? 0} label="Papers" color={colors.text} muted={colors.textSecondary} />
              <Stat value={stats?.notes ?? 0} label="Notes" color={colors.text} muted={colors.textSecondary} />
              <Stat value={stats?.tutors ?? 0} label="Tutors" color={colors.text} muted={colors.textSecondary} />
              <Stat value={stats?.open_questions ?? 0} label="Questions" color={colors.text} muted={colors.textSecondary} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
              {(['papers', 'notes', 'tutors', 'help'] as EduTab[]).map((item) => <TouchableOpacity key={item} onPress={() => setTab(item)} style={[s.tab, { borderColor: colors.border }, tab === item && { backgroundColor: colors.accent, borderColor: colors.accent }]}><Ionicons name={item === 'papers' ? 'document-text' : item === 'notes' ? 'book' : item === 'tutors' ? 'school' : 'help-circle'} size={17} color={tab === item ? '#fff' : colors.textSecondary} /><Text style={{ color: tab === item ? '#fff' : colors.textSecondary, textTransform: 'capitalize', fontWeight: '800' }}>{item}</Text></TouchableOpacity>)}
            </ScrollView>
            {(tab === 'papers' || tab === 'help') && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.subjects}><TouchableOpacity onPress={() => setSubjectId(undefined)} style={[s.subject, !subjectId && { backgroundColor: colors.accent }]}><Text style={{ color: !subjectId ? '#fff' : colors.textSecondary }}>All subjects</Text></TouchableOpacity>{subjects?.map((subject) => <TouchableOpacity key={subject.id} onPress={() => setSubjectId(subject.id as Id<'eduSubjects'>)} style={[s.subject, subjectId === subject.id && { backgroundColor: colors.accent }]}><Text style={{ color: subjectId === subject.id ? '#fff' : colors.textSecondary }}>{subject.name}</Text></TouchableOpacity>)}</ScrollView>}
            <Text style={[s.sectionTitle, { color: colors.text }]}>{tab === 'papers' ? selectedSubject?.name ?? 'Question papers' : tab === 'notes' ? 'Study notes' : tab === 'tutors' ? 'Find a tutor' : 'Learner help board'}</Text>
          </>
        )}
        renderItem={({ item }: { item: any }) => tab === 'papers' ? (
          <TouchableOpacity style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => openPaper(item)}>
            <View style={[s.cardIcon, { backgroundColor: item.pdf_url ? '#00A86B22' : '#E67E2222' }]}><Ionicons name={item.paper_type === 'memorandum' ? 'checkmark-done' : 'document-text'} size={23} color={item.pdf_url ? colors.accent : '#E67E22'} /></View>
            <View style={{ flex: 1 }}><Text style={[s.cardTitle, { color: colors.text }]}>{item.subject_name}</Text><Text style={{ color: colors.textSecondary }}>{item.year} · {item.session ?? 'Session unknown'}{item.paper_number ? ` · Paper ${item.paper_number}` : ''}</Text><Text style={{ color: item.pdf_url ? colors.accent : '#E67E22', fontSize: 12, marginTop: 3 }}>{item.pdf_url ? (item.paper_type ?? 'question paper').replace('_', ' ') : 'Source link pending'}</Text></View><Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ) : tab === 'notes' ? (
          <TouchableOpacity style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setNote(item)}><View style={[s.cardIcon, { backgroundColor: '#4D96FF22' }]}><Ionicons name="book" size={22} color="#4D96FF" /></View><View style={{ flex: 1 }}><Text style={[s.cardTitle, { color: colors.text }]}>{item.title}</Text><Text style={{ color: colors.textSecondary }}>{item.subject_name} · {item.topic}</Text></View><Ionicons name="chevron-forward" size={20} color={colors.textMuted} /></TouchableOpacity>
        ) : tab === 'tutors' ? (
          <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[s.cardIcon, { backgroundColor: item.avatar_color ?? colors.avatarBg }]}><Text style={s.tutorLetter}>{item.name.charAt(0)}</Text></View><View style={{ flex: 1 }}><Text style={[s.cardTitle, { color: colors.text }]}>{item.name} {item.verified ? '✓' : ''}</Text><Text style={{ color: colors.textSecondary }} numberOfLines={2}>{item.bio}</Text><Text style={{ color: colors.accent, marginTop: 4 }}>{item.hourly_rate_zar ? `R${item.hourly_rate_zar}/hour` : 'Community tutor · Free'}</Text></View><TouchableOpacity style={[s.contact, { borderColor: colors.accent }]} onPress={() => contactTutor(item.id)}><Text style={{ color: colors.accent, fontWeight: '800' }}>{item.requested ? 'Requested' : 'Contact'}</Text></TouchableOpacity></View>
        ) : (
          <View style={[s.helpCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={s.helpMeta}><Text style={{ color: colors.accent, fontWeight: '800' }}>{item.subject_name}</Text><Text style={{ color: colors.textMuted }}>{item.status}</Text></View><Text style={[s.cardTitle, { color: colors.text, marginTop: 8 }]}>{item.title}</Text><Text style={{ color: colors.textSecondary, marginTop: 6 }} numberOfLines={3}>{item.body}</Text><View style={s.helpMeta}><Text style={{ color: colors.textMuted }}>{item.replies_count} replies</Text><Text style={{ color: colors.textMuted }}>{item.upvotes} upvotes</Text></View></View>
        )}
        ListEmptyComponent={data === undefined ? <ActivityIndicator color={colors.accent} style={{ marginTop: 30 }} /> : <View style={s.empty}><Ionicons name="file-tray-outline" size={42} color={colors.textMuted} /><Text style={[s.cardTitle, { color: colors.text }]}>No {tab} found</Text><Text style={{ color: colors.textSecondary, textAlign: 'center' }}>Try another grade, subject, or search.</Text></View>}
      />

      <Modal visible={!!paper} animationType="slide" onRequestClose={() => setPaper(null)}>
        <SafeAreaView style={[s.root, { backgroundColor: colors.background }]}><View style={[s.viewerHeader, { borderBottomColor: colors.border }]}><TouchableOpacity style={s.viewerButton} onPress={() => setPaper(null)}><Ionicons name="close" size={25} color={colors.text} /></TouchableOpacity><Text numberOfLines={1} style={[s.viewerTitle, { color: colors.text }]}>{paper?.subject_name}</Text><TouchableOpacity style={s.viewerButton} onPress={() => paper?.pdf_url && Share.share({ url: paper.pdf_url, message: paper.pdf_url })}><Ionicons name="share-outline" size={22} color={colors.text} /></TouchableOpacity><TouchableOpacity style={s.viewerButton} onPress={() => paper?.pdf_url && Linking.openURL(paper.pdf_url)}><Ionicons name="open-outline" size={22} color={colors.text} /></TouchableOpacity></View>{paper?.pdf_url && <WebView source={{ uri: paper.pdf_url }} style={{ flex: 1 }} startInLoadingState renderLoading={() => <ActivityIndicator color={colors.accent} style={StyleSheet.absoluteFill} />} />}</SafeAreaView>
      </Modal>
      <Modal visible={!!note} animationType="slide" onRequestClose={() => setNote(null)}><SafeAreaView style={[s.root, { backgroundColor: colors.background }]}><View style={[s.viewerHeader, { borderBottomColor: colors.border }]}><TouchableOpacity style={s.viewerButton} onPress={() => setNote(null)}><Ionicons name="close" size={25} color={colors.text} /></TouchableOpacity><Text style={[s.viewerTitle, { color: colors.text }]} numberOfLines={1}>{note?.title}</Text><View style={s.viewerButton} /></View><ScrollView contentContainerStyle={s.noteBody}><Text style={[s.noteTitle, { color: colors.text }]}>{note?.title}</Text><Text style={{ color: colors.accent, marginBottom: 20 }}>{note?.subject_name} · {note?.topic}</Text><Text style={[s.noteText, { color: colors.textSecondary }]}>{note?.content}</Text></ScrollView></SafeAreaView></Modal>
      <Modal visible={questionOpen} transparent animationType="fade" onRequestClose={() => setQuestionOpen(false)}><View style={s.backdrop}><View style={[s.questionCard, { backgroundColor: colors.surface }]}><Text style={[s.noteTitle, { color: colors.text }]}>Ask the community</Text><TextInput value={questionTitle} onChangeText={setQuestionTitle} placeholder="Question title" placeholderTextColor={colors.textMuted} style={[s.input, { borderColor: colors.border, color: colors.text }]} /><TextInput value={questionBody} onChangeText={setQuestionBody} placeholder="Describe what you need help with" placeholderTextColor={colors.textMuted} multiline style={[s.input, s.bodyInput, { borderColor: colors.border, color: colors.text }]} /><View style={s.questionActions}><TouchableOpacity onPress={() => setQuestionOpen(false)}><Text style={{ color: colors.textSecondary }}>Cancel</Text></TouchableOpacity><TouchableOpacity onPress={submitQuestion}><Text style={{ color: colors.accent, fontWeight: '900' }}>Post question</Text></TouchableOpacity></View></View></View></Modal>
    </SafeAreaView>
  );
}

function Stat({ value, label, color, muted }: { value: number; label: string; color: string; muted: string }) { return <View style={{ alignItems: 'center' }}><Text style={{ color, fontWeight: '900', fontSize: 18 }}>{value}</Text><Text style={{ color: muted, fontSize: 11 }}>{label}</Text></View>; }

const s = StyleSheet.create({
  root: { flex: 1 }, list: { paddingHorizontal: 16, paddingBottom: 130 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 15, paddingBottom: 13 }, brand: { fontSize: 27, fontWeight: '900' }, askButton: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 }, askText: { color: '#fff', fontWeight: '900' },
  tutoringBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 12 }, tutoringBannerText: { flex: 1, color: '#fff', fontWeight: '900', fontSize: 15 },
  gradeRow: { flexDirection: 'row', gap: 8 }, grade: { flex: 1, borderWidth: 1, borderRadius: 12, alignItems: 'center', paddingVertical: 10 }, search: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 13, paddingVertical: 11, borderRadius: 12, marginTop: 12 },
  stats: { flexDirection: 'row', justifyContent: 'space-around', borderRadius: 14, paddingVertical: 13, marginTop: 12 }, tabs: { gap: 8, paddingVertical: 12 }, tab: { flexDirection: 'row', gap: 6, alignItems: 'center', borderWidth: 1, borderRadius: 18, paddingHorizontal: 13, paddingVertical: 8 }, subjects: { gap: 7, paddingBottom: 12 }, subject: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 15 }, sectionTitle: { fontSize: 20, fontWeight: '900', marginBottom: 11 },
  card: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 15, padding: 13, marginBottom: 10 }, cardIcon: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, cardTitle: { fontSize: 15, fontWeight: '900' }, tutorLetter: { color: '#fff', fontSize: 19, fontWeight: '900' }, contact: { borderWidth: 1, borderRadius: 15, paddingHorizontal: 10, paddingVertical: 7 },
  helpCard: { borderWidth: 1, borderRadius: 15, padding: 14, marginBottom: 10 }, helpMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }, empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  viewerHeader: { height: 56, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center' }, viewerButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }, viewerTitle: { flex: 1, fontSize: 16, fontWeight: '900' }, noteBody: { padding: 22 }, noteTitle: { fontSize: 22, fontWeight: '900' }, noteText: { fontSize: 16, lineHeight: 25 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 20 }, questionCard: { borderRadius: 18, padding: 18, gap: 13 }, input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11 }, bodyInput: { minHeight: 120, textAlignVertical: 'top' }, questionActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 22, marginTop: 4 },
});
