import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useTheme } from '../../hooks/useTheme';

dayjs.extend(relativeTime);

interface Props {
  name:                  string;
  avatarLetter:          string;
  avatarUrl?:            string | null;
  lastMessage:           string | null;
  lastMessageDeleted?:   boolean;
  lastTime:              string | null;
  lastMessageStatus:     'sent' | 'delivered' | 'read' | null;
  lastMessageIsMine:     boolean;
  unreadCount:           number;
  isGroup:               boolean;
  onPress:               () => void;
  hasStatus?:            boolean;
  hasUnseenStatus?:      boolean;
  onAvatarPress?:        () => void;
}

function MessageTicks({ status, accent }: { status: 'sent' | 'delivered' | 'read'; accent: string }) {
  const grey = '#8E8E93';
  if (status === 'sent') {
    return <Ionicons name="checkmark" size={15} color={grey} />;
  }
  if (status === 'delivered') {
    return (
      <View style={t.ticks}>
        <Ionicons name="checkmark" size={15} color={grey} style={t.tick1} />
        <Ionicons name="checkmark" size={15} color={grey} />
      </View>
    );
  }
  return (
    <View style={t.ticks}>
      <Ionicons name="checkmark" size={15} color={accent} style={t.tick1} />
      <Ionicons name="checkmark" size={15} color={accent} />
    </View>
  );
}

export default function ConvoListItem({
  name, avatarLetter, avatarUrl, lastMessage, lastMessageDeleted, lastTime,
  lastMessageStatus, lastMessageIsMine,
  unreadCount, isGroup, onPress,
  hasStatus, hasUnseenStatus, onAvatarPress,
}: Props) {
  const { colors, fonts } = useTheme();

  function formatTime(iso: string | null): string {
    if (!iso) return '';
    const d = dayjs(iso);
    const today = dayjs().startOf('day');
    if (d.isAfter(today)) return d.format('HH:mm');
    if (d.isAfter(today.subtract(1, 'day'))) return 'Yesterday';
    if (d.isAfter(today.subtract(7, 'day'))) return d.format('ddd');
    return d.format('DD/MM/YY');
  }

  const previewText = lastMessageDeleted
    ? (lastMessageIsMine ? 'You deleted this message' : 'Message deleted')
    : lastMessage
      ? (lastMessageIsMine ? `You: ${lastMessage}` : lastMessage)
      : 'No messages yet';

  return (
    <TouchableOpacity
      style={[s.row, { backgroundColor: colors.background, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Avatar — with optional status ring */}
      <TouchableOpacity
        activeOpacity={hasStatus ? 0.75 : 1}
        onPress={hasStatus && onAvatarPress ? onAvatarPress : undefined}
        style={[
          s.avatarWrap,
          hasStatus && { borderWidth: 2.5, borderRadius: 32, borderColor: hasUnseenStatus ? '#25D366' : '#8E8E93' },
        ]}
      >
        {!isGroup && avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={s.avatar} />
        ) : (
          <View style={[s.avatar, isGroup ? s.avatarGroup : { backgroundColor: colors.avatarBg }]}>
            {isGroup
              ? <Ionicons name="people" size={22} color="#fff" />
              : <Text style={s.avatarText}>{avatarLetter.toUpperCase()}</Text>
            }
          </View>
        )}
      </TouchableOpacity>

      {/* Middle */}
      <View style={s.middle}>
        <Text style={[s.name, { color: colors.text, fontSize: fonts.lg }]} numberOfLines={1}>{name}</Text>
        <View style={s.previewRow}>
          {lastMessageIsMine && lastMessageStatus && (
            <MessageTicks status={lastMessageStatus} accent={colors.accent} />
          )}
          <Text
            style={[s.preview, { color: colors.textSecondary, fontSize: fonts.md }, lastMessageDeleted && s.previewDeleted]}
            numberOfLines={1}
          >{previewText}</Text>
        </View>
      </View>

      {/* Right */}
      <View style={s.right}>
        <Text style={[s.time, { color: unreadCount > 0 ? colors.accent : colors.textMuted, fontSize: fonts.sm }, unreadCount > 0 && s.timeUnread]}>
          {formatTime(lastTime)}
        </Text>
        {unreadCount > 0 && (
          <View style={[s.badge, { backgroundColor: colors.accent }]}>
            <Text style={s.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  row:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  avatarWrap:  { marginRight: 14, borderRadius: 32, padding: 2 },
  avatar:      { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarGroup: { backgroundColor: '#3D5A80' },
  avatarText:  { color: '#fff', fontSize: 22, fontWeight: '700' },
  middle:      { flex: 1, gap: 4 },
  name:        { fontSize: 17, fontWeight: '700' },
  previewRow:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  previewDeleted: { fontStyle: 'italic' },
  preview:     { fontSize: 15, flex: 1 },
  right:       { alignItems: 'flex-end', gap: 6, minWidth: 52 },
  time:        { fontSize: 13 },
  timeUnread:  { fontWeight: '700' },
  badge:       { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText:   { color: '#fff', fontSize: 12, fontWeight: '800' },
});

const t = StyleSheet.create({
  ticks: { flexDirection: 'row', alignItems: 'center' },
  tick1: { marginRight: -8 },
});
