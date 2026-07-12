import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Switch,
  ScrollView, Image, Modal, StatusBar, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import type { ChatStackParams } from '../../navigation';
import type { Id } from '../../../convex/_generated/dataModel';

type RouteType = RouteProp<ChatStackParams, 'ContactInfo'>;

export default function ContactInfoScreen() {
  const navigation                    = useNavigation();
  const route                         = useRoute<RouteType>();
  const { title, avatarUrl, userId }  = route.params;
  const { colors, fonts }             = useTheme();
  const { width }                     = useWindowDimensions();
  const sessionId                     = useAuthStore((s) => s.sessionId);

  const profile = useQuery(
    api.users.getPublicProfile,
    sessionId && userId
      ? { sessionId: sessionId as Id<'sessions'>, userId: userId as Id<'users'> }
      : 'skip',
  );

  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [lockChat,        setLockChat]        = useState(false);

  // ─── Full-screen image viewer ─────────────────────────────────────────────
  const renderViewer = () => (
    <Modal
      visible={imageViewerOpen}
      transparent
      animationType="fade"
      onRequestClose={() => setImageViewerOpen(false)}
    >
      <StatusBar barStyle="light-content" />
      <View style={[StyleSheet.absoluteFill, s.viewerBg]}>
        <TouchableOpacity style={s.viewerClose} onPress={() => setImageViewerOpen(false)}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={s.viewerCenter}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={{ width, height: width }} resizeMode="cover" />
          ) : (
            <View style={[{ width, height: width }, s.viewerPlaceholder, { backgroundColor: colors.avatarBg }]}>
              <Text style={s.viewerLetter}>{title.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Text style={s.viewerName}>{title}</Text>
        </View>
      </View>
    </Modal>
  );

  // ─── Reusable row builders ────────────────────────────────────────────────
  function Row({
    icon, label, value, sub, chevron = true, onPress,
  }: {
    icon?: string; label: string; value?: string; sub?: string;
    chevron?: boolean; onPress?: () => void;
  }) {
    return (
      <TouchableOpacity style={s.row} activeOpacity={onPress ? 0.65 : 1} onPress={onPress}>
        {icon ? <Ionicons name={icon as any} size={22} color={colors.textSecondary} style={s.rowIcon} /> : null}
        <View style={{ flex: 1 }}>
          <Text style={[s.rowLabel, { color: colors.text, fontSize: fonts.body }]}>{label}</Text>
          {sub ? <Text style={[s.rowSub, { color: colors.textSecondary, fontSize: fonts.sm }]}>{sub}</Text> : null}
        </View>
        {value ? <Text style={[s.rowValue, { color: colors.textMuted, fontSize: fonts.md }]}>{value}</Text> : null}
        {chevron ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
      </TouchableOpacity>
    );
  }

  function Divider({ indent = 50 }: { indent?: number }) {
    return <View style={[s.div, { backgroundColor: colors.border, marginLeft: indent }]} />;
  }

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>
      {renderViewer()}

      {/* ── Header ── */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={s.headerBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.headerIcon} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>Contact info</Text>
        <View style={s.headerBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Avatar ── */}
        <TouchableOpacity onPress={() => setImageViewerOpen(true)} activeOpacity={0.85} style={s.avatarWrap}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={s.avatar} />
          ) : (
            <View style={[s.avatar, { backgroundColor: colors.avatarBg, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={s.avatarLetter}>{title.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ── Name + bio ── */}
        <Text style={[s.name, { color: colors.text }]}>{title}</Text>
        <Text style={[s.bio, { color: colors.textSecondary, fontSize: fonts.sm }]}>
          {profile?.bio ?? 'Hey there! I am using Connex'}
        </Text>

        {/* ── Action buttons ── */}
        <View style={[s.actionsRow, { width: width * 0.92 }]}>
          {[
            { icon: 'call-outline',     label: 'Audio' },
            { icon: 'videocam-outline', label: 'Video' },
            { icon: 'search-outline',   label: 'Search' },
          ].map(({ icon, label }) => (
            <TouchableOpacity key={label} style={[s.actionBtn, { backgroundColor: colors.surface }]} activeOpacity={0.7}>
              <Ionicons name={icon as any} size={28} color={colors.accent} />
              <Text style={[s.actionLabel, { color: colors.accent, fontSize: fonts.sm }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Media / storage / starred ── */}
        <View style={[s.card, { backgroundColor: colors.surface, width: width * 0.92 }]}>
          <Row icon="image-outline"   label="Media, links and docs" value="0" />
          <Divider />
          <Row icon="server-outline"  label="Manage storage"        value="0 KB" />
          <Divider />
          <Row icon="star-outline"    label="Starred messages"      value="None" />
        </View>

        {/* ── Chat settings ── */}
        <View style={[s.card, { backgroundColor: colors.surface, width: width * 0.92 }]}>
          <Row icon="notifications-outline" label="Notifications" />
          <Divider />
          <Row icon="color-palette-outline" label="Chat theme" />
          <Divider />
          <Row icon="download-outline"      label="Save to Photos" value="Default" />
        </View>

        {/* ── Privacy / security ── */}
        <View style={[s.card, { backgroundColor: colors.surface, width: width * 0.92 }]}>
          <Row icon="timer-outline"       label="Disappearing messages" value="Off" />
          <Divider />
          {/* Lock chat — toggle */}
          <TouchableOpacity style={s.row} activeOpacity={1}>
            <Ionicons name="chatbox-ellipses-outline" size={22} color={colors.textSecondary} style={s.rowIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[s.rowLabel, { color: colors.text }]}>Lock chat</Text>
              <Text style={[s.rowSub, { color: colors.textSecondary }]}>Lock and hide this chat on this device</Text>
            </View>
            <Switch
              value={lockChat}
              onValueChange={setLockChat}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor="#fff"
            />
          </TouchableOpacity>
          <Divider />
          <Row
            icon="shield-outline"
            label="Advanced chat privacy"
            value="Off"
          />
          <Divider />
          <TouchableOpacity style={s.row} activeOpacity={0.65}>
            <Ionicons name="lock-closed-outline" size={22} color={colors.textSecondary} style={s.rowIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[s.rowLabel, { color: colors.text }]}>Encryption</Text>
              <Text style={[s.rowSub, { color: colors.textSecondary }]}>Data is encrypted in transit and at rest. End-to-end encryption is not yet available.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* ── Contact details ── */}
        <View style={[s.card, { backgroundColor: colors.surface, width: width * 0.92 }]}>
          <Row icon="person-circle-outline" label="Contact details" />
        </View>

        {/* ── Actions ── */}
        <View style={[s.card, { backgroundColor: colors.surface, width: width * 0.92 }]}>
          <Row icon="share-social-outline"  label="Share contact" chevron={false} />
          <Divider />
          <Row icon="heart-outline"         label="Add to Favourites" chevron={false} />
          <Divider />
          <Row icon="list-outline"          label="Add to list" chevron={false} />
          <Divider />
          <Row icon="share-outline"         label="Export chat" chevron={false} />
          <Divider />
          <TouchableOpacity style={s.row} activeOpacity={0.65}>
            <Text style={[s.rowLabel, { color: '#E53E3E' }]}>Clear chat</Text>
          </TouchableOpacity>
        </View>

        {/* ── Danger zone ── */}
        <View style={[s.card, { backgroundColor: colors.surface, width: width * 0.92 }]}>
          <TouchableOpacity style={s.row} activeOpacity={0.65}>
            <Text style={[s.rowLabel, { color: '#E53E3E' }]}>Block {title}</Text>
          </TouchableOpacity>
          <Divider indent={0} />
          <TouchableOpacity style={s.row} activeOpacity={0.65}>
            <Text style={[s.rowLabel, { color: '#E53E3E' }]}>Report {title}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 130;

const s = StyleSheet.create({
  root:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  headerBtn:   { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' },

  scroll:      { alignItems: 'center', paddingTop: 32 },

  avatarWrap:  { marginBottom: 16 },
  avatar:      { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 },
  avatarLetter: { color: '#fff', fontSize: 52, fontWeight: '800' },

  name:        { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginBottom: 6 },
  bio:         { fontSize: 14, marginBottom: 28 },

  actionsRow:  { flexDirection: 'row', gap: 10, marginBottom: 20 },
  actionBtn:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 14, gap: 6 },
  actionLabel: { fontSize: 13, fontWeight: '700' },

  card:        { borderRadius: 14, marginBottom: 16, overflow: 'hidden' },
  row:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  rowIcon:     { marginRight: 12 },
  rowLabel:    { fontSize: 16 },
  rowValue:    { fontSize: 15, marginRight: 6 },
  rowSub:      { fontSize: 13, marginTop: 2, lineHeight: 18 },
  div:         { height: StyleSheet.hairlineWidth },

  // Viewer
  viewerBg:          { backgroundColor: 'rgba(0,0,0,0.96)' },
  viewerClose:       { position: 'absolute', top: 56, left: 16, zIndex: 10, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  viewerCenter:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  viewerPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  viewerLetter:      { color: '#fff', fontSize: 100, fontWeight: '900' },
  viewerName:        { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
});
