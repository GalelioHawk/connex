import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, FlatList, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, CameraType, CameraMode, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';

const { width: W } = Dimensions.get('window');
const THUMB = 62;

// ─── Zoom levels ──────────────────────────────────────────────────────────────
const ZOOM_LEVELS = [
  { label: '1×', value: 0 },
  { label: '2×', value: 0.05 },
  { label: '3×', value: 0.12 },
  { label: '5×', value: 0.22 },
];

// ─── Effects ──────────────────────────────────────────────────────────────────
const EFFECTS = [
  { key: 'normal', label: 'Normal', overlay: null },
  { key: 'warm',   label: 'Warm',   overlay: 'rgba(255,120,20,0.20)' },
  { key: 'cool',   label: 'Cool',   overlay: 'rgba(40,120,255,0.20)' },
  { key: 'fade',   label: 'Fade',   overlay: 'rgba(255,255,255,0.25)' },
  { key: 'drama',  label: 'Drama',  overlay: 'rgba(0,0,0,0.30)' },
  { key: 'rose',   label: 'Rose',   overlay: 'rgba(255,60,100,0.18)' },
];

interface Props {
  onClose: () => void;
  onCapture: (uri: string, type: 'photo' | 'video') => void;
}

export default function CameraScreen({ onClose, onCapture }: Props) {
  const [permission, requestPermission]       = useCameraPermissions();
  const [facing, setFacing]       = useState<CameraType>('back');
  const [mode, setMode]           = useState<CameraMode>('picture');
  const [recording, setRecording] = useState(false);
  const [flash, setFlash]         = useState(false);
  const [recentMedia, setRecentMedia] = useState<MediaLibrary.Asset[]>([]);

  // Zoom
  const [zoomIndex, setZoomIndex] = useState(0);
  const currentZoom = ZOOM_LEVELS[zoomIndex];

  // Effects
  const [showEffects, setShowEffects] = useState(false);
  const [effect, setEffect]           = useState(EFFECTS[0]);

  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
    loadRecentMedia();
  }, []);

  async function loadRecentMedia() {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(false, ['photo', 'video']);
      if (status !== 'granted') return;
      const { assets } = await MediaLibrary.getAssetsAsync({
        first: 20,
        mediaType: ['photo', 'video'],
        sortBy: MediaLibrary.SortBy.creationTime,
      });
      setRecentMedia(assets);
    } catch {
      // Gallery unavailable in Expo Go — non-fatal, strip stays hidden
    }
  }

  async function takePhoto() {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
    if (photo) onCapture(photo.uri, 'photo');
  }

  async function toggleRecording() {
    if (!cameraRef.current) return;
    if (recording) {
      cameraRef.current.stopRecording();
      setRecording(false);
    } else {
      setRecording(true);
      const video = await cameraRef.current.recordAsync({ maxDuration: 30 });
      if (video) onCapture(video.uri, 'video');
      setRecording(false);
    }
  }

  function handleCapture() {
    if (mode === 'picture') takePhoto();
    else toggleRecording();
  }

  function cycleZoom() {
    setZoomIndex(i => (i + 1) % ZOOM_LEVELS.length);
  }

  if (!permission?.granted) {
    return (
      <View style={s.permWrap}>
        <Text style={s.permText}>Camera access is needed</Text>
        <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
          <Text style={s.permBtnText}>Allow camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const lastPhoto = recentMedia[0];

  return (
    <View style={s.root}>

      {/* Camera preview */}
      <CameraView
        ref={cameraRef}
        style={s.camera}
        facing={facing}
        flash={flash ? 'on' : 'off'}
        mode={mode}
        zoom={currentZoom.value}
      />

      {/* Effect colour overlay — sits on top of preview */}
      {effect.overlay && (
        <View
          style={[StyleSheet.absoluteFillObject, { backgroundColor: effect.overlay }]}
          pointerEvents="none"
        />
      )}

      {/* ── Top bar ── */}
      <SafeAreaView style={s.topBar} edges={['top']}>
        <TouchableOpacity style={s.topBtn} onPress={onClose}>
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={s.topBtn} onPress={() => setFlash(f => !f)}>
          <Ionicons name={flash ? 'flash' : 'flash-off'} size={24} color="#fff" />
        </TouchableOpacity>
      </SafeAreaView>

      {/* ── Bottom panel ── */}
      <View style={s.bottom}>

        {/* Effects strip — visible when sparkle is tapped */}
        {showEffects && (
          <FlatList
            data={EFFECTS}
            horizontal
            keyExtractor={e => e.key}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.effectsStrip}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={s.effectItem}
                onPress={() => { setEffect(item); setShowEffects(false); }}
              >
                <View style={[
                  s.effectCircle,
                  item.overlay ? { backgroundColor: item.overlay, borderColor: 'rgba(255,255,255,0.4)' } : s.effectCircleNormal,
                  effect.key === item.key && s.effectCircleActive,
                ]}>
                  {item.key === 'normal' && (
                    <Ionicons name="sunny-outline" size={18} color="#fff" />
                  )}
                </View>
                <Text style={[s.effectLabel, effect.key === item.key && s.effectLabelActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        )}

        {/* Recent media strip */}
        {recentMedia.length > 0 && !showEffects && (
          <FlatList
            data={recentMedia}
            horizontal
            keyExtractor={item => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.strip}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => onCapture(item.uri, item.mediaType === 'video' ? 'video' : 'photo')}
              >
                <Image source={{ uri: item.uri }} style={s.stripThumb} />
                {item.mediaType === 'video' && (
                  <View style={s.videoOverlay}>
                    <Ionicons name="play" size={12} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
        )}

        {/* Shutter row: [gallery] [effects] [SHUTTER] [zoom] [flip] */}
        <View style={s.shutterRow}>

          {/* Gallery / last photo */}
          <TouchableOpacity
            style={s.galleryBtn}
            onPress={() =>
              lastPhoto && onCapture(lastPhoto.uri, lastPhoto.mediaType === 'video' ? 'video' : 'photo')
            }
          >
            {lastPhoto ? (
              <Image source={{ uri: lastPhoto.uri }} style={s.galleryThumb} />
            ) : (
              <View style={s.galleryEmpty}>
                <Ionicons name="images-outline" size={24} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          {/* Effects toggle */}
          <TouchableOpacity
            style={[s.sideBtn, showEffects && s.sideBtnActive]}
            onPress={() => setShowEffects(v => !v)}
          >
            <Ionicons
              name="sparkles"
              size={24}
              color={effect.key !== 'normal' ? '#FFD700' : '#fff'}
            />
          </TouchableOpacity>

          {/* Shutter */}
          <TouchableOpacity
            style={[s.shutter, recording && s.shutterRec]}
            onPress={handleCapture}
            activeOpacity={0.85}
          >
            <View style={[s.shutterInner, recording && s.shutterInnerRec]} />
          </TouchableOpacity>

          {/* Zoom — tap to cycle */}
          <TouchableOpacity style={s.sideBtn} onPress={cycleZoom}>
            <View style={[s.zoomPill, zoomIndex > 0 && s.zoomPillActive]}>
              <Text style={[s.zoomText, zoomIndex > 0 && s.zoomTextActive]}>
                {currentZoom.label}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Flip camera */}
          <TouchableOpacity
            style={s.sideBtn}
            onPress={() => setFacing(f => (f === 'back' ? 'front' : 'back'))}
          >
            <Ionicons name="camera-reverse-outline" size={30} color="#fff" />
          </TouchableOpacity>

        </View>

        {/* VIDEO | PHOTO toggle */}
        <View style={s.modeRow}>
          {(['video', 'picture'] as const).map(m => (
            <TouchableOpacity key={m} onPress={() => setMode(m)} style={s.modeBtn}>
              <Text style={[s.modeText, mode === m && s.modeTextActive]}>
                {m === 'picture' ? 'PHOTO' : 'VIDEO'}
              </Text>
              {mode === m && <View style={s.modeDot} />}
            </TouchableOpacity>
          ))}
        </View>

        <SafeAreaView edges={['bottom']} />
      </View>

    </View>
  );
}

const s = StyleSheet.create({
  root:              { flex: 1, backgroundColor: '#000' },
  camera:            { ...StyleSheet.absoluteFillObject },

  // Permission
  permWrap:          { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', gap: 16 },
  permText:          { color: '#fff', fontSize: 16 },
  permBtn:           { backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  permBtnText:       { color: '#000', fontWeight: '700' },

  // Top bar
  topBar:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 },
  topBtn:            { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 22 },

  // Bottom panel
  bottom:            { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.75)' },

  // Effects strip
  effectsStrip:      { paddingHorizontal: 16, paddingVertical: 12, gap: 16 },
  effectItem:        { alignItems: 'center', gap: 6 },
  effectCircle:      { width: 54, height: 54, borderRadius: 27, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  effectCircleNormal:{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' },
  effectCircleActive:{ borderColor: '#FFD700', borderWidth: 2.5 },
  effectLabel:       { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600' },
  effectLabelActive: { color: '#FFD700' },

  // Gallery strip
  strip:             { paddingHorizontal: 12, paddingTop: 14, paddingBottom: 4, gap: 6 },
  stripThumb:        { width: THUMB, height: THUMB, borderRadius: 8 },
  videoOverlay:      { position: 'absolute', bottom: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8, padding: 3 },

  // Shutter row
  shutterRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },

  galleryBtn:        { width: 48, height: 48, borderRadius: 10, overflow: 'hidden' },
  galleryThumb:      { width: 48, height: 48, borderRadius: 10 },
  galleryEmpty:      { width: 48, height: 48, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

  sideBtn:           { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  sideBtnActive:     { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 22 },

  shutter:           { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterRec:        { borderColor: '#E53E3E' },
  shutterInner:      { width: 62, height: 62, borderRadius: 31, backgroundColor: '#fff' },
  shutterInnerRec:   { width: 28, height: 28, borderRadius: 6, backgroundColor: '#E53E3E' },

  zoomPill:          { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  zoomPillActive:    { backgroundColor: 'rgba(255,215,0,0.25)' },
  zoomText:          { color: '#fff', fontSize: 13, fontWeight: '700' },
  zoomTextActive:    { color: '#FFD700' },

  // Mode toggle
  modeRow:           { flexDirection: 'row', justifyContent: 'center', gap: 36, paddingBottom: 14 },
  modeBtn:           { alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8 },
  modeText:          { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '700', letterSpacing: 1.2 },
  modeTextActive:    { color: '#FFD700' },
  modeDot:           { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFD700', marginTop: 4 },
});
