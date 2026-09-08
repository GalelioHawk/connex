import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';

export default function StudentRosterScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const sessionId = useAuthStore((s) => s.sessionId)! as Id<'sessions'>;

  const students = useQuery(api.eduBookings.listMyStudents, { sessionId });
  const addStudent = useMutation(api.eduBookings.addStudent);
  const updateStudent = useMutation(api.eduBookings.updateStudent);

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [fee, setFee] = useState('500');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return Alert.alert('Name required', 'Enter the student\'s name.');
    setSaving(true);
    try {
      await addStudent({
        sessionId,
        displayName: name,
        contactPhone: phone || undefined,
        monthlyFeeZar: fee ? Number(fee) : undefined,
      });
      setName(''); setPhone(''); setFee('500'); setModalOpen(false);
    } catch (error) {
      Alert.alert('Could not add student', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  }

  async function togglePause(id: string, status: string) {
    await updateStudent({ sessionId, studentId: id as Id<'tutorStudents'>, status: status === 'active' ? 'paused' : 'active' });
  }

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.text }]}>My students</Text>
        <TouchableOpacity onPress={() => setModalOpen(true)} style={s.backBtn}>
          <Ionicons name="add" size={26} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={students ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.cardTitle, { color: colors.text }]}>{item.display_name}</Text>
              <Text style={{ color: colors.textSecondary }}>
                {item.monthly_fee_zar ? `R${item.monthly_fee_zar}/month` : 'No fee set'}{item.contact_phone ? ` · ${item.contact_phone}` : ''}
              </Text>
            </View>
            <View style={s.rowActions}>
              <TouchableOpacity onPress={() => navigation.navigate('CreateBooking', { studentId: item.id })} style={s.iconBtn}>
                <Ionicons name="calendar-outline" size={20} color={colors.accent} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('AssignHomework', { studentId: item.id })} style={s.iconBtn}>
                <Ionicons name="document-text-outline" size={20} color={colors.accent} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('StudentLedger', { studentId: item.id })} style={s.iconBtn}>
                <Ionicons name="wallet-outline" size={20} color={colors.accent} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => togglePause(item.id, item.status)} style={s.iconBtn}>
                <Ionicons name={item.status === 'active' ? 'pause-circle-outline' : 'play-circle-outline'} size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={students === undefined ? <ActivityIndicator color={colors.accent} style={{ marginTop: 30 }} /> : (
          <View style={s.empty}>
            <Ionicons name="people-outline" size={42} color={colors.textMuted} />
            <Text style={{ color: colors.textSecondary }}>No students yet. Tap + to add one.</Text>
          </View>
        )}
      />

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <View style={s.backdrop}>
          <View style={[s.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>Add a student</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Student name" placeholderTextColor={colors.textMuted} style={[s.input, { borderColor: colors.border, color: colors.text }]} />
            <TextInput value={phone} onChangeText={setPhone} placeholder="Contact number (optional)" placeholderTextColor={colors.textMuted} style={[s.input, { borderColor: colors.border, color: colors.text }]} />
            <TextInput value={fee} onChangeText={setFee} placeholder="Monthly fee (ZAR)" keyboardType="numeric" placeholderTextColor={colors.textMuted} style={[s.input, { borderColor: colors.border, color: colors.text }]} />
            <View style={s.modalActions}>
              <TouchableOpacity onPress={() => setModalOpen(false)}><Text style={{ color: colors.textSecondary }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={save} disabled={saving}><Text style={{ color: colors.accent, fontWeight: '900' }}>{saving ? 'Saving...' : 'Add student'}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, height: 52 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '900' },
  list: { padding: 16, paddingBottom: 60 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, padding: 13, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '900' },
  rowActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 20 },
  modalCard: { borderRadius: 18, padding: 18, gap: 12 },
  modalTitle: { fontSize: 19, fontWeight: '900' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 22, marginTop: 4 },
});
