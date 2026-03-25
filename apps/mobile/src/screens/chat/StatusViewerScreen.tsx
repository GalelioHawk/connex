import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, Image, StyleSheet, Pressable,
  Animated, Dimensions, TouchableOpacity, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuthStore } from '../../store/authStore';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import type { ChatStackParams } from '../../navigation';

dayjs.extend(relativeTime);
import type { Id } from '../../../convex/_generated/dataModel';

type RouteType = RouteProp<ChatStackParams, 'StatusViewer'>;

const { width: W, height: H } = Dimensions.get('window');
const DURATION = 5000;

export default function StatusViewerScreen() {
  const navigation    = useNavigation<any>();
  const route         = useRoute<RouteType>();
  const { userId, name, avatarUrl } = route.params;

  const sessionId     = useAuthStore((s) => s.sessionId);
  const currentUserId = useAuthStore((s) => s.user?.id);

  const statuses = useQuery(
    api.status.getUserStatuses,
    sessionId ? { sessionId: sessionId as Id<'sessions'>, userId } : 'skip',
  );

  const markViewed   = useMutation(api.status.markViewed);
  const deleteStatus = useMutation(api.status.deleteStatus);

  const [index, setIndex]    = useState(0);
  const progress              = useRef(new Animated.Value(0)).current;
  const animRef               = useRef<Animated.CompositeAnimation | null>(null);
  const progressValue         = useRef(0);
  const isLongPressing        = useRef(false);
  const isOwn                 = userId === currentUserId;

  // Track progress value for pause/resume
  useEffect(() => {
    const id = progress.addListener(({ value }) => { progressValue.current = value; });
    return () => progress.removeListener(id);
  }, [progress]);

  const goNext = useCallback(() => {
    if (!statuses) return;
    if (index < statuses.length - 1) {
      setIndex((i) => i + 1);
    } else {
      navigation.goBack();
    }
  }, [index, statuses, navigation]);

  const goPrev = useCallback(() => {
    if (index > 0) {
      setIndex((i) => i - 1);
    } else {
      progress.setValue(0);
    }
  }, [index, progress]);

  useEffect(() => {
    if (!statuses?.length) return;
    const current = statuses[index];
    if (!current) return;

    // Mark as viewed — never for own statuses
    if (sessionId && !current.viewed && !isOwn) {
      markViewed({
        sessionId: sessionId as Id<'sessions'>,
        statusId:  current.id as Id<'statusPosts'>,
      }).catch(() => {});
    }

    // Start progress animation
    progress.setValue(0);
    animRef.current?.stop();
    animRef.current = Animated.timing(progress, {
      toValue:        1,
      duration:       DURATION,
      useNativeDriver: false,
    });
    animRef.current.start(({ finished }) => {
      if (finished) goNext();
    });

    return () => { animRef.current?.stop(); };
  }, [index, statuses]);

  function handleLongPress() {
    isLongPressing.current = true;
    animRef.current?.stop();
  }

  function handlePressOut() {
    if (isLongPressing.current) {
      isLongPressing.current = false;
      const remaining = (1 - progressValue.current) * DURATION;
      animRef.current = Animated.timing(progress, {
        toValue:         1,
        duration:        remaining,
        useNativeDriver: false,
      });
      animRef.current.start(({ finished }) => {
        if (finished) goNext();
      });
    }
  }

  function handleDelete(statusId: string) {
    Alert.alert('Delete status', 'Remove this status update?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteStatus({
            sessionId: sessionId as Id<'sessions'>,
            statusId:  statusId as Id<'statusPosts'>,
          });
          if (!statuses || statuses.length <= 1) {
            navigation.goBack();
          } else if (index >= statuses.length - 1) {
            setIndex(statuses.length - 2);
          }
        },
      },
    ]);
  }

  if (!statuses) {
    return (
      <View style={s.root}>
        <StatusBar barStyle="light-content" />
      </View>
    );
  }

  if (statuses.length === 0) {
    return (
      <View style={s.root}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView edges={['top']} style={{ padding: 16 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
        </SafeAreaView>
        <View style={s.center}>
          <Text style={s.noStatus}>No status updates</Text>
        </View>
      </View>
    );
  }

  const current = statuses[index];

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* ── Content ── */}
      {current.mediaUrl ? (
        <Image
          source={{ uri: current.mediaUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: current.bgColor ?? '#1a1a2e', alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={s.textStatus}>{current.caption}</Text>
        </View>
      )}

      {/* ── Top gradient overlay ── */}
      <View style={s.topGrad} pointerEvents="none" />
      {/* ── Bottom gradient overlay ── */}
      <View style={s.bottomGrad} pointerEvents="none" />

      {/* ── Progress bars + user info ── */}
      <SafeAreaView style={s.topArea} edges={['top']} pointerEvents="box-none">
        {/* Progress bars */}
        <View style={s.progressRow}>
          {statuses.map((_, i) => (
            <View key={i} style={[s.progressBg, { flex: 1 }]}>
              <Animated.View
                style={[
                  s.progressFill,
                  {
                    width: i < index
                      ? '100%'
                      : i === index
                        ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                        : '0%',
                  },
                ]}
              />
            </View>
          ))}
        </View>

        {/* User info */}
        <View style={s.userRow}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={s.avatar} />
          ) : (
            <View style={[s.avatar, s.avatarFallback]}>
              <Text style={s.avatarLetter}>{name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.userName}>{name}</Text>
            <Text style={s.userTime}>{dayjs(current.createdAt).fromNow()}</Text>
          </View>
          {isOwn && (
            <TouchableOpacity style={s.headerBtn} onPress={() => handleDelete(current.id)}>
              <Ionicons name="trash-outline" size={20} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.headerBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ── Caption ── */}
      {current.caption && current.mediaUrl && (
        <View style={s.captionArea} pointerEvents="none">
          <Text style={s.caption}>{current.caption}</Text>
        </View>
      )}

      {/* ── View count (own only) ── */}
      {isOwn && (
        <View style={s.viewRow} pointerEvents="none">
          <Ionicons name="eye-outline" size={16} color="rgba(255,255,255,0.8)" />
          <Text style={s.viewCount}>{current.viewCount}</Text>
        </View>
      )}

      {/* ── Tap = skip, hold = pause ── */}
      <Pressable
        style={[StyleSheet.absoluteFill, { width: W / 2 }]}
        onPress={goPrev}
        onLongPress={handleLongPress}
        onPressOut={handlePressOut}
        delayLongPress={300}
      />
      <Pressable
        style={[StyleSheet.absoluteFill, { left: W / 2 }]}
        onPress={goNext}
        onLongPress={handleLongPress}
        onPressOut={handlePressOut}
        delayLongPress={300}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: '#000' },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  noStatus:      { color: '#fff', fontSize: 16 },

  topGrad: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 180,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  bottomGrad: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 120,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },

  topArea:    { position: 'absolute', top: 0, left: 0, right: 0 },
  progressRow: { flexDirection: 'row', gap: 4, paddingHorizontal: 12, paddingTop: 6 },
  progressBg:  { height: 2.5, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 2, overflow: 'hidden' },
  progressFill:{ height: '100%', backgroundColor: '#fff', borderRadius: 2 },

  userRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6, gap: 10 },
  avatar:      { width: 38, height: 38, borderRadius: 19 },
  avatarFallback: { backgroundColor: '#444', alignItems: 'center', justifyContent: 'center' },
  avatarLetter:{ color: '#fff', fontSize: 16, fontWeight: '700' },
  userName:    { color: '#fff', fontSize: 15, fontWeight: '700' },
  userTime:    { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  headerBtn:   { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  captionArea: { position: 'absolute', bottom: 60, left: 0, right: 0, paddingHorizontal: 20 },
  caption:     { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },

  viewRow:    { position: 'absolute', bottom: 28, left: 20, flexDirection: 'row', alignItems: 'center', gap: 6 },
  viewCount:  { color: 'rgba(255,255,255,0.8)', fontSize: 13 },

  textStatus: { color: '#fff', fontSize: 26, fontWeight: '700', textAlign: 'center', paddingHorizontal: 32, lineHeight: 36 },
});
