import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';

interface Props {
  content:    string;
  isMine:     boolean;
  status?:    'sent' | 'delivered' | 'read';
  createdAt:  string;
  senderName?: string; // shown in group chats for received messages
}

export default function MessageBubble({ content, isMine, status, createdAt, senderName }: Props) {
  function StatusTicks() {
    if (!isMine || !status) return null;
    if (status === 'sent')      return <Ionicons name="checkmark"        size={14} color="rgba(255,255,255,0.6)" />;
    if (status === 'delivered') return <Ionicons name="checkmark-done"   size={14} color="rgba(255,255,255,0.6)" />;
    if (status === 'read')      return <Ionicons name="checkmark-done"   size={14} color="#34B7F1" />;
    return null;
  }

  return (
    <View style={[s.wrap, isMine ? s.wrapMine : s.wrapTheirs]}>
      {/* Sender name in group chats */}
      {!isMine && senderName && (
        <Text style={s.senderName}>{senderName}</Text>
      )}

      <View style={[s.bubble, isMine ? s.bubbleMine : s.bubbleTheirs]}>
        <Text style={[s.text, isMine ? s.textMine : s.textTheirs]}>
          {content}
        </Text>

        {/* Time + ticks */}
        <View style={s.meta}>
          <Text style={[s.time, isMine ? s.timeMine : s.timeTheirs]}>
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

  senderName:   { fontSize: 12, fontWeight: '700', color: '#8E8E93', marginLeft: 14, marginBottom: 2 },

  bubble:       { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 6 },
  bubbleMine:   { backgroundColor: '#0D1B2A', borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: '#2C2C2E', borderBottomLeftRadius: 4 },

  text:         { fontSize: 15, lineHeight: 21 },
  textMine:     { color: '#fff' },
  textTheirs:   { color: '#FFFFFF' },

  meta:         { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3, alignSelf: 'flex-end' },
  time:         { fontSize: 11 },
  timeMine:     { color: 'rgba(255,255,255,0.55)' },
  timeTheirs:   { color: '#8E8E93' },
});
