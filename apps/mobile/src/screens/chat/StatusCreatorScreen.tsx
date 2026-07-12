import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Image, ActivityIndicator, StatusBar, Alert, ScrollView,
  Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useMutation } from 'convex/react';
import type { ChatStackParams } from '../../navigation';
import { api } from '../../../convex/_generated/api';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import type { Id } from '../../../convex/_generated/dataModel';

const TEXT_BG_COLORS = [
  '#1a1a2e', '#16213e', '#0f3460', '#533483',
  '#e94560', '#f5a623', '#2ecc71', '#1abc9c',
  '#a29bfe', '#fd79a8', '#6c5ce7', '#00b894',
  '#e17055', '#74b9ff', '#55efc4', '#b2bec3',
];

const FONT_STYLES = [
  { fontWeight: '400' as const, fontStyle: 'normal'  as const, fontSize: 26 },
  { fontWeight: '700' as const, fontStyle: 'normal'  as const, fontSize: 26 },
  { fontWeight: '400' as const, fontStyle: 'italic'  as const, fontSize: 26 },
  { fontWeight: '700' as const, fontStyle: 'italic'  as const, fontSize: 28 },
];

type RouteType = RouteProp<ChatStackParams, 'StatusCreator'>;

export default function StatusCreatorScreen() {
  const navigation  = useNavigation();
  const route       = useRoute<RouteType>();
  const initialMode = route.params?.initialMode;
  const { colors }  = useTheme();
  const sessionId   = useAuthStore((s) => s.sessionId);

  const generateUploadUrl = useMutation(api.status.generateUploadUrl);
  const postStatus        = useMutation(api.status.post);

  const [mode,       setMode]       = useState<'pick' | 'media' | 'text'>(
    initialMode === 'text' ? 'text' : 'pick',
  );
  const [media,      setMedia]      = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
  const [caption,    setCaption]    = useState('');
  const [bgColor,    setBgColor]    = useState(TEXT_BG_COLORS[0]);
  const [posting,    setPosting]    = useState(false);
  const [fontIndex,  setFontIndex]  = useState(0);
  const [showColors, setShowColors] = useState(false);

  async function pickMedia(source: 'camera' | 'gallery', mediaType: 'image' | 'video' | 'both') {
    const pickerFn = source === 'camera'
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;

    const result = await pickerFn({
      mediaTypes: mediaType === 'image'
        ? ImagePicker.MediaTypeOptions.Images
        : mediaType === 'video'
          ? ImagePicker.MediaTypeOptions.Videos
          : ImagePicker.MediaTypeOptions.All,
      quality:     0.85,
      videoMaxDuration: 30,
      allowsEditing:    false,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const type  = asset.type === 'video' ? 'video' : 'image';
      setMedia({ uri: asset.uri, type });
      setMode('media');
    }
  }

  async function handlePost() {
    if (!sessionId) return;
    setPosting(true);
    try {
      if (mode === 'text') {
        if (!caption.trim()) {
          Alert.alert('Add some text', 'Write something for your status.');
          setPosting(false);
          return;
        }
        await postStatus({
          sessionId: sessionId as Id<'sessions'>,
          type:      'text',
          caption:   caption.trim(),
          bgColor,
        });
      } else if (media) {
        // Upload to Convex storage
        const uploadUrl = await generateUploadUrl({ sessionId: sessionId as Id<'sessions'> });

        const response  = await fetch(media.uri);
        const blob      = await response.blob();
        const mimeType  = media.type === 'video' ? 'video/mp4' : 'image/jpeg';

        const upload = await fetch(uploadUrl, {
          method:  'POST',
          headers: { 'Content-Type': mimeType },
          body:    blob,
        });

        if (!upload.ok) throw new Error('Upload failed');
        const { storageId } = await upload.json() as { storageId: Id<'_storage'> };

        await postStatus({
          sessionId: sessionId as Id<'sessions'>,
          type:      media.type,
          storageId,
          caption:   caption.trim() || undefined,
        });
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Could not post your status. Try again.');
    } finally {
      setPosting(false);
    }
  }

  // ── Pick mode ──────────────────────────────────────────────────────────────
  if (mode === 'pick') {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <StatusBar barStyle={colors.statusBar} />
        <View style={[s.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity style={s.headerBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text }]}>New status</Text>
          <View style={s.headerBtn} />
        </View>

        <View style={s.pickGrid}>
          <TouchableOpacity
            style={[s.pickCard, { backgroundColor: colors.surface }]}
            onPress={() => pickMedia('camera', 'image')}
            activeOpacity={0.7}
          >
            <Ionicons name="camera" size={36} color={colors.accent} />
            <Text style={[s.pickLabel, { color: colors.text }]}>Camera</Text>
            <Text style={[s.pickSub, { color: colors.textSecondary }]}>Take a photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.pickCard, { backgroundColor: colors.surface }]}
            onPress={() => pickMedia('gallery', 'both')}
            activeOpacity={0.7}
          >
            <Ionicons name="images" size={36} color={colors.accent} />
            <Text style={[s.pickLabel, { color: colors.text }]}>Gallery</Text>
            <Text style={[s.pickSub, { color: colors.textSecondary }]}>Photo or video</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.pickCard, { backgroundColor: colors.surface }]}
            onPress={() => pickMedia('camera', 'video')}
            activeOpacity={0.7}
          >
            <Ionicons name="videocam" size={36} color={colors.accent} />
            <Text style={[s.pickLabel, { color: colors.text }]}>Video</Text>
            <Text style={[s.pickSub, { color: colors.textSecondary }]}>Record up to 30s</Text>
          </TouchableOpacity>

          {/* Only show Text option when not coming from the pen shortcut (pen goes straight to text) */}
          {!initialMode && (
            <TouchableOpacity
              style={[s.pickCard, { backgroundColor: colors.surface }]}
              onPress={() => setMode('text')}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil" size={36} color={colors.accent} />
              <Text style={[s.pickLabel, { color: colors.text }]}>Text</Text>
              <Text style={[s.pickSub, { color: colors.textSecondary }]}>Write a status</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ── Text mode ──────────────────────────────────────────────────────────────
  if (mode === 'text') {
    const currentFont = FONT_STYLES[fontIndex];
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={[s.root, { backgroundColor: bgColor }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <StatusBar barStyle="light-content" />
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>

            {/* ── Top header ── */}
            <View style={s.textHeader}>
              <TouchableOpacity
                style={s.circleBtn}
                onPress={() => initialMode ? navigation.goBack() : setMode('pick')}
              >
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={s.circleBtn}
                  onPress={() => setFontIndex((i) => (i + 1) % FONT_STYLES.length)}
                >
                  <Text style={[s.aaLabel, {
                    fontWeight: currentFont.fontWeight,
                    fontStyle:  currentFont.fontStyle,
                  }]}>Aa</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.circleBtn, showColors && s.circleBtnActive]}
                  onPress={() => setShowColors((v) => !v)}
                >
                  <Ionicons name="color-palette-outline" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Color picker (slides in below header) ── */}
            {showColors && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={s.colorScroll}
                contentContainerStyle={s.colorScrollContent}
                keyboardShouldPersistTaps="always"
              >
                {TEXT_BG_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[s.colorDot, { backgroundColor: c }, bgColor === c && s.colorDotActive]}
                    onPress={() => setBgColor(c)}
                  />
                ))}
              </ScrollView>
            )}

            {/* ── Centered text input ── */}
            <View style={s.textCenter}>
              <TextInput
                value={caption}
                onChangeText={setCaption}
                placeholder="Type a status..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                style={[s.textInput, {
                  fontWeight: currentFont.fontWeight,
                  fontStyle:  currentFont.fontStyle,
                  fontSize:   currentFont.fontSize,
                }]}
                multiline
                autoFocus
                maxLength={700}
              />
            </View>

            {/* ── Send button (bottom-right, above keyboard) ── */}
            <View style={s.textFooter}>
              <TouchableOpacity
                style={[s.sendBtn, posting && { opacity: 0.6 }]}
                onPress={handlePost}
                disabled={posting}
              >
                {posting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="send" size={20} color="#fff" />}
              </TouchableOpacity>
            </View>

          </SafeAreaView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    );
  }

  // ── Media preview mode ─────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      {media && (
        <Image source={{ uri: media.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      )}
      <View style={s.topGrad} pointerEvents="none" />
      <View style={s.bottomGrad} pointerEvents="none" />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.headerBtn} onPress={() => { setMedia(null); initialMode ? navigation.goBack() : setMode('pick'); }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={s.headerBtn} />
          <TouchableOpacity
            style={[s.postBtn, posting && s.postBtnDisabled]}
            onPress={handlePost}
            disabled={posting}
          >
            {posting
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={s.postBtnText}>Post</Text>}
          </TouchableOpacity>
        </View>

        {/* Caption input at bottom */}
        <View style={s.captionRow}>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Add a caption..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            style={s.captionInput}
            maxLength={200}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1 },
  header:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  headerBtn:  { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle:{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' },

  pickGrid: {
    flex: 1, flexDirection: 'row', flexWrap: 'wrap',
    padding: 16, gap: 12, alignContent: 'center',
  },
  pickCard: {
    width: '47%', paddingVertical: 28, alignItems: 'center',
    borderRadius: 16, gap: 8,
  },
  pickLabel: { fontSize: 16, fontWeight: '700' },
  pickSub:   { fontSize: 12 },

  postBtn:         { paddingHorizontal: 20, paddingVertical: 9, backgroundColor: '#25D366', borderRadius: 20 },
  postBtnDisabled: { opacity: 0.6 },
  postBtnText:     { color: '#fff', fontSize: 14, fontWeight: '700' },

  topGrad:    { position: 'absolute', top: 0, left: 0, right: 0, height: 120, backgroundColor: 'rgba(0,0,0,0.4)' },
  bottomGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 140, backgroundColor: 'rgba(0,0,0,0.5)' },

  captionRow:   { position: 'absolute', bottom: 40, left: 16, right: 16 },
  captionInput: { color: '#fff', fontSize: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.4)', paddingVertical: 8 },

  textCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  textInput:  { color: '#fff', fontSize: 26, fontWeight: '600', textAlign: 'center', lineHeight: 36 },

  colorDot:     { width: 28, height: 28, borderRadius: 14 },
  colorDotActive: { borderWidth: 3, borderColor: '#fff' },

  // ── Text mode ──
  textHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4,
  },
  textFooter: {
    position: 'absolute', bottom: 20, right: 20,
  },
  circleBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  circleBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  aaLabel: {
    color: '#fff', fontSize: 15,
  },
  sendBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#25D366',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 6,
  },
  colorScroll: {
    maxHeight: 52,
  },
  colorScrollContent: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
});
