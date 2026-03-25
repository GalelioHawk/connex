import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, StatusBar, Alert, StyleSheet as RN,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useMutation, useQuery, useAction } from 'convex/react';
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  VideoSourceType,
  RtcSurfaceView,
  type IRtcEngine,
} from 'react-native-agora';
import { api } from '../../../convex/_generated/api';
import { useAuthStore } from '../../store/authStore';
import type { ChatStackParams } from '../../navigation';
import type { Id } from '../../../convex/_generated/dataModel';

const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID ?? '';

type RouteType = RouteProp<ChatStackParams, 'Call'>;

function pad(n: number) { return String(n).padStart(2, '0'); }
function formatDuration(s: number) { return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; }

export default function CallScreen() {
  const navigation = useNavigation<any>();
  const route      = useRoute<RouteType>();
  const {
    callId, channelName, callType,
    otherUserName, otherUserAvatarUrl, isOutgoing,
  } = route.params;

  const sessionId       = useAuthStore((s) => s.sessionId)!;
  const endCallMut      = useMutation(api.calls.endCall);
  const getCallToken    = useAction(api.calls.getCallToken);

  const callStatus = useQuery(
    api.calls.getCallStatus,
    sessionId
      ? { sessionId: sessionId as Id<'sessions'>, callId: callId as Id<'calls'> }
      : 'skip',
  );

  const engineRef    = useRef<IRtcEngine | null>(null);
  const cleaningUp   = useRef(false);

  const [joined,    setJoined]    = useState(false);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [muted,     setMuted]     = useState(false);
  const [videoOff,  setVideoOff]  = useState(false);
  const [speaker,   setSpeaker]   = useState(true);
  const [seconds,   setSeconds]   = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isVideo     = callType === 'video';
  const isConnected = remoteUid !== null;

  // ── Watch call status — navigate back if remote ended ──────────────────────
  useEffect(() => {
    if (!callStatus) return;
    if (callStatus.status === 'ended' || callStatus.status === 'missed') {
      cleanup(false);
    }
  }, [callStatus?.status]);

  // ── Agora engine init + join ───────────────────────────────────────────────
  useEffect(() => {
    let active = true;

    async function init() {
      try {
        if (!AGORA_APP_ID) {
          Alert.alert('Setup needed', 'Set EXPO_PUBLIC_AGORA_APP_ID in your .env file.');
          navigation.goBack();
          return;
        }

        const engine = createAgoraRtcEngine();
        engineRef.current = engine;

        engine.initialize({
          appId:          AGORA_APP_ID,
          channelProfile: ChannelProfileType.ChannelProfileCommunication,
        });

        engine.registerEventHandler({
          onJoinChannelSuccess: () => { if (active) setJoined(true); },
          onUserJoined:  (_, uid)  => { if (active) setRemoteUid(uid); },
          onUserOffline: (_, uid)  => {
            if (!active) return;
            setRemoteUid((prev) => (prev === uid ? null : prev));
            cleanup(true);
          },
          onError: (err) => { console.error('[Agora]', err); },
        });

        if (isVideo) {
          engine.enableVideo();
          engine.startPreview();
        } else {
          engine.enableAudio();
          engine.setEnableSpeakerphone(true);
        }

        const token = await getCallToken({
          sessionId:   sessionId as Id<'sessions'>,
          channelName,
          uid: 0,
        });

        await engine.joinChannel(token, channelName, 0, {
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        });
      } catch (err) {
        console.error('[Agora init]', err);
        Alert.alert('Call error', 'Could not start the call. Please try again.');
        navigation.goBack();
      }
    }

    init();

    return () => {
      active = false;
      engineRef.current?.leaveChannel();
      engineRef.current?.release();
      engineRef.current = null;
    };
  }, []);

  // ── Duration timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isConnected) {
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isConnected]);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  const cleanup = useCallback(async (sendEndMutation = true) => {
    if (cleaningUp.current) return;
    cleaningUp.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    engineRef.current?.leaveChannel();
    if (sendEndMutation && sessionId) {
      try {
        await endCallMut({
          sessionId: sessionId as Id<'sessions'>,
          callId:    callId    as Id<'calls'>,
        });
      } catch {}
    }
    navigation.goBack();
  }, [sessionId, callId, navigation]);

  function toggleMute() {
    setMuted((m) => { engineRef.current?.muteLocalAudioStream(!m); return !m; });
  }
  function toggleVideo() {
    setVideoOff((v) => { engineRef.current?.muteLocalVideoStream(!v); return !v; });
  }
  function toggleSpeaker() {
    setSpeaker((s) => { engineRef.current?.setEnableSpeakerphone(!s); return !s; });
  }
  function flipCamera() { engineRef.current?.switchCamera(); }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* ── Background ── */}
      {isVideo && isConnected && remoteUid !== null ? (
        <RtcSurfaceView
          canvas={{ uid: remoteUid, sourceType: VideoSourceType.VideoSourceRemote }}
          style={RN.absoluteFill}
        />
      ) : isVideo && !isConnected ? (
        // Local preview while waiting for other party
        <RtcSurfaceView
          canvas={{ uid: 0, sourceType: VideoSourceType.VideoSourceCamera }}
          style={RN.absoluteFill}
        />
      ) : (
        <View style={[RN.absoluteFill, s.audioBg]} />
      )}

      {/* ── Gradient overlays ── */}
      <View style={s.topGrad}    pointerEvents="none" />
      <View style={s.bottomGrad} pointerEvents="none" />

      <SafeAreaView style={s.safeArea} edges={['top', 'bottom']}>

        {/* ── Header ── */}
        <View style={s.topSection}>
          <Text style={s.callerName}>{otherUserName}</Text>
          <Text style={s.callStatus}>
            {isConnected
              ? formatDuration(seconds)
              : isOutgoing ? 'Calling...' : 'Connecting...'}
          </Text>
        </View>

        {/* ── Avatar (voice calls) ── */}
        {!isVideo && (
          <View style={s.avatarSection}>
            {otherUserAvatarUrl ? (
              <Image source={{ uri: otherUserAvatarUrl }} style={s.avatar} />
            ) : (
              <View style={[s.avatar, s.avatarFallback]}>
                <Text style={s.avatarLetter}>{otherUserName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Local PIP (video, when connected) ── */}
        {isVideo && isConnected && (
          <View style={s.pip}>
            <RtcSurfaceView
              canvas={{ uid: 0, sourceType: VideoSourceType.VideoSourceCamera }}
              style={RN.absoluteFill}
            />
          </View>
        )}

        {/* ── Controls ── */}
        <View style={s.controls}>

          {/* Mute */}
          <TouchableOpacity
            style={[s.controlBtn, muted && s.controlBtnOn]}
            onPress={toggleMute}
          >
            <Ionicons name={muted ? 'mic-off' : 'mic'} size={26} color="#fff" />
            <Text style={s.controlLabel}>{muted ? 'Unmute' : 'Mute'}</Text>
          </TouchableOpacity>

          {/* Video controls or Speaker */}
          {isVideo ? (
            <>
              <TouchableOpacity
                style={[s.controlBtn, videoOff && s.controlBtnOn]}
                onPress={toggleVideo}
              >
                <Ionicons name={videoOff ? 'videocam-off' : 'videocam'} size={26} color="#fff" />
                <Text style={s.controlLabel}>{videoOff ? 'Show' : 'Video'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.controlBtn} onPress={flipCamera}>
                <Ionicons name="camera-reverse-outline" size={26} color="#fff" />
                <Text style={s.controlLabel}>Flip</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[s.controlBtn, !speaker && s.controlBtnOn]}
              onPress={toggleSpeaker}
            >
              <Ionicons name={speaker ? 'volume-high' : 'volume-mute'} size={26} color="#fff" />
              <Text style={s.controlLabel}>{speaker ? 'Speaker' : 'Earpiece'}</Text>
            </TouchableOpacity>
          )}

          {/* End call */}
          <TouchableOpacity style={s.endBtn} onPress={() => cleanup(true)}>
            <Ionicons
              name="call"
              size={30}
              color="#fff"
              style={{ transform: [{ rotate: '135deg' }] }}
            />
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#000' },
  safeArea:{ flex: 1 },
  audioBg: { backgroundColor: '#0D1B2A' },

  topGrad:    { position: 'absolute', top: 0,    left: 0, right: 0, height: 200, backgroundColor: 'rgba(0,0,0,0.5)' },
  bottomGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 220, backgroundColor: 'rgba(0,0,0,0.65)' },

  topSection:  { paddingTop: 16, alignItems: 'center' },
  callerName:  { color: '#fff', fontSize: 26, fontWeight: '700' },
  callStatus:  { color: 'rgba(255,255,255,0.75)', fontSize: 15, marginTop: 6 },

  avatarSection:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatar:         { width: 120, height: 120, borderRadius: 60 },
  avatarFallback: { backgroundColor: '#3D5A80', alignItems: 'center', justifyContent: 'center' },
  avatarLetter:   { color: '#fff', fontSize: 48, fontWeight: '700' },

  pip: {
    position: 'absolute', top: 100, right: 16,
    width: 110, height: 160, borderRadius: 14,
    overflow: 'hidden', borderWidth: 2, borderColor: '#fff',
  },

  controls: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-evenly',
    alignItems: 'center', paddingBottom: 44, paddingHorizontal: 16,
  },
  controlBtn: {
    alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 50, padding: 16, minWidth: 72,
  },
  controlBtnOn:  { backgroundColor: 'rgba(255,255,255,0.4)' },
  controlLabel:  { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' },
  endBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#E53E3E',
    alignItems: 'center', justifyContent: 'center',
  },
});
