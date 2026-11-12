// One workout post (feed, profiles, post page): a port of the website's PostCard. Likes and comments respond instantly.
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Heart, Lock, MessageCircle, SendHorizontal, Share2, UserCheck, UserPlus, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Dimensions, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { findExercise, lifters, timeAgo, type Exercise, type Post } from '@shared/data';
import Avatar from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { Press } from '@/components/ui/button';
import { Icon, Section } from '@/components/ui/kit';
import { Lime, Red, SpringBounce } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/lib/store';
import { img } from '@/lib/web';
import { Input } from '@/components/ui/input';

const SHOWN = 3;
const dur = (m?: number | null) => (!m ? '—' : m < 60 ? `${m}min` : `${Math.floor(m / 60)}h ${m % 60}min`);
const vol = (kg: number) => `${Math.round(kg).toLocaleString()} kg`;

export function ExerciseThumb({ ex, size = 48 }: { ex?: Exercise; size?: number }) {
  const src = img(ex?.image);
  return (
    <View style={[styles.thumb, { width: size, height: size, borderRadius: size / 2 }]}>
      {src ? <Image source={src} style={{ width: size, height: size }} /> : <Icon name="barbell" size={size * 0.6} />}
    </View>
  );
}

export function FollowButton({ id, name }: { id?: string | null; name: string }) {
  const { s, me, follow, unfollow } = useStore();
  if (!id || id === me.id || lifters.some((l) => l.id === id)) return null; // demo lifters can't be followed
  const on = s.following.includes(id), back = s.followers.includes(id);
  return (
    <Press onPress={() => (on ? unfollow(id) : follow(id))} accessibilityLabel={on ? `Unfollow ${name}` : `Follow ${name}`}
      style={[styles.follow, on ? { backgroundColor: 'rgba(161,161,170,0.18)' } : { backgroundColor: Lime }]}>
      {on ? <UserCheck size={13} color="#e4e4e7" /> : <UserPlus size={13} color="#09090b" />}
      <ThemedText type="smallBold" style={{ fontSize: 12, color: on ? '#e4e4e7' : '#09090b' }}>{on ? (back ? 'Friends' : 'Following') : back ? 'Follow back' : 'Follow'}</ThemedText>
    </Press>
  );
}

const toProfile = (id?: string | null) => id && router.push({ pathname: '/u/[id]', params: { id } });

function Summary({ p, find }: { p: Post; find: (id?: string, name?: string) => Exercise | undefined }) {
  const theme = useTheme();
  const more = p.exercises.length - SHOWN;
  return (
    <Pressable onPress={() => router.push({ pathname: '/post/[id]', params: { id: p.id } })} accessibilityLabel={`Open ${p.title}`}>
      <View style={{ flexDirection: 'row' }}>
        {[['Time', dur(p.duration)], ['Volume', vol(p.volume)]].map(([k, v]) => (
          <View key={k} style={{ flex: 1 }}><ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>{k}</ThemedText><ThemedText type="smallBold" style={{ fontSize: 15 }}>{v}</ThemedText></View>
        ))}
        <View style={{ flex: 1 }}>
          <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>Records</ThemedText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Icon name="medal" size={18} /><ThemedText type="smallBold" style={{ fontSize: 15 }}>{p.prs.length}</ThemedText></View>
        </View>
      </View>
      <View style={[styles.exList, { borderTopColor: theme.border }]}>
        {p.exercises.slice(0, SHOWN).map((e) => {
          const ex = find(e.id, e.name);
          return (
            <View key={e.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <ExerciseThumb ex={ex} />
              <ThemedText style={{ flex: 1, fontWeight: '500' }}>{ex?.name ?? e.name}</ThemedText>
            </View>
          );
        })}
      </View>
      {more > 0 && <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center', marginTop: 12 }}>See {more} more exercise{more > 1 ? 's' : ''}</ThemedText>}
    </Pressable>
  );
}

function Video({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => { p.loop = true; p.muted = true; });
  return <VideoView player={player} style={styles.media} contentFit="cover" nativeControls />;
}

// Video / photo first, swipe left for the workout.
function Swipe({ p, find }: { p: Post; find: (id?: string, name?: string) => Exercise | undefined }) {
  const w = Dimensions.get('window').width;
  const [page, setPage] = useState(0);
  return (
    <View style={{ marginHorizontal: -16 }}>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / w))}
        onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / w))} scrollEventThrottle={64}>
        <View style={{ width: w }}>
          {p.media!.type === 'video' ? <Video url={p.media!.url} /> : <Image source={{ uri: p.media!.url }} style={styles.media} contentFit="cover" />}
        </View>
        <View style={{ width: w, paddingHorizontal: 16, paddingVertical: 4 }}><Summary p={p} find={find} /></View>
      </ScrollView>
      <View style={styles.dots}>{[0, 1].map((i) => <View key={i} style={[styles.dot, page === i && { width: 16, backgroundColor: Lime }]} />)}</View>
    </View>
  );
}

export default function PostCard({ post, showFollow = true, last }: { post: Post; showFollow?: boolean; last?: boolean }) {
  const { s, me, like, comment } = useStore();
  const theme = useTheme();
  const [p, setP] = useState(post);
  const [seen, setSeen] = useState(post); // a fresh post from the feed replaces the local copy
  if (post !== seen) { setSeen(post); setP(post); }
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const find = (id?: string, name?: string) => findExercise(s.library, id, name);
  const author = p.uid ?? lifters.find((l) => l.name === p.by)?.id;
  const likers = p.likers ?? [];
  const others = p.likes - (likers[0] ? 1 : 0);
  const pop = useSharedValue(1);
  const heart = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  function toggleLike() {
    if (!p.liked) { pop.set(withSequence(withTiming(1.35, { duration: 120 }), withSpring(1, SpringBounce))); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }
    setP((x) => ({ ...x, liked: !x.liked, likes: x.likes + (x.liked ? -1 : 1) }));
    like(p.id, !!p.liked);
  }
  function send() {
    const text = draft.trim();
    if (!text) return;
    setP((x) => ({ ...x, comments: [...x.comments, { by: me.name, text, uid: me.id }] }));
    comment(p.id, text);
    setDraft('');
  }

  return (
    <Section last={last}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => toProfile(author)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar id={author ?? p.by} url={p.avatar} name={p.by} size={48} />
          <View style={{ flex: 1 }}>
            <ThemedText type="smallBold" style={{ fontSize: 16 }}>{p.mine ? `${p.by} (you)` : p.by}</ThemedText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>{p.faculty} · {timeAgo(p.at)}</ThemedText>
              {p.visibility === 'friends' && <><Users size={12} color={theme.textSecondary} /><ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>Friends</ThemedText></>}
              {p.visibility === 'private' && <><Lock size={12} color={theme.textSecondary} /><ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>Only you</ThemedText></>}
            </View>
          </View>
        </Pressable>
        {showFollow && <FollowButton id={p.uid} name={p.by} />}
      </View>

      <ThemedText style={styles.title}>{p.title}</ThemedText>
      {!!p.note && <ThemedText type="small" style={{ marginTop: 4 }}>{p.note}</ThemedText>}
      <View style={{ marginTop: 12 }}>{p.media ? <Swipe p={p} find={find} /> : <Summary p={p} find={find} />}</View>

      <View style={[styles.actions, { borderTopColor: theme.border }]}>
        <Pressable onPress={toggleLike} accessibilityLabel={`Like, ${p.likes} likes`} style={styles.action}>
          <Animated.View style={heart}><Heart size={22} color={p.liked ? Red : theme.textSecondary} fill={p.liked ? Red : 'transparent'} /></Animated.View>
          <ThemedText type="smallBold" style={{ color: p.liked ? Red : theme.textSecondary }}>{p.likes}</ThemedText>
        </Pressable>
        <Pressable onPress={() => { setOpen((o) => !o); setDraft(''); }} accessibilityLabel={`Comments, ${p.comments.length}`} style={styles.action}>
          <MessageCircle size={22} color={theme.textSecondary} /><ThemedText type="smallBold" themeColor="textSecondary">{p.comments.length}</ThemedText>
        </Pressable>
        <Pressable onPress={() => Share.share({ message: `${p.by} on Spotter: ${p.title} · ${vol(p.volume)}` })} accessibilityLabel="Share" style={styles.action}>
          <Share2 size={22} color={theme.textSecondary} />
        </Pressable>
      </View>

      {p.likes > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
          {likers.length > 0 && <View style={{ flexDirection: 'row' }}>{likers.slice(0, 3).map((l, i) => <View key={l.id} style={{ marginLeft: i ? -8 : 0, borderRadius: 14, borderWidth: 2, borderColor: theme.background }}><Avatar id={l.id} url={l.avatar} name={l.name} size={24} /></View>)}</View>}
          <ThemedText type="small" style={{ flex: 1 }}>
            {likers[0] ? <>Liked by <ThemedText type="smallBold" onPress={() => toProfile(likers[0].id)}>{likers[0].id === me.id ? 'you' : likers[0].name}</ThemedText>{others > 0 && <> and <ThemedText type="smallBold">{others} other{others > 1 ? 's' : ''}</ThemedText></>}</>
              : <><ThemedText type="smallBold">{p.likes}</ThemedText> like{p.likes > 1 ? 's' : ''}</>}
          </ThemedText>
        </View>
      )}

      {open && (
        <View style={{ marginTop: 12, gap: 8 }}>
          {p.comments.map((c, i) => (
            <ThemedText key={i} type="small"><ThemedText type="smallBold" onPress={() => toProfile(c.uid)}>{c.by}</ThemedText> {c.text}</ThemedText>
          ))}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Input value={draft} onChangeText={setDraft} placeholder="Add a comment…" placeholderTextColor={theme.textSecondary} returnKeyType="send" onSubmitEditing={send}
              style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]} />
            <Press onPress={send} disabled={!draft.trim()} accessibilityLabel="Post comment" style={[styles.send, { opacity: draft.trim() ? 1 : 0.4 }]}>
              <SendHorizontal size={16} color="#09090b" />
            </Press>
          </View>
        </View>
      )}
    </Section>
  );
}

const styles = StyleSheet.create({
  thumb: { overflow: 'hidden', backgroundColor: '#18181b', borderWidth: 1, borderColor: 'rgba(63,63,70,0.6)', alignItems: 'center', justifyContent: 'center' },
  follow: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 2, paddingHorizontal: 12, paddingVertical: 5 },
  title: { fontSize: 20, fontWeight: '700', marginTop: 12, lineHeight: 26 },
  exList: { marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 12 },
  media: { width: '100%', aspectRatio: 4 / 5, backgroundColor: '#000' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 },
  dot: { height: 6, width: 6, borderRadius: 3, backgroundColor: 'rgba(161,161,170,0.5)' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: { flex: 1, borderRadius: 5, paddingHorizontal: 12, paddingVertical: 9, fontSize: 16 },
  send: { width: 42, borderRadius: 5, backgroundColor: Lime, alignItems: 'center', justifyContent: 'center' },
});
