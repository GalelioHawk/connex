import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, ScrollView, StatusBar, Animated, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuthStore } from '../../store/authStore';
import { chatService } from '../../services/chat';
import type { Id } from '../../../convex/_generated/dataModel';

interface Props {
  visible: boolean;
  onClose: () => void;
  onConversationCreated: (conversationId: string, title: string) => void;
}

const HOLD_DURATION = 3000;

// ─── SOS row — Tap and Go ──────────────────────────────────────────────────────
function SOSRow({ onSOSTriggered }: { onSOSTriggered: () => void }) {
  function triggerSOS() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    onSOSTriggered();
  }

  return (
    <TouchableOpacity
      style={[s.optionItem, s.optionBorder, s.sosRow]}
      activeOpacity={0.7}
      onPress={triggerSOS}
    >
      <View style={[s.optionIcon, s.optionIconSOS]}>
        <Text style={s.sosIconText}>SOS</Text>
      </View>
      <View style={s.optionText}>
        <Text style={s.optionLabelSOS}>Emergency SOS</Text>
        <Text style={s.optionSubtitle}>Tap to instantly alert contacts</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export default function NewChatModal({ visible, onClose, onConversationCreated }: Props) {
  const navigation  = useNavigation<any>();
  const sessionId = useAuthStore((s) => s.sessionId)!;

  const triggerAlertAction = useAction(api.sos.triggerAlert);

  const [search, setSearch]         = useState('');
  const [results, setResults]       = useState<{ id: string; name: string; phone: string | null; avatar_url?: string | null }[]>([]);
  const [searching, setSearching]   = useState(false);
  const [starting, setStarting]     = useState<string | null>(null);
  const searchTimer                 = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function handleSearchChange(text: string) {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (text.trim().length < 2) { setResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const users = await chatService.searchUsers(sessionId, text.trim());
        setResults(users);
      } catch { /* ignore */ }
      finally { setSearching(false); }
    }, 400);
  }

  async function startDirectChat(userId: string, name: string) {
    setStarting(userId);
    try {
      const { conversationId } = await chatService.createConversation(sessionId, 'direct', [userId]);
      onConversationCreated(conversationId, name);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not start chat');
    } finally {
      setStarting(null);
    }
  }

  async function handleSOSTriggered() {
    try {
      const result = await triggerAlertAction({ sessionId: sessionId as Id<'sessions'> });
      Alert.alert(
        'SOS Sent',
        result.notified > 0
          ? `${result.notified} trusted contact${result.notified > 1 ? 's have' : ' has'} been notified.`
          : 'SOS logged. You have no accepted SOS contacts yet.',
        [{ text: 'OK' }],
      );
    } catch {
      Alert.alert('SOS Sent', 'Your trusted contacts have been notified.', [{ text: 'OK' }]);
    }
  }

  function handleClose() {
    setSearch('');
    setResults([]);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={s.root} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#111111" />

        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>New chat</Text>
          <TouchableOpacity style={s.closeBtn} onPress={handleClose}>
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={18} color="#8A9BB0" style={s.searchIcon} />
          <TextInput
            style={s.searchInput}
            placeholder="Search name or number"
            placeholderTextColor="#B0BEC5"
            value={search}
            onChangeText={handleSearchChange}
          />
          {searching && <ActivityIndicator size="small" color="#8A9BB0" />}
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>

          {/* Quick actions */}
          <View style={s.optionsList}>
            <TouchableOpacity
              style={[s.optionItem, s.optionBorder]}
              activeOpacity={0.7}
              onPress={() => { handleClose(); navigation.navigate('Chat', { screen: 'NewGroup' }); }}
            >
              <View style={s.optionIcon}>
                <Ionicons name="people-outline" size={22} color="#FFFFFF" />
              </View>
              <View style={s.optionText}>
                <Text style={s.optionLabel}>New group</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[s.optionItem, s.optionBorder]} activeOpacity={0.7}>
              <View style={s.optionIcon}>
                <Ionicons name="people-circle-outline" size={22} color="#FFFFFF" />
              </View>
              <View style={s.optionText}>
                <Text style={s.optionLabel}>New community</Text>
                <Text style={s.optionSubtitle}>Bring together topic-based groups</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={s.optionItem} activeOpacity={0.7}>
              <View style={s.optionIcon}>
                <Ionicons name="warning-outline" size={22} color="#FFFFFF" />
              </View>
              <View style={s.optionText}>
                <Text style={s.optionLabel}>New alert</Text>
                <Text style={s.optionSubtitle}>Post a community alert to your area</Text>
              </View>
            </TouchableOpacity>

            <SOSRow onSOSTriggered={handleSOSTriggered} />
          </View>

          {/* Search results */}
          {results.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>CONTACTS ON CONNEX</Text>
              {results.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={s.userRow}
                  activeOpacity={0.7}
                  onPress={() => startDirectChat(user.id, user.name)}
                  disabled={starting === user.id}
                >
                  <View style={s.userAvatar}>
                    <Text style={s.userAvatarText}>{user.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={s.userInfo}>
                    <Text style={s.userName}>{user.name}</Text>
                    <Text style={s.userPhone}>{user.phone ?? ''}</Text>
                  </View>
                  {starting === user.id
                    ? <ActivityIndicator size="small" color="#00A86B" />
                    : <Ionicons name="chatbubble-outline" size={20} color="#8A9BB0" />
                  }
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Empty contacts */}
          {search.length < 2 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>CONTACTS ON CONNEX</Text>
              <View style={s.emptyContacts}>
                <Text style={s.emptyText}>Search by name or phone number above</Text>
              </View>
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: '#111111' },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#2C2C2E' },
  title:          { fontSize: 18, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  closeBtn:       { width: 32, height: 32, borderRadius: 16, backgroundColor: '#2C2C2E', alignItems: 'center', justifyContent: 'center' },
  searchWrap:     { flexDirection: 'row', alignItems: 'center', margin: 16, backgroundColor: '#1C1C1E', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  searchIcon:     { marginRight: 8 },
  searchInput:    { flex: 1, fontSize: 15, color: '#FFFFFF' },
  optionsList:    { marginHorizontal: 16, backgroundColor: '#1C1C1E', borderRadius: 16, overflow: 'hidden', marginBottom: 24 },
  sosRow:         { overflow: 'hidden' },
  sosFill:        { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(229,62,62,0.2)' },
  optionItem:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
  optionBorder:   { borderBottomWidth: 1, borderBottomColor: '#2C2C2E' },
  optionIcon:     { width: 42, height: 42, borderRadius: 21, backgroundColor: '#2C2C2E', alignItems: 'center', justifyContent: 'center' },
  optionIconSOS:  { backgroundColor: '#E53E3E' },
  sosIconText:    { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  optionText:     { flex: 1, gap: 2 },
  optionLabel:    { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  optionLabelSOS: { fontSize: 15, fontWeight: '800', color: '#E53E3E' },
  optionSubtitle: { fontSize: 12, color: '#8E8E93' },
  section:        { paddingHorizontal: 20, marginBottom: 32 },
  sectionTitle:   { fontSize: 12, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.8, marginBottom: 12 },
  userRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 14 },
  userAvatar:     { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1E3A5F', alignItems: 'center', justifyContent: 'center' },
  userAvatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  userInfo:       { flex: 1 },
  userName:       { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  userPhone:      { fontSize: 13, color: '#8E8E93' },
  emptyContacts:  { alignItems: 'center', paddingVertical: 32 },
  emptyText:      { fontSize: 14, color: '#6C6C6E', textAlign: 'center' },
});
