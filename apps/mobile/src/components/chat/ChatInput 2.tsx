import React, { useState } from 'react';
import {
  View, TextInput, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('');
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  }

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 8), backgroundColor: colors.inputBar }]}>
      {/* + button */}
      <TouchableOpacity style={s.iconBtn}>
        <Ionicons name="add" size={28} color={colors.inputIcon} />
      </TouchableOpacity>

      {/* Input pill */}
      <View style={[s.pill, { backgroundColor: colors.inputPill }]}>
        <TextInput
          style={[s.input, { color: colors.text }]}
          placeholder="Message"
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={4000}
          returnKeyType="default"
          blurOnSubmit={false}
        />
        {!canSend && (
          <TouchableOpacity style={s.pillIcon}>
            <Ionicons name="happy-outline" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Camera — always visible */}
      <TouchableOpacity style={s.iconBtn}>
        <Ionicons name="camera-outline" size={26} color={colors.inputIcon} />
      </TouchableOpacity>

      {/* Mic → Send when typing */}
      <TouchableOpacity
        style={s.iconBtn}
        onPress={canSend ? handleSend : undefined}
        activeOpacity={0.7}
      >
        <Ionicons
          name={canSend ? 'send' : 'mic-outline'}
          size={canSend ? 22 : 26}
          color={canSend ? colors.accent : colors.inputIcon}
        />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 8,
    paddingBottom: 0,
    gap: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 22,
    minHeight: 44,
    maxHeight: 130,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    paddingTop: 0,
    paddingBottom: 0,
  },
  pillIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Platform.OS === 'ios' ? -2 : 0,
  },
});
