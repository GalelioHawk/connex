import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import type { Id } from '../../../convex/_generated/dataModel';
import SOSButton from '../../components/chat/SOSButton';

export default function SOSContactsScreen() {
  const navigation     = useNavigation();
  const sessionId      = useAuthStore((s) => s.sessionId)!;
  const { fonts }      = useTheme();

  const [search,         setSearch]         = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [scrollEnabled,  setScrollEnabled]  = useState(true);
  const searchTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const contacts        = useQuery(api.sos.listContacts,         sessionId ? { sessionId: sessionId as Id<'sessions'> } : 'skip');
  const incoming        = useQuery(api.sos.listIncomingRequests, sessionId ? { sessionId: sessionId as Id<'sessions'> } : 'skip');
  const searchResults   = useQuery(api.sos.searchSOSEligibleUsers, sessionId && searchDebounce.length >= 2 ? { sessionId: sessionId as Id<'sessions'>, q: searchDebounce } : 'skip');

  const sendRequestMutation    = useMutation(api.sos.sendRequest);
  const respondToRequestMutation = useMutation(api.sos.respondToRequest);

  const loading = contacts === undefined;

  function handleSearchChange(text: string) {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearchDebounce(text.trim()), 400);
  }

  async function handleAdd(contactUserId: string, name: string) {
    try {
      await sendRequestMutation({
        sessionId:     sessionId as Id<'sessions'>,
        contactUserId: contactUserId as Id<'users'>,
      });
      Alert.alert('Request sent', `${name} will be notified. They need to accept before SOS alerts are sent to them.`);
      setSearch('');
      setSearchDebounce('');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to send request');
    }
  }

  async function handleRespond(requestId: string, accept: boolean) {
    try {
      await respondToRequestMutation({
        sessionId: sessionId as Id<'sessions'>,
        requestId: requestId as Id<'sosContacts'>,
        accept,
      });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  const accepted = (contacts ?? []).filter((c) => c.status === 'accepted');
  const pending  = (contacts ?? []).filter((c) => c.status === 'pending');

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={s.title}>SOS Contacts</Text>
      </View>

      <FlatList
        data={[]}
        renderItem={null}
        scrollEnabled={scrollEnabled}
        ListHeaderComponent={
          <View>
            <View style={s.infoCard}>
              <Ionicons name="shield-checkmark" size={22} color="#E53E3E" />
              <Text style={[s.infoText, { fontSize: fonts.sm }]}>
                These people will be notified when you trigger an SOS. Both of you must accept to be connected.
              </Text>
            </View>

            {/* Emergency SOS Press-and-Hold Button */}
            <View style={{ alignItems: 'center', marginVertical: 20 }}>
              <Text style={{ color: '#8E8E93', fontSize: 11, fontWeight: '700', marginBottom: 12, letterSpacing: 0.8 }}>TRIGGER EMERGENCY ALERT</Text>
              <SOSButton setScrollEnabled={setScrollEnabled} />
            </View>

            <Text style={s.sectionTitle}>ADD CONTACT</Text>
            <View style={s.searchWrap}>
              <Ionicons name="search-outline" size={18} color="#8A9BB0" />
              <TextInput
                style={s.searchInput}
                placeholder="Search by name or phone"
                placeholderTextColor="#B0BEC5"
                value={search}
                onChangeText={handleSearchChange}
              />
            </View>

            {searchResults && searchResults.length > 0 && searchResults.map((u) => (
              <TouchableOpacity key={u.id} style={s.userRow} onPress={() => handleAdd(u.id, u.name)}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{u.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={s.userInfo}>
                  <Text style={[s.userName, { fontSize: fonts.md }]}>{u.name}</Text>
                  <Text style={[s.userPhone, { fontSize: fonts.sm }]}>{u.phone}</Text>
                </View>
                <View style={s.addBtn}>
                  <Ionicons name="person-add-outline" size={18} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            ))}

            {(incoming ?? []).length > 0 && (
              <>
                <Text style={s.sectionTitle}>REQUESTS ({incoming!.length})</Text>
                {incoming!.map((req) => (
                  <View key={req.id} style={s.userRow}>
                    <View style={s.avatar}>
                      <Text style={s.avatarText}>{req.requester?.name ? req.requester.name.charAt(0).toUpperCase() : '?'}</Text>
                    </View>
                    <View style={s.userInfo}>
                      <Text style={[s.userName, { fontSize: fonts.md }]}>{req.requester?.name ?? 'Unknown'}</Text>
                      <Text style={[s.userPhone, { fontSize: fonts.sm }]}>Wants to add you as SOS contact</Text>
                    </View>
                    <TouchableOpacity style={s.acceptBtn} onPress={() => handleRespond(req.id, true)}>
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={s.rejectBtn} onPress={() => handleRespond(req.id, false)}>
                      <Ionicons name="close" size={18} color="#E53E3E" />
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}

            <Text style={s.sectionTitle}>TRUSTED CONTACTS ({accepted.length})</Text>
            {loading && <ActivityIndicator style={{ margin: 24 }} color="#00A86B" />}
            {!loading && accepted.length === 0 && (
              <View style={s.empty}>
                <Ionicons name="shield-outline" size={40} color="#C0CDD8" />
                <Text style={[s.emptyText, { fontSize: fonts.sm }]}>No SOS contacts yet{'\n'}Search above to add trusted contacts</Text>
              </View>
            )}
            {accepted.map((c) => (
              <View key={c.id} style={s.userRow}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{c.contact?.name ? c.contact.name.charAt(0).toUpperCase() : '?'}</Text>
                </View>
                <View style={s.userInfo}>
                  <Text style={[s.userName, { fontSize: fonts.md }]}>{c.contact?.name ?? 'Unknown'}</Text>
                </View>
              </View>
            ))}

            {pending.length > 0 && (
              <>
                <Text style={s.sectionTitle}>PENDING ({pending.length})</Text>
                {pending.map((c) => (
                  <View key={c.id} style={[s.userRow, s.pendingRow]}>
                    <View style={[s.avatar, s.avatarPending]}>
                      <Text style={s.avatarText}>{c.contact?.name ? c.contact.name.charAt(0).toUpperCase() : '?'}</Text>
                    </View>
                    <View style={s.userInfo}>
                      <Text style={[s.userName, { fontSize: fonts.md }]}>{c.contact?.name ?? 'Unknown'}</Text>
                      <Text style={[s.userPhone, { fontSize: fonts.sm }]}>Waiting for them to accept</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: '#111111' },
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#2C2C2E', gap: 12 },
  title:         { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  infoCard:      { flexDirection: 'row', alignItems: 'flex-start', margin: 16, backgroundColor: '#1F0A0A', borderRadius: 12, padding: 14, gap: 10 },
  infoText:      { flex: 1, fontSize: 13, color: '#FFFFFF', lineHeight: 18 },
  sectionTitle:  { fontSize: 12, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.8, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  searchWrap:    { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, backgroundColor: '#1C1C1E', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  searchInput:   { flex: 1, fontSize: 15, color: '#FFFFFF' },
  userRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 14 },
  pendingRow:    { opacity: 0.6 },
  avatar:        { width: 46, height: 46, borderRadius: 23, backgroundColor: '#1E3A5F', alignItems: 'center', justifyContent: 'center' },
  avatarPending: { backgroundColor: '#3C3C3E' },
  avatarText:    { color: '#fff', fontSize: 18, fontWeight: '700' },
  userInfo:      { flex: 1 },
  userName:      { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  userPhone:     { fontSize: 13, color: '#8E8E93' },
  addBtn:        { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2C2C2E', alignItems: 'center', justifyContent: 'center' },
  acceptBtn:     { width: 34, height: 34, borderRadius: 17, backgroundColor: '#00A86B', alignItems: 'center', justifyContent: 'center' },
  rejectBtn:     { width: 34, height: 34, borderRadius: 17, backgroundColor: '#1F0A0A', alignItems: 'center', justifyContent: 'center' },
  empty:         { alignItems: 'center', padding: 40, gap: 12 },
  emptyText:     { fontSize: 14, color: '#8E8E93', textAlign: 'center', lineHeight: 20 },
});
