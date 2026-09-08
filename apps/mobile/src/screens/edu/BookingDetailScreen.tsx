import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import type { EduStackParams } from '../../navigation';
import dayjs from 'dayjs';

type RouteType = RouteProp<EduStackParams, 'BookingDetail'>;

export default function BookingDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteType>();
  const { bookingId } = route.params;
  const { colors } = useTheme();
  const sessionId = useAuthStore((s) => s.sessionId)! as Id<'sessions'>;

  const booking = useQuery(api.eduBookings.getBooking, { sessionId, bookingId: bookingId as Id<'bookings'> });
  const updateStatus = useMutation(api.eduBookings.updateBookingStatus);
  const startCall = useMutation(api.eduBookings.startBookingCall);

  async function joinLesson(callType: 'voice' | 'video') {
    if (!booking) return;
    try {
      const result = await startCall({ sessionId, bookingId: bookingId as Id<'bookings'>, callType });
      navigation.navigate('Call', {
        callId: result.callId,
        channelName: result.channelName,
        callType,
        otherUserName: booking.is_tutor ? booking.student_name : booking.tutor_name,
        otherUserAvatarUrl: null,
        isOutgoing: true,
        conversationId: result.conversationId,
      });
    } catch (error) {
      Alert.alert('Could not start call', error instanceof Error ? error.message : 'Try again.');
    }
  }

  async function setStatus(status: 'completed' | 'cancelled' | 'no_show') {
    try {
      await updateStatus({ sessionId, bookingId: bookingId as Id<'bookings'>, status });
    } catch (error) {
      Alert.alert('Could not update booking', error instanceof Error ? error.message : 'Try again.');
    }
  }

  if (booking === undefined) {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }
  if (!booking) return null;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.text }]}>Lesson</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.body}>
        <Text style={[s.name, { color: colors.text }]}>{booking.is_tutor ? booking.student_name : booking.tutor_name}</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{dayjs(booking.scheduled_at).format('dddd D MMMM, HH:mm')}</Text>
        <Text style={{ color: colors.textSecondary }}>{booking.duration_minutes} minutes · {booking.mode}{booking.subject_code ? ` · ${booking.subject_code}` : ''}</Text>
        <Text style={{ color: colors.accent, marginTop: 6, fontWeight: '800', textTransform: 'capitalize' }}>{booking.status.replace('_', ' ')}</Text>

        {booking.status === 'scheduled' && (
          <View style={s.actionsRow}>
            <TouchableOpacity style={[s.action, { backgroundColor: colors.accent }]} onPress={() => joinLesson('video')}>
              <Ionicons name="videocam" size={18} color="#fff" />
              <Text style={s.actionText}>Video</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.action, { backgroundColor: colors.accent }]} onPress={() => joinLesson('voice')}>
              <Ionicons name="call" size={18} color="#fff" />
              <Text style={s.actionText}>Voice</Text>
            </TouchableOpacity>
          </View>
        )}

        {booking.status === 'scheduled' && booking.is_tutor && (
          <View style={s.actionsRow}>
            <TouchableOpacity style={[s.action, { backgroundColor: '#00A86B' }]} onPress={() => setStatus('completed')}>
              <Text style={s.actionText}>Mark complete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.action, { backgroundColor: '#E74C3C' }]} onPress={() => setStatus('no_show')}>
              <Text style={s.actionText}>No-show</Text>
            </TouchableOpacity>
          </View>
        )}

        {booking.status === 'scheduled' && (
          <TouchableOpacity style={[s.cancelBtn, { borderColor: colors.border }]} onPress={() => setStatus('cancelled')}>
            <Text style={{ color: '#E67E22', fontWeight: '800' }}>Cancel lesson</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, height: 52 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '900' },
  body: { padding: 20 },
  name: { fontSize: 22, fontWeight: '900' },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 24 },
  action: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 13, paddingVertical: 13 },
  actionText: { color: '#fff', fontWeight: '900' },
  cancelBtn: { marginTop: 20, borderWidth: 1, borderRadius: 13, alignItems: 'center', paddingVertical: 13 },
});
