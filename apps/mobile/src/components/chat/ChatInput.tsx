import React, { useState, useRef } from 'react';
import {
  View, TextInput, TouchableOpacity, StyleSheet, Platform,
  Modal, FlatList, Image, Text, Pressable, ActivityIndicator,
  Dimensions, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/useTheme';

const GIPHY_KEY = 'dc6zaTOxFJmzC';
const STICKER_W = (Dimensions.get('window').width - 32) / 3;

interface Props {
  onSend:       (text: string) => void;
  onSendMedia?: (uri: string, type: 'image' | 'video') => Promise<void>;
  disabled?:    boolean;
}

export default function ChatInput({ onSend, onSendMedia, disabled }: Props) {
  const [text, setText]               = useState('');
  const [attachOpen, setAttachOpen]   = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [stickerQuery, setStickerQuery] = useState('');
  const [stickers, setStickers]       = useState<any[]>([]);
  const [stickerLoading, setStickerLoading] = useState(false);
  const [preview, setPreview]         = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
  const [sending, setSending]         = useState(false);
  const insets  = useSafeAreaInsets();
  const { colors } = useTheme();
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canSend = ((text.trim().length > 0 || preview !== null) && !disabled && !sending);

  async function handleSend() {
    if (!canSend) return;
    if (preview && onSendMedia) {
      setSending(true);
      try {
        await onSendMedia(preview.uri, preview.type);
        setPreview(null);
        if (text.trim()) { onSend(text.trim()); setText(''); }
      } finally {
        setSending(false);
      }
    } else {
      onSend(text.trim());
      setText('');
    }
  }

  async function pickFromLibrary() {
    setAttachOpen(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setPreview({ uri: a.uri, type: a.type === 'video' ? 'video' : 'image' });
    }
  }

  async function openCamera() {
    setAttachOpen(false);
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setPreview({ uri: a.uri, type: a.type === 'video' ? 'video' : 'image' });
    }
  }

  async function fetchStickers(q: string) {
    setStickerLoading(true);
    try {
      const url = q.trim()
        ? `https://api.giphy.com/v1/stickers/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=30`
        : `https://api.giphy.com/v1/stickers/trending?api_key=${GIPHY_KEY}&limit=30`;
      const res  = await fetch(url);
      const json = await res.json();
      setStickers(json.data ?? []);
    } catch { setStickers([]); }
    finally { setStickerLoading(false); }
  }

  function openStickerPicker() {
    setStickerOpen(true);
    setStickerQuery('');
    fetchStickers('');
    Keyboard.dismiss();
  }

  function onStickerQueryChange(q: string) {
    setStickerQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchStickers(q), 500);
  }

  async function sendSticker(item: any) {
    setStickerOpen(false);
    const url = item.images?.fixed_height?.url as string | undefined;
    if (!url || !onSendMedia) return;
    setSending(true);
    try { await onSendMedia(url, 'image'); }
    finally { setSending(false); }
  }

  const attachOptions = [
    { icon: 'images-outline',   label: 'Photos',   color: '#9C27B0', onPress: pickFromLibrary },
    { icon: 'camera-outline',   label: 'Camera',   color: '#2196F3', onPress: openCamera },
    { icon: 'location-outline', label: 'Location', color: '#4CAF50', onPress: () => setAttachOpen(false) },
    { icon: 'person-outline',   label: 'Contact',  color: '#FF9800', onPress: () => setAttachOpen(false) },
    { icon: 'document-outline', label: 'Document', color: '#F44336', onPress: () => setAttachOpen(false) },
    { icon: 'stats-chart',      label: 'Poll',     color: '#00BCD4', onPress: () => setAttachOpen(false) },
    { icon: 'calendar-outline', label: 'Event',    color: '#E91E63', onPress: () => setAttachOpen(false) },
    { icon: 'videocam-outline', label: 'Video',    color: '#FF5722', onPress: pickFromLibrary },
  ] as const;

  return (
    <>
      {/* ── Sticker Picker Modal ────────────────────────────────────── */}
      <Modal
        visible={stickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setStickerOpen(false)}
      >
        <Pressable style={s.modalBg} onPress={() => setStickerOpen(false)} />
        <View style={[s.stickerSheet, { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, 8) }]}>
          <View style={[s.stickerSearchRow, { backgroundColor: colors.inputPill }]}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={[s.stickerSearchInput, { color: colors.text }]}
              placeholder="Search stickers..."
              placeholderTextColor={colors.textMuted}
              value={stickerQuery}
              onChangeText={onStickerQueryChange}
              autoCorrect={false}
            />
          </View>
          {stickerLoading ? (
            <View style={s.stickerLoader}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : (
            <FlatList
              data={stickers}
              numColumns={3}
              keyExtractor={(item) => item.id}
              contentContainerStyle={s.stickerGrid}
              renderItem={({ item }) => (
                <TouchableOpacity style={s.stickerCell} onPress={() => sendSticker(item)}>
                  <Image
                    source={{ uri: item.images?.fixed_height_small?.url }}
                    style={s.stickerImg}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>

      {/* ── Attachment Panel ────────────────────────────────────────── */}
      {attachOpen && (
        <View style={[s.attachPanel, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={s.attachGrid}>
            {attachOptions.map((opt) => (
              <TouchableOpacity key={opt.label} style={s.attachItem} onPress={opt.onPress}>
                <View style={[s.attachCircle, { backgroundColor: opt.color }]}>
                  <Ionicons name={opt.icon as any} size={24} color="#fff" />
                </View>
                <Text style={[s.attachLabel, { color: colors.textSecondary }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ── Media Preview ───────────────────────────────────────────── */}
      {preview && (
        <View style={[s.previewBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <Image source={{ uri: preview.uri }} style={s.previewThumb} resizeMode="cover" />
          <Text style={[s.previewLabel, { color: colors.textSecondary }]}>
            {preview.type === 'video' ? 'Video ready to send' : 'Image ready to send'}
          </Text>
          <TouchableOpacity onPress={() => setPreview(null)} style={s.previewClose}>
            <Ionicons name="close-circle" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Input Bar ───────────────────────────────────────────────── */}
      <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 8), backgroundColor: colors.inputBar }]}>

        {/* + / keyboard toggle */}
        <TouchableOpacity
          style={s.iconBtn}
          onPress={() => { setAttachOpen((o) => !o); setStickerOpen(false); }}
        >
          <Ionicons
            name={attachOpen ? 'keypad-outline' : 'add'}
            size={28}
            color={colors.inputIcon}
          />
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
            onFocus={() => setAttachOpen(false)}
          />
          {!canSend && (
            <TouchableOpacity style={s.pillIcon} onPress={openStickerPicker}>
              <Ionicons name="color-palette-outline" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Camera */}
        <TouchableOpacity style={s.iconBtn} onPress={openCamera}>
          <Ionicons name="camera-outline" size={26} color={colors.inputIcon} />
        </TouchableOpacity>

        {/* Mic → Send */}
        <TouchableOpacity
          style={s.iconBtn}
          onPress={canSend ? handleSend : undefined}
          activeOpacity={0.7}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Ionicons
              name={canSend ? 'send' : 'mic-outline'}
              size={canSend ? 22 : 26}
              color={canSend ? colors.accent : colors.inputIcon}
            />
          )}
        </TouchableOpacity>

      </View>
    </>
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
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
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
    width: 28, height: 28,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Platform.OS === 'ios' ? -2 : 0,
  },

  // Attachment panel
  attachPanel: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  attachGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 16,
  },
  attachItem: {
    width: 72,
    alignItems: 'center',
    gap: 6,
  },
  attachCircle: {
    width: 52, height: 52,
    borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  attachLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Media preview
  previewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  previewThumb: {
    width: 48, height: 48,
    borderRadius: 8,
    backgroundColor: '#ccc',
  },
  previewLabel: { flex: 1, fontSize: 14 },
  previewClose: { padding: 4 },

  // Sticker modal
  modalBg: { flex: 1 },
  stickerSheet: {
    height: '55%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 12,
    overflow: 'hidden',
  },
  stickerSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  stickerSearchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  stickerLoader: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  stickerGrid: { paddingHorizontal: 4 },
  stickerCell: {
    width: STICKER_W,
    height: STICKER_W,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerImg: {
    width: STICKER_W - 8,
    height: STICKER_W - 8,
  },
});
