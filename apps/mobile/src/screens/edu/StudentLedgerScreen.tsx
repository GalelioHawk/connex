import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
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

type RouteType = RouteProp<EduStackParams, 'StudentLedger'>;
type EntryModal = 'payment' | 'charge' | null;

export default function StudentLedgerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteType>();
  const { studentId } = route.params;
  const { colors } = useTheme();
  const sessionId = useAuthStore((s) => s.sessionId)! as Id<'sessions'>;
  const myTutorProfile = useQuery(api.eduBookings.myTutorProfile, { sessionId });
  const isTutor = !!myTutorProfile;

  const ledger = useQuery(api.eduLedger.getStudentLedger, { sessionId, studentId: studentId as Id<'tutorStudents'> });
  const recordPayment = useMutation(api.eduLedger.recordPayment);
  const recordCharge = useMutation(api.eduLedger.recordCharge);

  const [modal, setModal] = useState<EntryModal>(null);
  const [amount, setAmount] = useState('500');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!amount || Number(amount) <= 0) return Alert.alert('Enter an amount', 'Amount must be more than 0.');
    setSaving(true);
    try {
      if (modal === 'payment') {
        await recordPayment({ sessionId, studentId: studentId as Id<'tutorStudents'>, amountZar: Number(amount), description: description || undefined, method: 'cash' });
      } else if (modal === 'charge') {
        await recordCharge({ sessionId, studentId: studentId as Id<'tutorStudents'>, amountZar: Number(amount), description: description || 'Tuition charge' });
      }
      setAmount('500'); setDescription(''); setModal(null);
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : 'Try again.');
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
        <Text style={[s.title, { color: colors.text }]} numberOfLines={1}>{ledger?.student_name ?? 'Ledger'}</Text>
        <View style={s.backBtn} />
      </View>

      <View style={[s.balanceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={{ color: colors.textSecondary }}>Balance</Text>
        <Text style={{ color: (ledger?.balance_zar ?? 0) > 0 ? '#E67E22' : '#00A86B', fontSize: 28, fontWeight: '900' }}>
          R{ledger?.balance_zar ?? 0}
        </Text>
        <Text style={{ color: colors.textMuted }}>{(ledger?.balance_zar ?? 0) > 0 ? 'Outstanding' : 'Fully paid'}</Text>
      </View>

      {isTutor && (
        <View style={s.actionsRow}>
          <TouchableOpacity style={[s.action, { backgroundColor: colors.accent }]} onPress={() => setModal('payment')}>
            <Ionicons name="cash" size={18} color="#fff" />
            <Text style={s.actionText}>Log payment</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.action, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]} onPress={() => setModal('charge')}>
            <Ionicons name="add-circle-outline" size={18} color={colors.text} />
            <Text style={[s.actionText, { color: colors.text }]}>Add charge</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={ledger?.entries ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <View style={[s.entry, { borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.entryDesc, { color: colors.text }]}>{item.description}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>{dayjs(item.recorded_at).format('D MMM YYYY')}</Text>
            </View>
            <Text style={{ color: item.type === 'charge' ? '#E67E22' : '#00A86B', fontWeight: '900' }}>
              {item.type === 'charge' ? '+' : '-'}R{item.amount_zar}
            </Text>
          </View>
        )}
        ListEmptyComponent={ledger === undefined ? <ActivityIndicator color={colors.accent} style={{ marginTop: 30 }} /> : (
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 30 }}>No entries yet.</Text>
        )}
      />

      <Modal visible={!!modal} transparent animationType="fade" onRequestClose={() => setModal(null)}>
        <View style={s.backdrop}>
          <View style={[s.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>{modal === 'payment' ? 'Log payment received' : 'Add a charge'}</Text>
            <TextInput value={amount} onChangeText={setAmount} placeholder="Amount (ZAR)" keyboardType="numeric" placeholderTextColor={colors.textMuted} style={[s.input, { borderColor: colors.border, color: colors.text }]} />
            <TextInput value={description} onChangeText={setDescription} placeholder="Description (optional)" placeholderTextColor={colors.textMuted} style={[s.input, { borderColor: colors.border, color: colors.text }]} />
            <View style={s.modalActions}>
              <TouchableOpacity onPress={() => setModal(null)}><Text style={{ color: colors.textSecondary }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={save} disabled={saving}><Text style={{ color: colors.accent, fontWeight: '900' }}>{saving ? 'Saving...' : 'Save'}</Text></TouchableOpacity>
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
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '900', paddingHorizontal: 8 },
  balanceCard: { marginHorizontal: 16, borderWidth: 1, borderRadius: 16, alignItems: 'center', paddingVertical: 20, gap: 2 },
  actionsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 14 },
  action: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 13, paddingVertical: 12 },
  actionText: { color: '#fff', fontWeight: '900' },
  list: { padding: 16, paddingBottom: 60 },
  entry: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 12 },
  entryDesc: { fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 20 },
  modalCard: { borderRadius: 18, padding: 18, gap: 12 },
  modalTitle: { fontSize: 19, fontWeight: '900' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 22, marginTop: 4 },
});
