import React, { useState } from 'react';
import {
  View, TextInput, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('');

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  }

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <View style={s.wrap}>
      {/* Attachment button */}
      <TouchableOpacity style={s.sideBtn}>
        <Ionicons name="attach" size={24} color="#8A9BB0" />
      </TouchableOpacity>

      {/* Text input */}
      <TextInput
        style={s.input}
        placeholder="Message"
        placeholderTextColor="#B0BEC5"
        value={text}
        onChangeText={setText}
        multiline
        maxLength={4000}
        returnKeyType="default"
        blurOnSubmit={false}
      />

      {/* Send / Mic button */}
      <TouchableOpacity
        style={[s.sendBtn, canSend && s.sendBtnActive]}
        onPress={handleSend}
        disabled={!canSend}
        activeOpacity={0.8}
      >
        <Ionicons
          name={canSend ? 'send' : 'mic-outline'}
          size={20}
          color={canSend ? '#fff' : '#8A9BB0'}
        />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  wrap:        { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#111111', borderTopWidth: 1, borderTopColor: '#2C2C2E' },
  sideBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  input:       { flex: 1, minHeight: 40, maxHeight: 120, backgroundColor: '#1C1C1E', borderRadius: 20, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 10 : 8, fontSize: 15, color: '#FFFFFF', marginHorizontal: 6 },
  sendBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2C2C2E', alignItems: 'center', justifyContent: 'center' },
  sendBtnActive: { backgroundColor: '#00A86B' },
});
