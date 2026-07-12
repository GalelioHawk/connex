import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Image, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import type { Id } from '../../../convex/_generated/dataModel';
import dayjs from 'dayjs';

// Predefined set of premium vibrant avatar colors based on name hashing
function getAvatarColor(name: string): string {
  const code = name.charCodeAt(0) || 0;
  const colors = [
    '#FF6B6B', // Coral Red
    '#4D96FF', // Royal Blue
    '#6BCB77', // Emerald Green
    '#FFD93D', // Amber Yellow
    '#9B5DE5', // Amethyst Purple
    '#F15BB5', // Hot Pink
    '#00F5D4', // Turquoise
  ];
  return colors[code % colors.length];
}

export default function MessageRequestsScreen() {
  const navigation = useNavigation<any>();
  const sessionId  = useAuthStore((s) => s.sessionId)!;
  const { colors, fonts } = useTheme();

  const requests = useQuery(
    api.chat.listMessageRequests,
    sessionId ? { sessionId: sessionId as Id<'sessions'> } : 'skip'
  );

  const loading = requests === undefined;
  const safeRequests = (requests ?? []).filter((r): r is NonNullable<typeof r> => r != null);

  function openPreview(item: any) {
    navigation.navigate('ChatRoom', {
      conversationId: item.id,
      title:          item.other_user?.name ?? 'Chat Request',
      avatarUrl:      item.other_user?.avatar_url ?? null,
      userId:         item.other_user?.id ?? null,
    });
  }

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />

      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.6}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.text, fontSize: fonts.lg }]}>Message Requests</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : safeRequests.length === 0 ? (
        <View style={s.center}>
          <View style={[s.emptyIconWrap, { backgroundColor: colors.surface }]}>
            <Ionicons name="mail-open-outline" size={48} color={colors.accent} />
          </View>
          <Text style={[s.emptyTitle, { color: colors.text, fontSize: fonts.md }]}>Clean Inbox!</Text>
          <Text style={[s.emptyText, { color: colors.textSecondary, fontSize: fonts.sm }]}>
            Incoming message requests from people you don't know will appear here. No pending requests.
          </Text>
        </View>
      ) : (
        <FlatList
          data={safeRequests}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={() => (
            <View style={[s.infoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={s.infoBoxIcon}>
                <Ionicons name="information-circle-outline" size={22} color={colors.accent} />
              </View>
              <Text style={[s.infoBoxText, { color: colors.textSecondary, fontSize: fonts.sm }]}>
                These people don't know you've seen their messages until you select **Accept**.
              </Text>
            </View>
          )}
          contentContainerStyle={s.listContent}
          renderItem={({ item }) => {
            const name = item.other_user?.name ?? 'Unknown';
            const initials = (name[0] ?? '?').toUpperCase();
            const avatarBg = getAvatarColor(name);
            const timeText = dayjs(item.last_message?.created_at ?? item.created_at).fromNow();

            return (
              <TouchableOpacity
                style={[s.itemRow, { backgroundColor: colors.background, borderBottomColor: colors.border }]}
                activeOpacity={0.7}
                onPress={() => openPreview(item)}
              >
                {item.other_user?.avatar_url ? (
                  <Image source={{ uri: item.other_user.avatar_url }} style={s.avatar} />
                ) : (
                  <View style={[s.avatar, s.avatarFallback, { backgroundColor: avatarBg }]}>
                    <Text style={s.avatarLetter}>{initials}</Text>
                  </View>
                )}

                <View style={s.info}>
                  <View style={s.topRow}>
                    <Text style={[s.name, { color: colors.text, fontSize: fonts.body }]} numberOfLines={1}>
                      {name}
                    </Text>
                    <Text style={[s.time, { color: colors.textSecondary, fontSize: fonts.xs }]}>
                      {timeText}
                    </Text>
                  </View>
                  {item.last_message?.type === 'image' ? (
                    <View style={s.mediaPreviewWrap}>
                      <Ionicons name="camera" size={15} color={colors.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={[s.previewText, { color: colors.textSecondary, fontSize: fonts.sm }]} numberOfLines={1}>
                        Photo
                      </Text>
                    </View>
                  ) : item.last_message?.type === 'video' ? (
                    <View style={s.mediaPreviewWrap}>
                      <Ionicons name="videocam" size={15} color={colors.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={[s.previewText, { color: colors.textSecondary, fontSize: fonts.sm }]} numberOfLines={1}>
                        Video
                      </Text>
                    </View>
                  ) : (
                    <Text style={[s.previewText, { color: colors.textSecondary, fontSize: fonts.sm }]} numberOfLines={1}>
                      {item.last_message?.content || 'Sent a message request.'}
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={s.chevron} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyTitle: {
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 22,
  },
  listContent: {
    paddingBottom: 24,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  infoBoxIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBoxText: {
    flex: 1,
    lineHeight: 20,
    fontWeight: '500',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarLetter: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  info: {
    flex: 1,
    marginLeft: 16,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontWeight: '700',
    maxWidth: '70%',
    letterSpacing: -0.1,
  },
  time: {
    fontWeight: '500',
  },
  previewText: {
    fontWeight: '400',
    maxWidth: '92%',
  },
  chevron: {
    marginLeft: 8,
  },
  mediaPreviewWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
