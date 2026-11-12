// A post's full workout (the website's /feed/[id]): who and when, media, stats, muscle split, every set, comments.
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Heart, MessageCircle, SendHorizontal, Share2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { addSets, findExercise, lifters, oldNames, setTypes } from '@shared/data';
import { countsPR, e1rm, mmss, setLabels } from '@shared/lifting';
import Avatar from '@/components/avatar';
import { ExerciseThumb, FollowButton } from '@/components/post-card';
import { ThemedText } from '@/components/themed-text';
import { Press } from '@/components/ui/button';
import { Bone, EmptyState, Icon } from '@/components/ui/kit';
import { Lime, Red } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/lib/store';
import { setTypeColor, supersetHex } from '@/lib/tw';
import { Input } from '@/components/ui/input';

const dur = (m?: number | null) => (!m ? '—' : m < 60 ? `${m}min` : `${Math.floor(m / 60)}h ${m % 60}min`);

function Grow({ pct, i }: { pct: number; i: number }) {
  const w = useSharedValue(0);
  useEffect(() => { w.set(withDelay(80 + i * 60, withTiming(pct, { duration: 700, easing: Easing.bezier(0.65, 0, 0.35, 1) }))); }, [pct, i, w]);
  const anim = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return <Animated.View style={[{ height: '100%', borderRadius: 2, backgroundColor: Lime }, anim]} />;
}
function Video({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => { p.loop = true; p.muted = true; });
  return <VideoView player={player} style={styles.media} contentFit="cover" nativeControls />;
}

export default function PostPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { s, me, like, comment } = useStore();
  const theme = useTheme();
  const [draft, setDraft] = useState('');
  const p = s.posts.find((x) => x.id === id);

  if (!p) return (
    <View style={{ flex: 1, padding: 16, gap: 12, backgroundColor: theme.background }}>
      {s.posts.length ? <EmptyState art="not-found" title="This workout isn't available" text="It may be private, friends-only, or deleted." />
        : <><Bone w={180} h={20} /><Bone w="100%" h={120} /><Bone w="70%" h={14} /></>}
    </View>
  );

  const rows = p.exercises.map((e) => {
    const ex = findExercise(s.library, e.id, e.name);
    const log = e.log ?? [];
    const sets = log.length || e.sets || 1;
    const pr = p.prs.some((n) => n === e.name || n === ex?.name || oldNames[n] === ex?.name);
    const eligible = log.filter((x) => countsPR(x.type));
    const top = eligible.length ? log.indexOf(eligible.reduce((b, x) => (e1rm(x.kg, x.reps) > e1rm(b.kg, b.reps) ? x : b))) : -1;
    return { e, ex, log, sets, pr, top, labels: setLabels(log, setTypes) };
  });
  const totalSets = rows.reduce((n, r) => n + r.sets, 0);
  const split = Object.entries(rows.reduce<Record<string, number>>((m, r) => addSets(m, r.ex, r.sets), {})).sort((a, b) => b[1] - a[1]);
  const splitTotal = split.reduce((n, [, v]) => n + v, 0) || 1;
  const when = new Date(p.at);
  const author = p.uid ?? lifters.find((l) => l.name === p.by)?.id;
  const send = () => { if (draft.trim()) { comment(p.id, draft.trim()); setDraft(''); } };

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => author && router.push({ pathname: '/u/[id]', params: { id: author } })} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar id={author ?? p.by} url={p.avatar} name={p.by} size={52} />
            <View style={{ flex: 1 }}>
              <ThemedText type="smallBold" style={{ fontSize: 16 }}>{p.mine ? `${p.by} (you)` : p.by}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>
                {when.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })} · {when.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase()}
              </ThemedText>
            </View>
          </Pressable>
          <FollowButton id={p.uid} name={p.by} />
        </View>
        <ThemedText style={{ fontSize: 24, fontWeight: '700', lineHeight: 30 }}>{p.title}</ThemedText>
        {!!p.note && <ThemedText type="small">{p.note}</ThemedText>}
        {p.media && <View style={{ marginHorizontal: -16 }}>{p.media.type === 'video' ? <Video url={p.media.url} /> : <Image source={{ uri: p.media.url }} style={styles.media} contentFit="cover" />}</View>}
        <View style={{ flexDirection: 'row' }}>
          {[['Time', dur(p.duration)], ['Volume', `${Math.round(p.volume).toLocaleString()} kg`], ['Sets', String(totalSets)]].map(([k, v]) => (
            <View key={k} style={{ flex: 1 }}><ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>{k}</ThemedText><ThemedText type="smallBold" style={{ fontSize: 15 }}>{v}</ThemedText></View>
          ))}
          <View style={{ flex: 1 }}><ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>Records</ThemedText><View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Icon name="medal" size={18} /><ThemedText type="smallBold" style={{ fontSize: 15 }}>{p.prs.length}</ThemedText></View></View>
        </View>
        <View style={[styles.actions, { borderColor: theme.border }]}>
          <Pressable onPress={() => like(p.id)} style={styles.action} accessibilityLabel={`Like, ${p.likes} likes`}>
            <Heart size={22} color={p.liked ? Red : theme.textSecondary} fill={p.liked ? Red : 'transparent'} /><ThemedText type="smallBold" style={{ color: p.liked ? Red : theme.textSecondary }}>{p.likes}</ThemedText>
          </Pressable>
          <View style={styles.action}><MessageCircle size={22} color={theme.textSecondary} /><ThemedText type="smallBold" themeColor="textSecondary">{p.comments.length}</ThemedText></View>
          <Pressable onPress={() => Share.share({ message: `${p.by} on Spotter: ${p.title}` })} accessibilityLabel="Share"><Share2 size={22} color={theme.textSecondary} /></Pressable>
        </View>
      </View>

      <View style={{ gap: 12 }}>
        <ThemedText style={styles.h3}>Muscle split</ThemedText>
        {split.map(([k, n], i) => {
          const pct = Math.round((n / splitTotal) * 100);
          return (
            <View key={k}>
              <ThemedText type="small" style={{ marginBottom: 4 }}>{k}</ThemedText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}><Grow pct={pct} i={i} /></View>
                <ThemedText type="small" themeColor="textSecondary" style={{ width: 40, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{pct}%</ThemedText>
              </View>
            </View>
          );
        })}
      </View>

      <View style={{ gap: 16 }}>
        <ThemedText style={styles.h3}>Workout</ThemedText>
        {rows.map(({ e, ex, log, pr, top, labels }) => (
          <Pressable key={e.name} disabled={!ex} onPress={() => ex && router.push({ pathname: '/exercise/[id]', params: { id: ex.id } })}
            style={({ pressed }) => [{ borderRadius: 5 }, pressed && { opacity: 0.6 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <ExerciseThumb ex={ex} />
              <View style={{ flex: 1 }}>
                {!!e.superset && <ThemedText style={[styles.tag, { backgroundColor: supersetHex(e.superset.charCodeAt(0) - 65) }]}>SUPERSET {e.superset}</ThemedText>}
                <ThemedText type="smallBold" style={{ color: Lime, fontSize: 16 }}>{ex?.name ?? e.name}</ThemedText>
                {ex && <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12, textTransform: 'capitalize' }}>{ex.muscle} · {ex.equipment}</ThemedText>}
              </View>
            </View>
            <View style={{ marginTop: 8, borderRadius: 5, overflow: 'hidden' }}>
              <View style={styles.setRow}><ThemedText style={[styles.colHead, { width: 48 }]}>SET</ThemedText><ThemedText style={styles.colHead}>{log.some((x) => x.secs !== undefined) ? (log.some((x) => x.kg) ? 'WEIGHT & TIME' : 'TIME') : log.some((x) => x.kg) ? 'WEIGHT & REPS' : 'REPS'}</ThemedText></View>
              {log.length ? log.map((x, i) => (
                <View key={i} style={[styles.setRow, i % 2 ? null : { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="smallBold" style={{ width: 48, color: setTypeColor(x.type) ?? theme.text }}>{labels[i]}</ThemedText>
                  <ThemedText type="small" style={{ fontVariant: ['tabular-nums'] }}>{x.secs !== undefined ? (x.kg ? `${x.kg} kg × ${mmss(x.secs)}` : mmss(x.secs)) : x.kg ? `${x.kg} kg × ${x.reps}` : `${x.reps} reps`}</ThemedText>
                  {pr && i === top && <View style={styles.prTag}><Icon name="medal" size={12} /><ThemedText style={{ fontSize: 11, fontWeight: '700', color: '#f59e0b' }}>1RM</ThemedText></View>}
                </View>
              )) : <View style={[styles.setRow, { backgroundColor: theme.backgroundElement }]}><ThemedText themeColor="textSecondary" style={{ width: 48 }}>—</ThemedText><ThemedText type="small">Best {e.best}</ThemedText></View>}
            </View>
          </Pressable>
        ))}
        {rows.some((r) => r.log.some((x) => x.type)) && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {Object.entries(setTypes).filter(([k]) => rows.some((r) => r.log.some((x) => x.type === k))).map(([k, v]) => (
              <ThemedText key={k} type="small" themeColor="textSecondary" style={{ fontSize: 12 }}><ThemedText type="smallBold" style={{ fontSize: 12, color: setTypeColor(k as never) }}>{v.short}</ThemedText> {v.label}</ThemedText>
            ))}
          </View>
        )}
      </View>

      <View style={{ gap: 8 }}>
        <ThemedText style={styles.h3}>Comments</ThemedText>
        {p.comments.length === 0 && <EmptyState art="comments" size={96} title="No comments yet" text="Hype them up 💪" />}
        {p.comments.map((c, i) => <ThemedText key={i} type="small"><ThemedText type="smallBold">{c.by}</ThemedText> {c.text}</ThemedText>)}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Input value={draft} onChangeText={setDraft} placeholder={`Comment as ${me.name}…`} placeholderTextColor={theme.textSecondary} onSubmitEditing={send} returnKeyType="send"
            style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]} />
          <Press onPress={send} disabled={!draft.trim()} style={[styles.send, { opacity: draft.trim() ? 1 : 0.4 }]} accessibilityLabel="Post comment"><SendHorizontal size={16} color="#09090b" /></Press>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  media: { width: '100%', aspectRatio: 4 / 5, backgroundColor: '#000' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 20, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 12 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  h3: { fontSize: 18, fontWeight: '700' },
  track: { flex: 1, height: 12, borderRadius: 2, overflow: 'hidden' },
  tag: { alignSelf: 'flex-start', fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: '#09090b', paddingHorizontal: 7, borderRadius: 2, overflow: 'hidden', marginBottom: 2 },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  colHead: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: '#a1a1aa' },
  prTag: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 8, backgroundColor: 'rgba(251,191,36,0.15)', borderRadius: 2, paddingHorizontal: 6 },
  input: { flex: 1, borderRadius: 5, paddingHorizontal: 12, paddingVertical: 9, fontSize: 16 },
  send: { width: 42, borderRadius: 5, backgroundColor: Lime, alignItems: 'center', justifyContent: 'center' },
});
