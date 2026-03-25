import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useTheme } from '../../hooks/useTheme';

dayjs.extend(relativeTime);

interface Props {
  name:                string;
  avatarLetter:        string;
  lastMessage:         string | null;
  lastTime:            string | null;
  lastMessageStatus:   'sent' | 'delivered' | 'read' | null;
  lastMessageIsMine:   boolean;
  unreadCount:         number;
  isGroup:             boolean;
  onPress:             () => void;
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
  name, avatarLetter, lastMessage, lastTime,
  lastMessageStatus, lastMessageIsMine,
  unreadCount, isGroup, onPress,
}: Props) {
  const { colors } = useTheme();

  function formatTime(iso: string | null): string {
    if (!iso) return '';
    const d = dayjs(iso);
    if (d.isAfter(dayjs().subtract(1, 'day'))) return d.format('HH:mm');
    if (d.isAfter(dayjs().subtract(7, 'day'))) return d.format('ddd');
    return d.format('DD/MM/YY');
  }

  const previewText = lastMessage
    ? (lastMessageIsMine ? `You: ${lastMessage}` : lastMessage)
    : 'No messages yet';

  return (
    <TouchableOpacity
      style={[s.row, { backgroundColor: colors.background }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={[s.avatar, isGroup ? s.avatarGroup : { backgroundColor: colors.avatarBg }]}>
        {isGroup
          ? <Ionicons name="people" size={22} color="#fff" />
          : <Text style={s.avatarText}>{avatarLetter.toUpperCase()}</Text>
        }
      </View>

      {/* Middle */}
      <View style={s.middle}>
        <Text style={[s.name, { color: colors.text }]} numberOfLines={1}>{name}</Text>
        <View style={s.previewRow}>
          {lastMessageIsMine && lastMessageStatus && (
            <MessageTicks status={lastMessageStatus} accent={colors.accent} />
          )}
          <Text style={[s.preview, { color: colors.textSecondary }]} numberOfLines={1}>{previewText}</Text>
        </View>
      </View>

      {/* Right */}
      <View style={s.right}>
        <Text style={[s.time, { color: unreadCount > 0 ? colors.accent : colors.textMuted }, unreadCount > 0 && s.timeUnread]}>
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
  row:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  avatar:      { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarGroup: { backgroundColor: '#3D5A80' },
  avatarText:  { color: '#fff', fontSize: 20, fontWeight: '700' },
  middle:      { flex: 1, gap: 3 },
  name:        { fontSize: 15, fontWeight: '700' },
  previewRow:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
  preview:     { fontSize: 13, flex: 1 },
  right:       { alignItems: 'flex-end', gap: 6, minWidth: 48 },
  time:        { fontSize: 12 },
  timeUnread:  { fontWeight: '700' },
  badge:       { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText:   { color: '#fff', fontSize: 11, fontWeight: '800' },
});

const t = StyleSheet.create({
  ticks: { flexDirection: 'row', alignItems: 'center' },
  tick1: { marginRight: -8 },
});
