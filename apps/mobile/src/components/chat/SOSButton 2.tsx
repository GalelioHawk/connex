import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';

const HOLD_DURATION = 3000;

export default function SOSButton() {
  const [holding, setHolding] = useState(false);
  const progress  = useRef(new Animated.Value(0)).current;
  const animation = useRef<Animated.CompositeAnimation | null>(null);

  function startHold() {
    setHolding(true);
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
    animation.current?.stop();
    Animated.timing(progress, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  }

  function triggerSOS() {
    setHolding(false);
    Animated.timing(progress, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Alert.alert('🆘 SOS Sent', 'Your trusted contacts have been notified.', [{ text: 'OK' }]);
    // TODO: call SOS API endpoint
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
    >
      {/* Fill bar behind text */}
      <Animated.View style={[s.fill, { width: fillWidth }]} />
      <Text style={s.label}>SOS</Text>
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
