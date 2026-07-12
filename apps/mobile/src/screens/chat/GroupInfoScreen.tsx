import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, SafeAreaView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import type { ChatStackParams } from '../../navigation';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';

type GroupRoute = RouteProp<ChatStackParams, 'GroupInfo'>;

export default function GroupInfoScreen() {
  const navigation = useNavigation();
  const route = useRoute<GroupRoute>();
  const { colors } = useTheme();
  const sessionId = useAuthStore((state) => state.sessionId)! as Id<'sessions'>;
  const conversationId = route.params.conversationId as Id<'conversations'>;
  const conversation = useQuery(api.chat.getConversation, { sessionId, conversationId });
  const updateGroup = useMutation(api.chat.updateGroup);
  const addMembers = useMutation(api.chat.addGroupMembers);
  const removeMember = useMutation(api.chat.removeGroupMember);
  const leaveGroup = useMutation(api.chat.leaveGroup);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(route.params.title);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const results = useQuery(
    api.users.search,
    adding && search.trim().length >= 2 ? { sessionId, q: search.trim() } : 'skip',
  );
  const memberIds = useMemo(
    () => new Set((conversation?.members ?? []).map((member) => member?.id)),
    [conversation?.members],
  );
  const candidates = (results ?? []).filter((user) => !memberIds.has(user.id));
  const isAdmin = conversation?.my_role === 'admin';

  async function saveName() {
    setBusy(true);
    try {
      await updateGroup({ sessionId, conversationId, name });
      setEditing(false);
    } catch (error) {
      Alert.alert('Could not update group', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function addUser(userId: string) {
    setBusy(true);
    try {
      await addMembers({ sessionId, conversationId, userIds: [userId as Id<'users'>] });
      setSearch('');
    } catch (error) {
      Alert.alert('Could not add member', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  function confirmRemove(userId: string, memberName: string) {
    Alert.alert('Remove member?', `${memberName} will no longer receive group messages.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            await removeMember({ sessionId, conversationId, userId: userId as Id<'users'> });
          } catch (error) {
            Alert.alert('Could not remove member', error instanceof Error ? error.message : 'Try again.');
          }
        },
      },
    ]);
  }

  function confirmLeave() {
    Alert.alert('Leave group?', 'You will stop receiving messages from this group.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive', onPress: async () => {
          try {
            await leaveGroup({ sessionId, conversationId });
            (navigation as any).popToTop();
          } catch (error) {
            Alert.alert('Could not leave group', error instanceof Error ? error.message : 'Try again.');
          }
        },
      },
    ]);
  }

  if (conversation === undefined) {
    return <View style={[s.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.accent} /></View>;
  }

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>Group info</Text>
        <View style={s.iconButton} />
      </View>

      <View style={s.hero}>
        <View style={[s.avatar, { backgroundColor: colors.avatarBg }]}>
          <Ionicons name="people" size={42} color={colors.accent} />
        </View>
        <Text style={[s.groupName, { color: colors.text }]}>{conversation?.name ?? route.params.title}</Text>
        <Text style={{ color: colors.textSecondary }}>{conversation?.members.length ?? 0} members</Text>
        {isAdmin && (
          <TouchableOpacity style={[s.outlineButton, { borderColor: colors.border }]} onPress={() => setEditing(true)}>
            <Ionicons name="pencil" size={16} color={colors.accent} />
            <Text style={{ color: colors.accent, fontWeight: '700' }}>Edit group name</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={s.sectionHeader}>
        <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>MEMBERS</Text>
        {isAdmin && (
          <TouchableOpacity onPress={() => setAdding(true)}>
            <Text style={{ color: colors.accent, fontWeight: '700' }}>Add</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={conversation?.members ?? []}
        keyExtractor={(item) => item!.id}
        renderItem={({ item }) => item ? (
          <TouchableOpacity
            style={[s.memberRow, { borderBottomColor: colors.border }]}
            disabled={!isAdmin || item.is_me}
            onLongPress={() => isAdmin && !item.is_me && confirmRemove(item.id, item.name)}
          >
            <View style={[s.memberAvatar, { backgroundColor: colors.avatarBg }]}>
              <Text style={s.memberLetter}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.memberName, { color: colors.text }]}>{item.name}{item.is_me ? ' (You)' : ''}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.role === 'admin' ? 'Group admin' : 'Member'}</Text>
            </View>
            {isAdmin && !item.is_me && <Text style={{ color: colors.textMuted, fontSize: 12 }}>Hold to remove</Text>}
          </TouchableOpacity>
        ) : null}
        ListFooterComponent={(
          <TouchableOpacity style={s.leaveButton} onPress={confirmLeave}>
            <Ionicons name="exit-outline" size={21} color="#E53E3E" />
            <Text style={s.leaveText}>Leave group</Text>
          </TouchableOpacity>
        )}
      />

      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
        <View style={s.modalBackdrop}>
          <View style={[s.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>Edit group name</Text>
            <TextInput value={name} onChangeText={setName} maxLength={100} style={[s.input, { color: colors.text, borderColor: colors.border }]} />
            <View style={s.modalActions}>
              <TouchableOpacity onPress={() => setEditing(false)}><Text style={{ color: colors.textSecondary }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={saveName} disabled={busy}><Text style={{ color: colors.accent, fontWeight: '800' }}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={adding} animationType="slide" onRequestClose={() => setAdding(false)}>
        <SafeAreaView style={[s.root, { backgroundColor: colors.background }]}>
          <View style={[s.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setAdding(false)} style={s.iconButton}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
            <Text style={[s.headerTitle, { color: colors.text }]}>Add members</Text><View style={s.iconButton} />
          </View>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search name or number"
            placeholderTextColor={colors.textMuted}
            style={[s.search, { backgroundColor: colors.surface, color: colors.text }]}
          />
          <FlatList
            data={candidates}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={[s.memberRow, { borderBottomColor: colors.border }]} onPress={() => addUser(item.id)} disabled={busy}>
                <View style={[s.memberAvatar, { backgroundColor: colors.avatarBg }]}><Text style={s.memberLetter}>{item.name.charAt(0).toUpperCase()}</Text></View>
                <Text style={[s.memberName, { color: colors.text, flex: 1 }]}>{item.name}</Text>
                <Ionicons name="add-circle" size={24} color={colors.accent} />
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 8 },
  iconButton: { width: 48, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800' },
  hero: { alignItems: 'center', padding: 24, gap: 7 }, avatar: { width: 94, height: 94, borderRadius: 47, alignItems: 'center', justifyContent: 'center' },
  groupName: { fontSize: 23, fontWeight: '900' }, outlineButton: { flexDirection: 'row', gap: 7, alignItems: 'center', borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, marginTop: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 10 }, sectionTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.7 },
  memberRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  memberAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' }, memberLetter: { color: '#fff', fontWeight: '800', fontSize: 17 }, memberName: { fontSize: 15, fontWeight: '700' },
  leaveButton: { flexDirection: 'row', gap: 10, padding: 20, alignItems: 'center' }, leaveText: { color: '#E53E3E', fontWeight: '800', fontSize: 16 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 }, modalCard: { width: '100%', borderRadius: 18, padding: 20, gap: 16 }, modalTitle: { fontSize: 18, fontWeight: '800' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16 }, modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 24 },
  search: { margin: 16, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
});
