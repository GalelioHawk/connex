import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView,
  ActivityIndicator, Image, Alert, Switch, Modal, TextInput, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { isRunningInExpoGo } from 'expo';
import { useNavigation } from '@react-navigation/native';
import { useAction, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import { useThemeStore } from '../../store/themeStore';
import { useSettingsStore } from '../../store/settingsStore';
import type { Id } from '../../../convex/_generated/dataModel';
import type { PrivacyLevel } from '../../types';

// ─── Constants ────────────────────────────────────────────────────────────────
const BUBBLE_COLORS = [
  '#1E5A9C', '#2B7A78', '#0D47A1', '#1565C0',
  '#6A1B9A', '#AD1457', '#C62828', '#E65100',
  '#2E7D32', '#00838F', '#F9A825', '#37474F',
];

const SA_PROVINCES = [
  'Gauteng', 'Western Cape', 'Eastern Cape', 'KwaZulu-Natal',
  'Limpopo', 'Mpumalanga', 'North West', 'Free State', 'Northern Cape',
];

const PRIVACY_LABELS: Record<PrivacyLevel, string> = {
  everyone: 'Everyone',
  contacts: 'My contacts',
  nobody:   'Nobody',
};

const FONT_SIZE_LABELS = { small: 'Small', medium: 'Medium', large: 'Large' };
const MEDIA_LABELS     = { wifi: 'Wi-Fi only', mobile: 'Wi-Fi & mobile data', never: 'Never' };

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  const { colors } = useTheme();
  return (
    <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>
      {title.toUpperCase()}
    </Text>
  );
}

interface RowProps {
  icon:             string;
  iconColor?:       string;
  label:            string;
  value?:           string;
  onPress?:         () => void;
  isSwitch?:        boolean;
  switchValue?:     boolean;
  onSwitchChange?:  (v: boolean) => void;
  isDanger?:        boolean;
  isLast?:          boolean;
}

function Row({ icon, iconColor, label, value, onPress, isSwitch, switchValue, onSwitchChange, isDanger, isLast }: RowProps) {
  const { colors, fonts } = useTheme();
  const ic = isDanger ? '#E53935' : (iconColor ?? colors.accent);
  return (
    <TouchableOpacity
      style={[s.row, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress && !isSwitch}
      activeOpacity={0.65}
    >
      <View style={[s.rowIconWrap, { backgroundColor: isDanger ? 'rgba(229,57,53,0.1)' : colors.surface2 }]}>
        <Ionicons name={icon as any} size={17} color={ic} />
      </View>
      <Text style={[s.rowLabel, { color: isDanger ? '#E53935' : colors.text, fontSize: fonts.body }]} numberOfLines={1}>
        {label}
      </Text>
      <View style={s.rowRight}>
        {value !== undefined && (
          <Text style={[s.rowValue, { color: colors.textSecondary, fontSize: fonts.md }]} numberOfLines={1}>{value}</Text>
        )}
        {isSwitch
          ? <Switch value={switchValue} onValueChange={onSwitchChange} trackColor={{ true: colors.accent }} />
          : onPress && <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
        }
      </View>
    </TouchableOpacity>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {children}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { colors, fonts } = useTheme();
  const { isDark, toggleTheme } = useThemeStore();
  const settings   = useSettingsStore();
  const user       = useAuthStore((s) => s.user);
  const sessionId  = useAuthStore((s) => s.sessionId);
  const clearAuth  = useAuthStore((s) => s.clearAuth);
  const updateUser = useAuthStore((s) => s.updateUser);

  const sid = sessionId as Id<'sessions'>;

  // Generic option sheet state
  const [optionSheet, setOptionSheet] = useState<{
    title:    string;
    options:  Array<{ label: string; value: string }>;
    current:  string;
    onSelect: (value: string) => Promise<void> | void;
  } | null>(null);

  // Modal state
  const [colorModal,    setColorModal]    = useState(false);
  const [provinceModal, setProvinceModal] = useState(false);
  const [editModal, setEditModal] = useState<{
    field: 'name' | 'bio'; title: string;
  } | null>(null);
  const [editValue, setEditValue] = useState('');

  // Change password modal
  const [pwModal,    setPwModal]    = useState(false);
  const [oldPw,      setOldPw]      = useState('');
  const [newPw,      setNewPw]      = useState('');
  const [confirmPw,  setConfirmPw]  = useState('');
  const [changingPw, setChangingPw] = useState(false);

  // Loading states
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [signingOut,      setSigningOut]      = useState(false);

  // Convex
  const updateProfileMut     = useMutation(api.users.updateProfile);
  const updatePrivacyMut     = useMutation(api.users.updatePrivacy);
  const setBubbleColorMut    = useMutation(api.users.setBubbleColor);
  const logoutAction         = useAction(api.auth.logout);
  const uploadAvatarAction   = useAction(api.users.uploadAvatar);
  const changePasswordAction = useAction(api.auth.changePassword);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  async function handleAvatarPress() {
    if (uploadingAvatar || !user || !sessionId) return;
    setUploadingAvatar(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) throw new Error('Photo library permission denied.');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8, base64: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (!asset.base64) throw new Error('Could not read image data.');
      const { avatar_url } = await uploadAvatarAction({
        sessionId: sid, imageBase64: asset.base64, mimeType: asset.mimeType ?? 'image/jpeg',
      });
      updateUser({ avatar_url });
    } catch (e: any) {
      const msg = e.message ?? 'Could not upload photo.';
      if (msg !== 'No image selected.') Alert.alert('Error', msg);
    } finally {
      setUploadingAvatar(false);
    }
  }

  function openEdit(field: 'name' | 'bio', title: string) {
    setEditValue(field === 'name' ? (user?.name ?? '') : (user?.bio ?? ''));
    setEditModal({ field, title });
  }

  async function saveEdit() {
    if (!editModal) return;
    const val = editValue.trim();
    if (editModal.field === 'name' && !val) return;
    try {
      await updateProfileMut({ sessionId: sid, [editModal.field]: val });
      updateUser(editModal.field === 'name' ? { name: val } : { bio: val });
      setEditModal(null);
    } catch { Alert.alert('Error', 'Could not save changes.'); }
  }

  function openOptionSheet(
    title:    string,
    options:  Array<{ label: string; value: string }>,
    current:  string,
    onSelect: (value: string) => Promise<void> | void,
  ) {
    setOptionSheet({ title, options, current, onSelect });
  }

  function showPrivacySheet(label: string, current: PrivacyLevel, convexField: string, userField: string) {
    openOptionSheet(
      label,
      [
        { label: 'Everyone',     value: 'everyone' },
        { label: 'My contacts',  value: 'contacts' },
        { label: 'Nobody',       value: 'nobody'   },
      ],
      current,
      async (val) => {
        try {
          await updatePrivacyMut({ sessionId: sid, [convexField]: val } as any);
          updateUser({ [userField]: val } as any);
        } catch { Alert.alert('Error', 'Could not save.'); }
      },
    );
  }

  async function handlePrivacySwitch(convexField: string, userField: string, val: boolean) {
    try {
      await updatePrivacyMut({ sessionId: sid, [convexField]: val } as any);
      updateUser({ [userField]: val } as any);
    } catch { Alert.alert('Error', 'Could not save.'); }
  }

  async function handleBubbleColor(color: string) {
    try {
      await setBubbleColorMut({ sessionId: sid, bubbleColor: color });
      updateUser({ bubble_color: color });
    } catch { Alert.alert('Error', 'Could not save colour.'); }
  }

  async function selectProvince(province: string) {
    setProvinceModal(false);
    try {
      await updateProfileMut({ sessionId: sid, province });
      updateUser({ province });
    } catch { Alert.alert('Error', 'Could not save province.'); }
  }

  function showThemeSheet() {
    openOptionSheet(
      'Theme',
      [{ label: 'Dark', value: 'dark' }, { label: 'Light', value: 'light' }],
      isDark ? 'dark' : 'light',
      (val) => { if (val === 'dark' && !isDark) toggleTheme(); if (val === 'light' && isDark) toggleTheme(); },
    );
  }

  function showFontSizeSheet() {
    openOptionSheet(
      'Font size',
      [{ label: 'Small', value: 'small' }, { label: 'Medium', value: 'medium' }, { label: 'Large', value: 'large' }],
      settings.fontSize,
      (val) => settings.set({ fontSize: val as any }),
    );
  }

  function showMediaSheet() {
    openOptionSheet(
      'Auto-download media',
      [{ label: 'Wi-Fi only', value: 'wifi' }, { label: 'Wi-Fi & mobile data', value: 'mobile' }, { label: 'Never', value: 'never' }],
      settings.mediaAutoDownload,
      (val) => settings.set({ mediaAutoDownload: val as any }),
    );
  }

  async function handlePreviewToggle(val: boolean) {
    settings.set({ notificationPreview: val });
    try { await updateProfileMut({ sessionId: sid, notificationPreview: val }); } catch { /* non-fatal */ }
  }

  async function handleNotificationsToggle(val: boolean) {
    settings.set({ notificationsEnabled: val });
    if (isRunningInExpoGo()) return;
    try {
      if (!val) {
        await updateProfileMut({ sessionId: sid, fcmToken: '' });
      } else {
        const { status } = await Notifications.getPermissionsAsync();
        if (status === 'granted') {
          const tokenData = await Notifications.getDevicePushTokenAsync();
          if (tokenData.data) {
            await updateProfileMut({ sessionId: sid, fcmToken: tokenData.data });
          }
        }
      }
    } catch { /* non-fatal */ }
  }

  async function handleChangePassword() {
    if (!oldPw || !newPw || !confirmPw) {
      Alert.alert('Error', 'Please fill in all fields.'); return;
    }
    if (newPw !== confirmPw) {
      Alert.alert('Error', 'New passwords do not match.'); return;
    }
    if (newPw.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters.'); return;
    }
    setChangingPw(true);
    try {
      await changePasswordAction({ sessionId: sid, currentPassword: oldPw, newPassword: newPw });
      setPwModal(false);
      setOldPw(''); setNewPw(''); setConfirmPw('');
      Alert.alert('Success', 'Password changed successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not change password.');
    } finally {
      setChangingPw(false);
    }
  }

  function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try { await logoutAction({ sessionId: sid }); } catch {}
          clearAuth();
          setSigningOut(false);
        },
      },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete account',
      'This will permanently delete your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete my account', style: 'destructive',
          onPress: () => Alert.alert('Coming soon', 'Account deletion will be available in the next update.'),
        },
      ],
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />

      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Text style={[s.headerTitle, { color: colors.text }]}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Avatar + identity ──────────────────────────────────────── */}
        <View style={s.avatarSection}>
          <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.8} style={s.avatarWrap}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={s.avatarImg} />
            ) : (
              <View style={[s.avatarPlaceholder, { backgroundColor: colors.avatarBg }]}>
                <Text style={s.avatarInitial}>{user?.name?.charAt(0).toUpperCase() ?? '?'}</Text>
              </View>
            )}
            <View style={[s.avatarBadge, { backgroundColor: colors.accent }]}>
              {uploadingAvatar
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="camera" size={14} color="#fff" />}
            </View>
          </TouchableOpacity>
          <Text style={[s.userName, { color: colors.text, fontSize: fonts.xxl }]}>{user?.name ?? 'User'}</Text>
          <Text style={[s.userPhone, { color: colors.textSecondary, fontSize: fonts.sm }]}>{user?.phone ?? ''}</Text>
        </View>

        {/* ── Account ────────────────────────────────────────────────── */}
        <SectionHeader title="Account" />
        <SectionCard>
          <Row icon="person-outline"   label="Name"             value={user?.name ?? ''} onPress={() => openEdit('name', 'Edit name')} />
          <Row icon="chatbox-outline"  label="Bio"              value={user?.bio  ?? 'Tap to add'} onPress={() => openEdit('bio', 'Edit bio')} />
          <Row icon="location-outline" label="Province"         value={user?.province ?? 'Not set'} onPress={() => setProvinceModal(true)} />
          <Row icon="lock-closed-outline" label="Change password" onPress={() => setPwModal(true)} isLast />
        </SectionCard>

        {/* ── Privacy ────────────────────────────────────────────────── */}
        <SectionHeader title="Privacy" />
        <SectionCard>
          <Row
            icon="time-outline" label="Last seen"
            value={PRIVACY_LABELS[user?.show_last_seen ?? 'everyone']}
            onPress={() => showPrivacySheet('Last seen', user?.show_last_seen ?? 'everyone', 'showLastSeen', 'show_last_seen')}
          />
          <Row
            icon="eye-outline" label="Profile photo"
            value={PRIVACY_LABELS[user?.show_profile_photo ?? 'everyone']}
            onPress={() => showPrivacySheet('Profile photo', user?.show_profile_photo ?? 'everyone', 'showProfilePhoto', 'show_profile_photo')}
          />
          <Row
            icon="radio-button-on-outline" label="Online status"
            value={PRIVACY_LABELS[user?.show_online_status ?? 'everyone']}
            onPress={() => showPrivacySheet('Online status', user?.show_online_status ?? 'everyone', 'showOnlineStatus', 'show_online_status')}
          />
          <Row
            icon="checkmark-done-outline" label="Read receipts"
            isSwitch switchValue={user?.read_receipts ?? true}
            onSwitchChange={(v) => handlePrivacySwitch('readReceipts', 'read_receipts', v)}
          />
          <Row
            icon="call-outline" label="Show my phone number to others"
            isSwitch switchValue={user?.show_phone ?? true}
            onSwitchChange={(v) => handlePrivacySwitch('showPhone', 'show_phone', v)}
            isLast
          />
        </SectionCard>

        {/* ── Appearance ─────────────────────────────────────────────── */}
        <SectionHeader title="Appearance" />
        <SectionCard>
          <Row
            icon="ellipse-outline" label="Message bubble colour"
            value={user?.bubble_color ? '' : 'Default blue'}
            onPress={() => setColorModal(true)}
            isLast={false}
          >
            {user?.bubble_color && (
              <View style={[s.colorDot, { backgroundColor: user.bubble_color }]} />
            )}
          </Row>
          <Row
            icon="text-outline" label="Font size"
            value={FONT_SIZE_LABELS[settings.fontSize]}
            onPress={showFontSizeSheet}
            isLast
          />
        </SectionCard>

        {/* ── Notifications ──────────────────────────────────────────── */}
        <SectionHeader title="Notifications" />
        <SectionCard>
          <Row icon="notifications-outline"  label="Message notifications" isSwitch switchValue={settings.notificationsEnabled} onSwitchChange={handleNotificationsToggle} />
          <Row icon="reader-outline"         label="Show message preview"  isSwitch switchValue={settings.notificationPreview}  onSwitchChange={handlePreviewToggle} />
          <Row icon="volume-high-outline"    label="Sound"                 isSwitch switchValue={settings.notificationSound}    onSwitchChange={(v) => settings.set({ notificationSound: v })} />
          <Row icon="phone-portrait-outline" label="Vibrate"               isSwitch switchValue={settings.notificationVibrate}  onSwitchChange={(v) => settings.set({ notificationVibrate: v })} isLast />
        </SectionCard>

        {/* ── SOS ────────────────────────────────────────────────────── */}
        <SectionHeader title="SOS" />
        <SectionCard>
          <Row icon="shield-outline" label="My SOS contacts" onPress={() => navigation.navigate('Chat', { screen: 'SOSContacts' })} isLast />
        </SectionCard>

        {/* ── Storage & Data ─────────────────────────────────────────── */}
        <SectionHeader title="Storage & Data" />
        <SectionCard>
          <Row
            icon="cloud-download-outline" label="Auto-download media"
            value={MEDIA_LABELS[settings.mediaAutoDownload]}
            onPress={showMediaSheet}
          />
          <Row
            icon="trash-outline" label="Clear media cache"
            onPress={() => Alert.alert('Clear cache', 'Cached media will be deleted.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear', style: 'destructive', onPress: () => {} },
            ])}
            isLast
          />
        </SectionCard>

        {/* ── About ──────────────────────────────────────────────────── */}
        <SectionHeader title="About" />
        <SectionCard>
          <Row icon="information-circle-outline" label="App version"    value="1.0.0" />
          <Row icon="help-circle-outline"        label="Help & support" onPress={() => Alert.alert('Help', 'Email us at support@connexsa.co.za')} />
          <Row icon="document-text-outline"      label="Terms of service" onPress={() => {}} />
          <Row icon="shield-checkmark-outline"   label="Privacy policy"   onPress={() => {}} isLast />
        </SectionCard>

        {/* ── Sign out / Delete ───────────────────────────────────────── */}
        <SectionCard>
          <Row
            icon="log-out-outline" label={signingOut ? 'Signing out…' : 'Sign out'}
            isDanger onPress={handleSignOut} />
          <Row
            icon="person-remove-outline" label="Delete account"
            isDanger onPress={handleDeleteAccount} isLast />
        </SectionCard>

        <View style={s.footer} />
      </ScrollView>

      {/* ── Edit text modal ───────────────────────────────────────────────── */}
      <Modal visible={!!editModal} transparent animationType="fade" onRequestClose={() => setEditModal(null)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { backgroundColor: colors.surface }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>{editModal?.title}</Text>
            <TextInput
              style={[s.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 }]}
              value={editValue}
              onChangeText={setEditValue}
              autoFocus
              multiline={editModal?.field === 'bio'}
              numberOfLines={editModal?.field === 'bio' ? 3 : 1}
              maxLength={editModal?.field === 'bio' ? 120 : 50}
              placeholderTextColor={colors.textMuted}
              placeholder={editModal?.field === 'bio' ? 'Write something about yourself…' : 'Your name'}
            />
            <View style={s.modalActions}>
              <TouchableOpacity style={[s.modalBtn, { borderColor: colors.border }]} onPress={() => setEditModal(null)}>
                <Text style={[s.modalBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, s.modalBtnSave, { backgroundColor: colors.accent }]} onPress={saveEdit}>
                <Text style={[s.modalBtnText, { color: '#fff' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Change password modal ────────────────────────────────────────────── */}
      <Modal visible={pwModal} transparent animationType="fade" onRequestClose={() => setPwModal(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { backgroundColor: colors.surface }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>Change password</Text>
            {([
              { placeholder: 'Current password',     value: oldPw,     onChange: setOldPw },
              { placeholder: 'New password',          value: newPw,     onChange: setNewPw },
              { placeholder: 'Confirm new password',  value: confirmPw, onChange: setConfirmPw },
            ] as const).map(({ placeholder, value, onChange }) => (
              <TextInput
                key={placeholder}
                style={[s.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 }]}
                value={value}
                onChangeText={onChange as (v: string) => void}
                placeholder={placeholder}
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
              />
            ))}
            <View style={s.modalActions}>
              <TouchableOpacity
                style={[s.modalBtn, { borderColor: colors.border }]}
                onPress={() => { setPwModal(false); setOldPw(''); setNewPw(''); setConfirmPw(''); }}
              >
                <Text style={[s.modalBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, s.modalBtnSave, { backgroundColor: colors.accent }]}
                onPress={handleChangePassword}
                disabled={changingPw}
              >
                {changingPw
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={[s.modalBtnText, { color: '#fff' }]}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Generic option sheet ──────────────────────────────────────────────── */}
      <Modal visible={!!optionSheet} transparent animationType="slide" onRequestClose={() => setOptionSheet(null)}>
        <View style={s.sheetOverlay}>
          <View style={[s.sheet, { backgroundColor: colors.surface }]}>
            <Text style={[s.sheetTitle, { color: colors.text }]}>{optionSheet?.title}</Text>
            <FlatList
              data={optionSheet?.options ?? []}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.sheetRow, { borderBottomColor: colors.border }]}
                  onPress={async () => {
                    setOptionSheet(null);
                    await optionSheet?.onSelect(item.value);
                  }}
                >
                  <Text style={[s.sheetRowText, { color: colors.text }]}>{item.label}</Text>
                  {optionSheet?.current === item.value && (
                    <Ionicons name="checkmark" size={18} color={colors.accent} />
                  )}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={[s.sheetCancel, { borderTopColor: colors.border }]} onPress={() => setOptionSheet(null)}>
              <Text style={[s.sheetCancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Province picker modal ─────────────────────────────────────────── */}
      <Modal visible={provinceModal} transparent animationType="slide" onRequestClose={() => setProvinceModal(false)}>
        <View style={s.sheetOverlay}>
          <View style={[s.sheet, { backgroundColor: colors.surface }]}>
            <Text style={[s.sheetTitle, { color: colors.text }]}>Select province</Text>
            <FlatList
              data={SA_PROVINCES}
              keyExtractor={(p) => p}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.sheetRow, { borderBottomColor: colors.border }]}
                  onPress={() => selectProvince(item)}
                >
                  <Text style={[s.sheetRowText, { color: colors.text }]}>{item}</Text>
                  {user?.province === item && <Ionicons name="checkmark" size={18} color={colors.accent} />}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={[s.sheetCancel, { borderTopColor: colors.border }]} onPress={() => setProvinceModal(false)}>
              <Text style={[s.sheetCancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Bubble colour picker modal ────────────────────────────────────── */}
      <Modal visible={colorModal} transparent animationType="fade" onRequestClose={() => setColorModal(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { backgroundColor: colors.surface }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>Message bubble colour</Text>
            <Text style={[s.colorHint, { color: colors.textSecondary }]}>
              This is the colour others see on your messages
            </Text>
            <View style={s.colorGrid}>
              {BUBBLE_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[s.colorSwatch, { backgroundColor: c },
                    user?.bubble_color === c && { borderWidth: 3, borderColor: '#fff' },
                  ]}
                  onPress={async () => { await handleBubbleColor(c); setColorModal(false); }}
                >
                  {user?.bubble_color === c && <Ionicons name="checkmark" size={16} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[s.modalBtn, { borderColor: colors.border, marginTop: 12, alignSelf: 'center', paddingHorizontal: 32 }]} onPress={() => setColorModal(false)}>
              <Text style={[s.modalBtnText, { color: colors.textSecondary }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Workaround: Row with children ────────────────────────────────────────────
// TypeScript needs this to allow children on Row
declare module 'react' {
  interface FunctionComponent<P = object> {
    (props: P & { children?: React.ReactNode }, context?: any): React.ReactElement | null;
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:            { flex: 1 },
  header:          { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle:     { fontSize: 26, fontWeight: '900', letterSpacing: -0.8 },
  scroll:          { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
  // Avatar
  avatarSection:   { alignItems: 'center', paddingVertical: 24 },
  avatarWrap:      { position: 'relative', marginBottom: 12 },
  avatarImg:       { width: 90, height: 90, borderRadius: 45 },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center' },
  avatarInitial:   { color: '#fff', fontSize: 36, fontWeight: '900' },
  avatarBadge:     { position: 'absolute', bottom: 2, right: 2, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  userName:        { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  userPhone:       { fontSize: 14, marginTop: 2 },
  // Section
  sectionTitle:    { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: 20, marginBottom: 6, marginLeft: 4 },
  card:            { borderRadius: 14, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  // Row
  row:             { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, minHeight: 52 },
  rowIconWrap:     { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowLabel:        { flex: 1, fontSize: 15, fontWeight: '500' },
  rowRight:        { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '45%' },
  rowValue:        { fontSize: 14, textAlign: 'right', flexShrink: 1 },
  colorDot:        { width: 20, height: 20, borderRadius: 10 },
  footer:          { height: 20 },
  // Edit modal
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox:        { width: '100%', borderRadius: 18, padding: 22 },
  modalTitle:      { fontSize: 18, fontWeight: '800', marginBottom: 14 },
  modalInput:      { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, marginBottom: 16 },
  modalActions:    { flexDirection: 'row', gap: 10 },
  modalBtn:        { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 12, alignItems: 'center' },
  modalBtnSave:    { borderWidth: 0 },
  modalBtnText:    { fontSize: 15, fontWeight: '700' },
  // Province sheet
  sheetOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:           { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  sheetTitle:      { fontSize: 17, fontWeight: '800', padding: 18, paddingBottom: 10 },
  sheetRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  sheetRowText:    { fontSize: 16 },
  sheetCancel:     { alignItems: 'center', padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  sheetCancelText: { fontSize: 15, fontWeight: '600' },
  // Colour modal
  colorHint:       { fontSize: 13, marginBottom: 16 },
  colorGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  colorSwatch:     { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
