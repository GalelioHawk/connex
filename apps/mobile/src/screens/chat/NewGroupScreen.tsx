import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { chatService } from '../../services/chat';
import { useTheme } from '../../hooks/useTheme';

interface SearchUser {
  id:         string;
  name:       string;
  phone:      string | null;
  avatar_url: string | null;
}

export default function NewGroupScreen() {
  const navigation  = useNavigation<any>();
  const sessionId = useAuthStore((s) => s.sessionId)!;
  const { colors } = useTheme();

  const [groupName, setGroupName]   = useState('');
  const [search, setSearch]         = useState('');
  const [results, setResults]       = useState<SearchUser[]>([]);
  const [selected, setSelected]     = useState<SearchUser[]>([]);
  const [searching, setSearching]   = useState(false);
  const [creating, setCreating]     = useState(false);
  const searchTimer                 = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
  }, []);

  function handleSearchChange(text: string) {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (text.trim().length < 2) { setResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const users = await chatService.searchUsers(sessionId, text.trim());
        setResults(users.filter((u) => !selected.find((s) => s.id === u.id)));
      } catch { /* ignore */ }
      finally { setSearching(false); }
    }, 400);
  }

  function toggleSelect(user: SearchUser) {
    setSelected((prev) =>
      prev.find((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user],
    );
  }

  async function handleCreate() {
    if (!groupName.trim()) { Alert.alert('Group name required', 'Please enter a group name'); return; }
    if (selected.length === 0) { Alert.alert('No members', 'Add at least one person to the group'); return; }
    setCreating(true);
    try {
      const { conversationId } = await chatService.createConversation(
        sessionId, 'group', selected.map((u) => u.id), groupName.trim(),
      );
      navigation.replace('ChatRoom', { conversationId, title: groupName.trim() });
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to create group');
    } finally {
      setCreating(false);
    }
  }

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>

      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.text }]}>New group</Text>
        <TouchableOpacity
          style={[s.createBtn, (!groupName.trim() || selected.length === 0) && s.createBtnDisabled]}
          onPress={handleCreate}
          disabled={creating || !groupName.trim() || selected.length === 0}
        >
          {creating
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.createBtnText}>Create</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Group name */}
      <View style={[s.nameRow, { borderBottomColor: colors.border }]}>
        <View style={s.groupIcon}>
          <Ionicons name="people" size={22} color="#fff" />
        </View>
        <TextInput
          style={[s.nameInput, { color: colors.text, borderBottomColor: colors.accent }]}
          placeholder="Group name"
          placeholderTextColor={colors.textMuted}
          value={groupName}
          onChangeText={setGroupName}
          maxLength={100}
          autoFocus
        />
      </View>

      {/* Selected chips */}
      {selected.length > 0 && (
        <View style={s.chips}>
          {selected.map((u) => (
            <TouchableOpacity key={u.id} style={s.chip} onPress={() => toggleSelect(u)}>
              <Text style={s.chipText}>{u.name}</Text>
              <Ionicons name="close" size={14} color="#fff" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Search */}
      <View style={[s.searchWrap, { backgroundColor: colors.surface }]}>
        <Ionicons name="search-outline" size={18} color="#8A9BB0" />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          placeholder="Search name or number"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={handleSearchChange}
        />
        {searching && <ActivityIndicator size="small" color="#8A9BB0" />}
      </View>

      {/* Results */}
      <FlatList
        data={results}
        keyExtractor={(u) => u.id}
        renderItem={({ item }) => {
          const isSelected = !!selected.find((u) => u.id === item.id);
          return (
            <TouchableOpacity style={s.userRow} onPress={() => toggleSelect(item)} activeOpacity={0.7}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={s.userInfo}>
                <Text style={[s.userName, { color: colors.text }]}>{item.name}</Text>
                <Text style={[s.userPhone, { color: colors.textSecondary }]}>{item.phone ?? 'Phone number private'}</Text>
              </View>
              <View style={[s.check, isSelected && s.checkSelected]}>
                {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          search.length >= 2 && !searching ? (
            <View style={s.empty}>
              <Text style={[s.emptyText, { color: colors.textMuted }]}>No users found</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:             { flex: 1, backgroundColor: '#111111' },
  header:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#2C2C2E' },
  title:            { flex: 1, fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginLeft: 16 },
  createBtn:        { backgroundColor: '#00A86B', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  createBtnDisabled:{ backgroundColor: '#3C3C3E' },
  createBtnText:    { color: '#fff', fontWeight: '700', fontSize: 14 },
  nameRow:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, gap: 14, borderBottomWidth: 1, borderBottomColor: '#2C2C2E' },
  groupIcon:        { width: 46, height: 46, borderRadius: 23, backgroundColor: '#3D5A80', alignItems: 'center', justifyContent: 'center' },
  nameInput:        { flex: 1, fontSize: 16, color: '#FFFFFF', borderBottomWidth: 1.5, borderBottomColor: '#00A86B', paddingBottom: 4 },
  chips:            { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip:             { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E3A5F', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  chipText:         { color: '#fff', fontSize: 13, fontWeight: '600' },
  searchWrap:       { flexDirection: 'row', alignItems: 'center', margin: 16, backgroundColor: '#1C1C1E', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  searchInput:      { flex: 1, fontSize: 15, color: '#FFFFFF' },
  userRow:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 14 },
  avatar:           { width: 46, height: 46, borderRadius: 23, backgroundColor: '#1E3A5F', alignItems: 'center', justifyContent: 'center' },
  avatarText:       { color: '#fff', fontSize: 18, fontWeight: '700' },
  userInfo:         { flex: 1 },
  userName:         { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  userPhone:        { fontSize: 13, color: '#8E8E93' },
  check:            { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#3C3C3E', alignItems: 'center', justifyContent: 'center' },
  checkSelected:    { backgroundColor: '#00A86B', borderColor: '#00A86B' },
  empty:            { padding: 32, alignItems: 'center' },
  emptyText:        { color: '#8E8E93', fontSize: 14 },
});
