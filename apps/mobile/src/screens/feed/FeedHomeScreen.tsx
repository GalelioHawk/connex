import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, RefreshControl, SafeAreaView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';

dayjs.extend(relativeTime);

const CATEGORIES = ['utility', 'safety', 'traffic', 'water', 'weather', 'community'] as const;
type Category = typeof CATEGORIES[number];

const CATEGORY_ICONS: Record<Category, React.ComponentProps<typeof Ionicons>['name']> = {
  utility: 'flash', safety: 'shield-checkmark', traffic: 'car', water: 'water',
  weather: 'cloud', community: 'people',
};

export default function FeedHomeScreen() {
  const { colors } = useTheme();
  const sessionId = useAuthStore((state) => state.sessionId)! as Id<'sessions'>;
  const user = useAuthStore((state) => state.user);
  const [tab, setTab] = useState<'community' | 'alerts'>('community');
  const [category, setCategory] = useState<Category | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [content, setContent] = useState('');
  const [postCategory, setPostCategory] = useState<Category | null>(null);
  const [posting, setPosting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const posts = useQuery(api.feed.listPosts, {
    sessionId,
    areaId: tab === 'alerts' ? user?.area_id ?? undefined : undefined,
    alertCategory: tab === 'alerts' ? category ?? undefined : undefined,
    limit: 75,
  });
  const loadshedding = useQuery(api.alerts.getLoadshedding, {
    sessionId,
    areaId: user?.area_id ?? undefined,
  });
  const createPost = useMutation(api.feed.createPost);
  const toggleLike = useMutation(api.feed.toggleLike);

  async function submitPost() {
    if (!content.trim()) return;
    setPosting(true);
    try {
      await createPost({
        sessionId,
        content: content.trim(),
        alertCategory: postCategory ?? undefined,
      });
      setContent('');
      setPostCategory(null);
      setComposerOpen(false);
    } catch (error) {
      Alert.alert('Could not publish', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setPosting(false);
    }
  }

  function refresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }

  const header = (
    <>
      <View style={s.titleRow}>
        <View>
          <Text style={[s.eyebrow, { color: colors.accent }]}>CONNEX</Text>
          <Text style={[s.title, { color: colors.text }]}>Feed</Text>
        </View>
        <TouchableOpacity style={[s.composeTop, { backgroundColor: colors.accent }]} onPress={() => setComposerOpen(true)}>
          <Ionicons name="add" size={25} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={[s.tabs, { backgroundColor: colors.surface }]}>
        {(['community', 'alerts'] as const).map((item) => (
          <TouchableOpacity key={item} style={[s.tab, tab === item && { backgroundColor: colors.accent }]} onPress={() => setTab(item)}>
            <Text style={[s.tabText, { color: tab === item ? '#fff' : colors.textSecondary }]}>{item === 'community' ? 'Community' : 'Alerts'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {tab === 'alerts' && (
        <>
          <View style={[s.powerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[s.powerIcon, { backgroundColor: (loadshedding?.stage ?? 0) > 0 ? '#E67E22' : colors.accent }]}>
              <Ionicons name="flash" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.powerTitle, { color: colors.text }]}>Loadshedding</Text>
              <Text style={{ color: colors.textSecondary, marginTop: 2 }}>
                {loadshedding ? `Current stage: ${loadshedding.stage}` : 'No official update available'}
              </Text>
            </View>
          </View>
          {!user?.area_id && (
            <Text style={[s.areaHint, { color: colors.textSecondary }]}>Add your area in Profile to see local alerts.</Text>
          )}
          <FlatList
            horizontal
            data={CATEGORIES}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chips}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[s.chip, { borderColor: colors.border }, category === item && { backgroundColor: colors.accent, borderColor: colors.accent }]}
                onPress={() => setCategory(category === item ? null : item)}
              >
                <Ionicons name={CATEGORY_ICONS[item]} size={15} color={category === item ? '#fff' : colors.textSecondary} />
                <Text style={{ color: category === item ? '#fff' : colors.textSecondary, textTransform: 'capitalize', fontWeight: '700' }}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </>
      )}
    </>
  );

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]}>
      {posts === undefined ? (
        <View style={s.center}>{header}<ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} /></View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
          renderItem={({ item }) => (
            <View style={[s.post, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={s.authorRow}>
                <View style={[s.authorAvatar, { backgroundColor: colors.avatarBg }]}><Text style={s.avatarLetter}>{item.author?.name?.charAt(0).toUpperCase() ?? '?'}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.authorName, { color: colors.text }]}>{item.author?.name ?? 'Connex user'}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>{dayjs(item.created_at).fromNow()}</Text>
                </View>
                {item.alert_tag && (
                  <View style={[s.alertBadge, { backgroundColor: '#E67E2222' }]}>
                    <Ionicons name={CATEGORY_ICONS[item.alert_tag as Category]} size={13} color="#E67E22" />
                    <Text style={s.alertBadgeText}>{item.alert_tag}</Text>
                  </View>
                )}
              </View>
              <Text style={[s.postText, { color: colors.text }]}>{item.content}</Text>
              <View style={[s.postActions, { borderTopColor: colors.border }]}>
                <TouchableOpacity style={s.action} onPress={() => toggleLike({ sessionId, postId: item.id as Id<'feedPosts'> })}>
                  <Ionicons name={item.is_liked ? 'heart' : 'heart-outline'} size={21} color={item.is_liked ? '#E53E3E' : colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary }}>{item.likes_count}</Text>
                </TouchableOpacity>
                <View style={s.action}><Ionicons name="chatbubble-outline" size={19} color={colors.textMuted} /><Text style={{ color: colors.textMuted }}>Comments coming soon</Text></View>
              </View>
            </View>
          )}
          ListEmptyComponent={<View style={s.empty}><Ionicons name={tab === 'alerts' ? 'shield-checkmark-outline' : 'people-outline'} size={46} color={colors.textMuted} /><Text style={[s.emptyTitle, { color: colors.text }]}>Nothing here yet</Text><Text style={[s.emptyCopy, { color: colors.textSecondary }]}>{tab === 'alerts' ? 'Local community alerts will appear here.' : 'Be the first person to start the conversation.'}</Text></View>}
        />
      )}

      <TouchableOpacity style={[s.fab, { backgroundColor: colors.accent }]} onPress={() => setComposerOpen(true)}><Ionicons name="create" size={24} color="#fff" /></TouchableOpacity>

      <Modal visible={composerOpen} animationType="slide" onRequestClose={() => setComposerOpen(false)}>
        <SafeAreaView style={[s.root, { backgroundColor: colors.background }]}>
          <View style={[s.composerHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setComposerOpen(false)}><Text style={{ color: colors.textSecondary, fontSize: 16 }}>Cancel</Text></TouchableOpacity>
            <Text style={[s.composerTitle, { color: colors.text }]}>Create post</Text>
            <TouchableOpacity onPress={submitPost} disabled={posting || !content.trim()}><Text style={{ color: colors.accent, fontSize: 16, fontWeight: '800', opacity: content.trim() ? 1 : 0.4 }}>{posting ? 'Posting…' : 'Post'}</Text></TouchableOpacity>
          </View>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="What is happening in your community?"
            placeholderTextColor={colors.textMuted}
            multiline autoFocus maxLength={2000}
            style={[s.composerInput, { color: colors.text }]}
          />
          <Text style={[s.tagLabel, { color: colors.textSecondary }]}>Optionally tag this as an alert</Text>
          <View style={s.tagGrid}>{CATEGORIES.map((item) => (
            <TouchableOpacity key={item} style={[s.tagChoice, { borderColor: colors.border }, postCategory === item && { backgroundColor: colors.accent, borderColor: colors.accent }]} onPress={() => setPostCategory(postCategory === item ? null : item)}>
              <Ionicons name={CATEGORY_ICONS[item]} size={17} color={postCategory === item ? '#fff' : colors.textSecondary} />
              <Text style={{ color: postCategory === item ? '#fff' : colors.textSecondary, textTransform: 'capitalize' }}>{item}</Text>
            </TouchableOpacity>
          ))}</View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 }, center: { flex: 1 }, list: { paddingHorizontal: 16, paddingBottom: 130 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, paddingBottom: 14 }, eyebrow: { fontSize: 11, fontWeight: '900', letterSpacing: 1.8 }, title: { fontSize: 32, fontWeight: '900' }, composeTop: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', borderRadius: 13, padding: 4, marginBottom: 14 }, tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10 }, tabText: { fontWeight: '800' },
  powerCard: { flexDirection: 'row', borderWidth: 1, borderRadius: 15, padding: 14, gap: 12, alignItems: 'center' }, powerIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }, powerTitle: { fontWeight: '900', fontSize: 16 }, areaHint: { marginTop: 8, fontSize: 12 },
  chips: { paddingVertical: 12, gap: 8 }, chip: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', gap: 6, alignItems: 'center' },
  post: { borderWidth: 1, borderRadius: 16, padding: 15, marginBottom: 12 }, authorRow: { flexDirection: 'row', gap: 10, alignItems: 'center' }, authorAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' }, avatarLetter: { color: '#fff', fontWeight: '900', fontSize: 17 }, authorName: { fontWeight: '800', fontSize: 15 }, alertBadge: { flexDirection: 'row', gap: 4, alignItems: 'center', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 }, alertBadgeText: { color: '#E67E22', fontWeight: '800', fontSize: 11, textTransform: 'capitalize' }, postText: { fontSize: 15, lineHeight: 22, marginTop: 13, marginBottom: 13 }, postActions: { flexDirection: 'row', gap: 24, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 11 }, action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  empty: { paddingVertical: 70, alignItems: 'center', gap: 8 }, emptyTitle: { fontSize: 19, fontWeight: '900' }, emptyCopy: { textAlign: 'center' }, fab: { position: 'absolute', right: 20, bottom: 108, width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', elevation: 5 },
  composerHeader: { height: 58, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 }, composerTitle: { fontSize: 17, fontWeight: '900' }, composerInput: { minHeight: 190, padding: 20, fontSize: 18, textAlignVertical: 'top' }, tagLabel: { marginHorizontal: 20, marginBottom: 10, fontWeight: '700' }, tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, paddingHorizontal: 20 }, tagChoice: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', gap: 6, alignItems: 'center' },
});
