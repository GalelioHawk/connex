import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useTheme } from '../../hooks/useTheme';

interface Props {
  content:    string;
  isMine:     boolean;
  status?:    'sent' | 'delivered' | 'read';
  createdAt:  string;
  senderName?: string;
}

export default function MessageBubble({ content, isMine, status, createdAt, senderName }: Props) {
  const { colors } = useTheme();

  function StatusTicks() {
    if (!isMine || !status) return null;
    if (status === 'sent')      return <Ionicons name="checkmark"      size={14} color={colors.tickDefault} />;
    if (status === 'delivered') return <Ionicons name="checkmark-done" size={14} color={colors.tickDefault} />;
    if (status === 'read')      return <Ionicons name="checkmark-done" size={14} color={colors.tickRead} />;
    return null;
  }

  return (
    <View style={[s.wrap, isMine ? s.wrapMine : s.wrapTheirs]}>
      {!isMine && senderName && (
        <Text style={[s.senderName, { color: colors.textSecondary }]}>{senderName}</Text>
      )}

      <View style={[
        s.bubble,
        isMine
          ? [s.bubbleMine,   { backgroundColor: colors.bubbleMine }]
          : [s.bubbleTheirs, { backgroundColor: colors.bubbleTheirs }],
      ]}>
        <Text style={[s.text, { color: isMine ? colors.bubbleTextMine : colors.bubbleTextTheirs }]}>
          {content}
        </Text>

        <View style={s.meta}>
          <Text style={[s.time, { color: isMine ? colors.tickDefault : colors.textSecondary }]}>
            {dayjs(createdAt).format('HH:mm')}
          </Text>
          <StatusTicks />
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap:         { paddingHorizontal: 12, paddingVertical: 2 },
  wrapMine:     { alignItems: 'flex-end' },
  wrapTheirs:   { alignItems: 'flex-start' },
  senderName:   { fontSize: 12, fontWeight: '700', marginLeft: 14, marginBottom: 2 },
  bubble:       { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 6 },
  bubbleMine:   { borderBottomRightRadius: 4 },
  bubbleTheirs: { borderBottomLeftRadius: 4 },
  text:         { fontSize: 15, lineHeight: 21 },
  meta:         { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3, alignSelf: 'flex-end' },
  time:         { fontSize: 11 },
});
