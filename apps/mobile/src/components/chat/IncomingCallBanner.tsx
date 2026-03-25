import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuthStore } from '../../store/authStore';
import { navigationRef } from '../../navigation/navigationRef';
import type { Id } from '../../../convex/_generated/dataModel';

export default function IncomingCallBanner() {
  const sessionId      = useAuthStore((s) => s.sessionId);
  const acceptCallMut  = useMutation(api.calls.acceptCall);
  const endCallMut     = useMutation(api.calls.endCall);

  const incoming = useQuery(
    api.calls.getIncomingCall,
    sessionId ? { sessionId: sessionId as Id<'sessions'> } : 'skip',
  );

  if (!incoming) return null;

  async function accept() {
    if (!sessionId || !incoming) return;
    try {
      await acceptCallMut({
        sessionId: sessionId as Id<'sessions'>,
        callId:    incoming.callId as Id<'calls'>,
      });
      (navigationRef.current as any)?.navigate('Chat', {
        screen: 'Call',
        params: {
          callId:            incoming.callId,
          channelName:       incoming.channelName,
          callType:          incoming.callType,
          otherUserName:     incoming.callerName,
          otherUserAvatarUrl: incoming.callerAvatarUrl,
          isOutgoing:        false,
          conversationId:    incoming.conversationId,
        },
      });
    } catch (err) {
      console.error('[IncomingCall] accept failed:', err);
    }
  }

  async function decline() {
    if (!sessionId || !incoming) return;
    try {
      await endCallMut({
        sessionId: sessionId as Id<'sessions'>,
        callId:    incoming.callId as Id<'calls'>,
      });
    } catch {}
  }

  const isVideo = incoming.callType === 'video';

  return (
    <Modal transparent animationType="slide" visible statusBarTranslucent>
      <View style={s.overlay}>
        <View style={s.card}>

          {/* Caller info */}
          <View style={s.callerRow}>
            {incoming.callerAvatarUrl ? (
              <Image source={{ uri: incoming.callerAvatarUrl }} style={s.avatar} />
            ) : (
              <View style={[s.avatar, s.avatarFallback]}>
                <Text style={s.avatarLetter}>{incoming.callerName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={s.callerText}>
              <Text style={s.callerName}>{incoming.callerName}</Text>
              <Text style={s.callType}>
                {isVideo ? 'Incoming video call' : 'Incoming voice call'}
              </Text>
            </View>
            <Ionicons
              name={isVideo ? 'videocam' : 'call'}
              size={22}
              color="rgba(255,255,255,0.5)"
            />
          </View>

          {/* Accept / Decline */}
          <View style={s.actions}>
            <TouchableOpacity style={s.declineBtn} onPress={decline} activeOpacity={0.8}>
              <Ionicons
                name="call"
                size={30}
                color="#fff"
                style={{ transform: [{ rotate: '135deg' }] }}
              />
              <Text style={s.actionLabel}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.acceptBtn} onPress={accept} activeOpacity={0.8}>
              <Ionicons name="call" size={30} color="#fff" />
              <Text style={s.actionLabel}>Accept</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  card: {
    backgroundColor: '#0D1B2A',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40,
    gap: 32,
  },

  callerRow:    { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar:       { width: 56, height: 56, borderRadius: 28 },
  avatarFallback: { backgroundColor: '#3D5A80', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#fff', fontSize: 22, fontWeight: '700' },
  callerText:   { flex: 1 },
  callerName:   { color: '#fff', fontSize: 20, fontWeight: '700' },
  callType:     { color: 'rgba(255,255,255,0.55)', fontSize: 14, marginTop: 3 },

  actions:    { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  declineBtn: {
    alignItems: 'center', gap: 10,
    backgroundColor: '#E53E3E',
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center',
  },
  acceptBtn: {
    alignItems: 'center', gap: 10,
    backgroundColor: '#25D366',
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center',
  },
  actionLabel: {
    color: '#fff', fontSize: 12, fontWeight: '600',
    position: 'absolute', bottom: -22,
  },
});
