import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useAuthStore } from '../../store/authStore';

const HOLD_DURATION = 3000;

interface SOSButtonProps {
  setScrollEnabled?: (enabled: boolean) => void;
}

export default function SOSButton({ setScrollEnabled }: SOSButtonProps) {
  const [holding, setHolding] = useState(false);
  const [sending, setSending] = useState(false);
  const sessionId = useAuthStore((state) => state.sessionId);
  const triggerAlert = useAction(api.sos.triggerAlert);
  const progress  = useRef(new Animated.Value(0)).current;
  const animation = useRef<Animated.CompositeAnimation | null>(null);

  function startHold() {
    setHolding(true);
    setScrollEnabled?.(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    animation.current = Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_DURATION,
      useNativeDriver: false,
    });
    animation.current.start(({ finished }) => {
      if (finished) triggerSOS();
    });
  }

  function cancelHold() {
    setHolding(false);
    setScrollEnabled?.(true);
    animation.current?.stop();
    Animated.timing(progress, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  }

  async function triggerSOS() {
    if (!sessionId || sending) return;
    setHolding(false);
    setScrollEnabled?.(true);
    setSending(true);
    Animated.timing(progress, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    try {
      const result = await triggerAlert({ sessionId: sessionId as Id<'sessions'> });
      Alert.alert(
        '🆘 SOS sent',
        result.notified > 0
          ? `${result.notified} trusted contact${result.notified === 1 ? '' : 's'} received your emergency alert.`
          : 'No accepted SOS contacts are configured yet.',
      );
    } catch (error) {
      Alert.alert('SOS could not be sent', error instanceof Error ? error.message : 'Check your connection and try again.');
    } finally {
      setSending(false);
    }
  }

  const fillWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={startHold}
      onPressOut={cancelHold}
      style={s.pill}
      disabled={sending}
    >
      {/* Fill bar behind text */}
      <Animated.View style={[s.fill, { width: fillWidth }]} />
      <Text style={s.label}>{sending ? 'SENDING' : 'SOS'}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  pill:  {
    backgroundColor: '#E53E3E',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 52,
  },
  fill:  {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#9B1C1C',
    borderRadius: 20,
  },
  label: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
});
