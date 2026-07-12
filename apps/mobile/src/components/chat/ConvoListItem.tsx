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
  lastMessageType?:      'text' | 'image' | 'video' | null;
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
  lastMessageType = 'text',
}: Props) {
  const { colors, fonts } = useTheme();
  const unread = unreadCount > 0;
  const WA_GREEN = '#25D366';

  function formatTime(iso: string | null): string {
    if (!iso) return '';
    const d = dayjs(iso);
    const today = dayjs().startOf('day');
    if (d.isAfter(today)) return d.format('HH:mm');
    if (d.isAfter(today.subtract(1, 'day'))) return 'Yesterday';
    if (d.isAfter(today.subtract(7, 'day'))) return d.format('dddd');
    return d.format('DD/MM/YY');
  }

  // WhatsApp style: no "You:" prefix — the ticks already mark your own messages
  const previewText = lastMessageDeleted
    ? (lastMessageIsMine ? 'You deleted this message' : 'Message deleted')
    : lastMessage ?? 'No messages yet';

  return (
    <TouchableOpacity
      style={s.row}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Avatar — with optional status ring */}
      <TouchableOpacity
        activeOpacity={hasStatus ? 0.75 : 1}
        onPress={hasStatus && onAvatarPress ? onAvatarPress : undefined}
        style={[
          s.avatarWrap,
          hasStatus && {
            borderWidth: 2,
            borderColor: hasUnseenStatus ? '#25D366' : '#8E8E93',
          },
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

      {/* Body — separator is inset: it starts after the avatar, like WhatsApp */}
      <View style={[s.body, { borderBottomColor: colors.separator }]}>
        <View style={s.middle}>
          <Text style={[s.name, { color: colors.text, fontSize: fonts.lg }]} numberOfLines={1}>
            {name}
          </Text>
          <View style={s.previewRow}>
            {lastMessageIsMine && lastMessageStatus && !lastMessageDeleted && (
              <MessageTicks status={lastMessageStatus} accent={colors.tickRead} />
            )}
            {!lastMessageDeleted && lastMessageType === 'image' ? (
              <View style={s.mediaPreviewWrap}>
                <Ionicons name="camera" size={15} color={colors.textSecondary} style={s.mediaIcon} />
                <Text style={[s.preview, { color: colors.textSecondary, fontSize: fonts.md }]} numberOfLines={1}>
                  Photo
                </Text>
              </View>
            ) : !lastMessageDeleted && lastMessageType === 'video' ? (
              <View style={s.mediaPreviewWrap}>
                <Ionicons name="videocam" size={15} color={colors.textSecondary} style={s.mediaIcon} />
                <Text style={[s.preview, { color: colors.textSecondary, fontSize: fonts.md }]} numberOfLines={1}>
                  Video
                </Text>
              </View>
            ) : (
              <Text
                style={[
                  s.preview,
                  { color: colors.textSecondary, fontSize: fonts.md },
                  lastMessageDeleted && s.previewDeleted,
                ]}
                numberOfLines={1}
              >{previewText}</Text>
            )}
          </View>
        </View>

        {/* Right column — time on top (green when unread), badge below */}
        <View style={s.right}>
          <Text
            style={[
              s.time,
              { color: unread ? WA_GREEN : colors.textMuted, fontSize: fonts.sm },
              unread && s.timeUnread,
            ]}
          >
            {formatTime(lastTime)}
          </Text>
          {unread ? (
            <View style={[s.badge, { backgroundColor: WA_GREEN }]}>
              <Text style={s.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          ) : (
            <View style={s.badgeSpacer} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const AVATAR = 54;

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
  },
  avatarWrap: {
    marginRight: 12,
    borderRadius: (AVATAR + 6) / 2,
    padding: 2,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGroup: { backgroundColor: '#3D5A80' },
  avatarText:  { color: '#fff', fontSize: 21, fontWeight: '700' },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingRight: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  middle: { flex: 1, minWidth: 0, gap: 3 },
  name:   { fontWeight: '600' },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  previewDeleted: { fontStyle: 'italic' },
  preview: { flex: 1 },
  mediaPreviewWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mediaIcon: { marginRight: 4 },
  right: { alignItems: 'flex-end', justifyContent: 'center', gap: 5, minWidth: 56 },
  time:  { fontSize: 13 },
  timeUnread: { fontWeight: '600' },
  badge: {
    minWidth: 21,
    height: 21,
    borderRadius: 10.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: '#0B0B0B', fontSize: 12, fontWeight: '700' },
  badgeSpacer: { height: 21 },
});

const t = StyleSheet.create({
  ticks: { flexDirection: 'row', alignItems: 'center' },
  tick1: { marginRight: -8 },
});
