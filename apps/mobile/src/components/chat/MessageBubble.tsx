import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Modal, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useTheme } from '../../hooks/useTheme';
import { useSettingsStore } from '../../store/settingsStore';

const IMG_W = Dimensions.get('window').width * 0.65;
const IMG_H = IMG_W * 0.75;

interface Props {
  content:            string | null;
  isMine:             boolean;
  isDeleted?:         boolean;
  status?:            'sent' | 'delivered' | 'read';
  createdAt:          string;
  senderName?:        string;
  senderBubbleColor?: string | null;
  onLongPress?:       () => void;
  mediaUrl?:          string | null;
  msgType?:           string | null;
}

export default function MessageBubble({
  content, isMine, isDeleted = false, status, createdAt,
  senderName, senderBubbleColor, onLongPress, mediaUrl, msgType,
}: Props) {
  const { colors, fonts } = useTheme();
  const mediaAutoDownload = useSettingsStore((s) => s.mediaAutoDownload);

  const bubbleColor = isDeleted
    ? colors.surface
    : (senderBubbleColor ?? (isMine ? colors.bubbleMine : colors.bubbleTheirs));

  const isMedia = (msgType === 'image' || msgType === 'video') && !!mediaUrl;

  // 'never' → require tap; 'wifi' / 'mobile' → auto-load
  const [downloaded, setDownloaded] = useState(() => mediaAutoDownload !== 'never');
  const [viewerOpen, setViewerOpen] = useState(false);

  function StatusTicks() {
    if (!isMine || !status || isDeleted) return null;
    if (status === 'sent')      return <Ionicons name="checkmark"      size={16} color={colors.tickDefault} />;
    if (status === 'delivered') return <Ionicons name="checkmark-done" size={16} color={colors.tickDefault} />;
    if (status === 'read')      return <Ionicons name="checkmark-done" size={16} color={colors.tickRead} />;
    return null;
  }

  function renderMedia() {
    if (!isMedia) return null;

    if (!downloaded) {
      return (
        <TouchableOpacity
          style={[s.mediaPlaceholder, { width: IMG_W, height: IMG_H }]}
          onPress={() => setDownloaded(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-down-circle-outline" size={36} color="#fff" />
          <Text style={s.downloadLabel}>
            {msgType === 'video' ? 'Tap to download video' : 'Tap to download image'}
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <>
        <TouchableOpacity activeOpacity={0.9} onPress={() => setViewerOpen(true)}>
          <Image
            source={{ uri: mediaUrl! }}
            style={{ width: IMG_W, height: IMG_H, borderRadius: 10 }}
            resizeMode="cover"
          />
          {msgType === 'video' && (
            <View style={s.videoOverlay}>
              <Ionicons name="play-circle" size={44} color="rgba(255,255,255,0.9)" />
            </View>
          )}
        </TouchableOpacity>

        <Modal
          visible={viewerOpen}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setViewerOpen(false)}
        >
          <View style={s.viewer}>
            <Image
              source={{ uri: mediaUrl! }}
              style={StyleSheet.absoluteFill}
              resizeMode="contain"
            />
            <TouchableOpacity style={s.viewerClose} onPress={() => setViewerOpen(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </Modal>
      </>
    );
  }

  return (
    <TouchableOpacity
      style={[s.wrap, isMine ? s.wrapMine : s.wrapTheirs]}
      onLongPress={!isDeleted ? onLongPress : undefined}
      delayLongPress={300}
      activeOpacity={1}
    >
      {!isMine && senderName && (
        <Text style={[s.senderName, { color: colors.textSecondary }]}>{senderName}</Text>
      )}

      <View style={[
        s.bubble,
        isMine ? s.bubbleMine : s.bubbleTheirs,
        { backgroundColor: bubbleColor },
        isMedia && s.mediaBubble,
      ]}>
        {isDeleted ? (
          <View style={s.deletedRow}>
            <Ionicons name="ban-outline" size={15} color={colors.textMuted} style={{ marginRight: 5 }} />
            <Text style={[s.deletedText, { color: colors.textMuted }]}>
              {isMine ? 'You deleted this message' : 'This message was deleted'}
            </Text>
          </View>
        ) : isMedia ? (
          <>
            {renderMedia()}
            {!!content && (
              <Text style={[s.text, {
                color: isMine ? colors.bubbleTextMine : colors.bubbleTextTheirs,
                fontSize: fonts.lg,
                lineHeight: fonts.lg * 1.45,
                marginTop: 4,
                paddingHorizontal: 4,
              }]}>
                {content}
              </Text>
            )}
          </>
        ) : (
          <Text style={[s.text, {
            color: isMine ? colors.bubbleTextMine : colors.bubbleTextTheirs,
            fontSize: fonts.lg,
            lineHeight: fonts.lg * 1.45,
          }]}>
            {content ?? ''}
          </Text>
        )}

        <View style={[s.meta, isMedia && { paddingHorizontal: 4 }]}>
          <Text style={[s.time, { color: isMine ? colors.tickDefault : colors.textSecondary }]}>
            {dayjs(createdAt).format('HH:mm')}
          </Text>
          <StatusTicks />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  wrap:         { paddingHorizontal: 12, paddingVertical: 3 },
  wrapMine:     { alignItems: 'flex-end' },
  wrapTheirs:   { alignItems: 'flex-start' },
  senderName:   { fontSize: 13, fontWeight: '700', marginLeft: 14, marginBottom: 2 },
  bubble:       { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8 },
  bubbleMine:   { borderBottomRightRadius: 4 },
  bubbleTheirs: { borderBottomLeftRadius: 4 },
  mediaBubble:  { paddingHorizontal: 6, paddingTop: 6 },
  deletedRow:   { flexDirection: 'row', alignItems: 'center' },
  deletedText:  { fontSize: 15, fontStyle: 'italic', lineHeight: 22 },
  text:         { fontSize: 17, lineHeight: 24 },
  meta:         { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, alignSelf: 'flex-end' },
  time:         { fontSize: 12 },

  mediaPlaceholder: {
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  downloadLabel: { color: '#fff', fontSize: 13, fontWeight: '600' },

  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },

  viewer: {
    flex: 1,
    backgroundColor: '#000',
  },
  viewerClose: {
    position: 'absolute',
    top: 56,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
