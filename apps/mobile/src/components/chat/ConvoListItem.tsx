import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface Props {
  name:         string;
  avatarLetter: string;
  lastMessage:  string | null;
  lastTime:     string | null;
  unreadCount:  number;
  isGroup:      boolean;
  onPress:      () => void;
}

export default function ConvoListItem({
  name, avatarLetter, lastMessage, lastTime, unreadCount, isGroup, onPress,
}: Props) {
  function formatTime(iso: string | null): string {
    if (!iso) return '';
    const d = dayjs(iso);
    if (d.isAfter(dayjs().subtract(1, 'day'))) return d.format('HH:mm');
    if (d.isAfter(dayjs().subtract(7, 'day'))) return d.format('ddd');
    return d.format('DD/MM/YY');
  }

  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.7}>
      {/* Avatar */}
      <View style={[s.avatar, isGroup && s.avatarGroup]}>
        {isGroup
          ? <Ionicons name="people" size={22} color="#fff" />
          : <Text style={s.avatarText}>{avatarLetter.toUpperCase()}</Text>
        }
      </View>

      {/* Middle */}
      <View style={s.middle}>
        <Text style={s.name} numberOfLines={1}>{name}</Text>
        <Text style={s.preview} numberOfLines={1}>
          {lastMessage ?? 'No messages yet'}
        </Text>
      </View>

      {/* Right */}
      <View style={s.right}>
        <Text style={[s.time, unreadCount > 0 && s.timeUnread]}>
          {formatTime(lastTime)}
        </Text>
        {unreadCount > 0 && (
          <View style={s.badge}>
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
  row:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#111111' },
  avatar:      { width: 50, height: 50, borderRadius: 25, backgroundColor: '#1E3A5F', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarGroup: { backgroundColor: '#3D5A80' },
  avatarText:  { color: '#fff', fontSize: 20, fontWeight: '700' },
  middle:      { flex: 1, gap: 3 },
  name:        { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  preview:     { fontSize: 13, color: '#8E8E93' },
  right:       { alignItems: 'flex-end', gap: 6, minWidth: 48 },
  time:        { fontSize: 12, color: '#6C6C6E' },
  timeUnread:  { color: '#00A86B', fontWeight: '700' },
  badge:       { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#00A86B', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText:   { color: '#fff', fontSize: 11, fontWeight: '800' },
});
