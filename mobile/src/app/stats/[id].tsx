// Gym stats for a student (the website's /u/[id]/stats): this week + 8-week chart, streak and totals, best lifts with
// DOTS, muscle distribution spider chart, most-trained exercises, and (for yourself) gym visits.
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { findExercise, lifters, type Post } from '@shared/data';
import { baseOf, bests, heaviest, liftsOf } from '@shared/lifting';
import MuscleDistribution, { type Log } from '@/components/muscle-distribution';
import { ExerciseThumb } from '@/components/post-card';
import { ThemedText } from '@/components/themed-text';
import { Bone, EmptyState, Icon, Section } from '@/components/ui/kit';
import { Lime } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { POST_SELECT, sb, toPost, useStore, type Profile } from '@/lib/store';
import { InfoTip } from '@/components/ui/info-tip';
import { help } from '@shared/help';
import { BestLifts, type LiftPage } from '@/components/best-lifts';

const WEEKS = 8, DAY = 864e5;
const weekStart = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x.getTime(); };
const hrs = (min: number) => (min < 60 ? `${min}m` : `${Math.floor(min / 60)}h ${min % 60}m`);

function Big({ icon, value, label }: { icon: string; value: string | number; label: string }) {
  return (
    <View style={{ width: '50%', flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
      <Icon name={icon} size={40} />
      <View><ThemedText style={{ fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{value}</ThemedText><ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>{label}</ThemedText></View>
    </View>
  );
}

export default function GymStats() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { s, me } = useStore();
  const theme = useTheme();
  const own = id === me.id;
  const demo = lifters.find((l) => l.id === id);
  const [p, setP] = useState<Profile | null | undefined>(own ? me : demo ? { ...demo, intake: null, avatar_url: null } : undefined);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [visits, setVisits] = useState<{ in_at: string; out_at: string | null }[]>([]);
  const [now] = useState(() => new Date());

  useEffect(() => {
    if (!own && !demo) sb.from('profiles').select('*').eq('id', id).maybeSingle().then(({ data }) => setP(data));
    const base = sb.from('posts').select(POST_SELECT);
    (demo ? base.is('user_id', null).eq('by', demo.name) : base.eq('user_id', id)).order('created_at', { ascending: false }).limit(200)
      .then(({ data }) => setPosts((data ?? []).map((r) => toPost(r, me.id))));
    if (own) sb.from('visits').select('in_at, out_at').order('in_at', { ascending: false }).limit(500).then(({ data }) => setVisits(data ?? []));
  }, [id, own, demo, me.id]);

  if (p === undefined || posts === null) return <View style={{ padding: 16, gap: 14, backgroundColor: theme.background, flex: 1 }}><Bone w={120} h={14} /><Bone w={200} h={30} /><Bone w="100%" h={96} /><Bone w="100%" h={160} /></View>;
  if (p === null) return <EmptyState art="not-found" title="This profile doesn't exist" />;

  const thisWeek = weekStart(now);
  const setsOf = (x: Post) => x.exercises.reduce((n, e) => n + (e.log?.length || e.sets || 1), 0);
  const total = { workouts: posts.length, minutes: posts.reduce((n, x) => n + (x.duration ?? 0), 0), volume: posts.reduce((n, x) => n + x.volume, 0), sets: posts.reduce((n, x) => n + setsOf(x), 0), prs: posts.reduce((n, x) => n + x.prs.length, 0) };
  const week = posts.filter((x) => new Date(x.at).getTime() >= thisWeek);
  const perWeek = Array.from({ length: WEEKS }, (_, i) => { const start = thisWeek - (WEEKS - 1 - i) * 7 * DAY; return { start, n: posts.filter((x) => { const t = new Date(x.at).getTime(); return t >= start && t < start + 7 * DAY; }).length }; });
  const maxWeek = Math.max(1, ...perWeek.map((w) => w.n));
  let streak = 0;
  for (let i = WEEKS - 1 - (perWeek[WEEKS - 1].n ? 0 : 1); i >= 0 && perWeek[i].n > 0; i--) streak++;

  const exSets: Record<string, number> = {};
  for (const x of posts) for (const e of x.exercises) { const name = findExercise(s.library, e.id, e.name)?.name ?? e.name; exSets[name] = (exSets[name] ?? 0) + (e.log?.length || e.sets || 1); }
  const logs: Log[] = own
    ? s.sessions.map((x) => ({ at: new Date(x.at).getTime(), exercises: x.exercises.map((e) => ({ ex: findExercise(s.library, undefined, e.name), sets: e.sets.filter((st) => st.done) })) }))
    : posts.map((x) => ({ at: new Date(x.at).getTime(), exercises: x.exercises.map((e) => ({ ex: findExercise(s.library, e.id, e.name), sets: e.log ?? Array.from({ length: e.sets || 1 }, () => ({ kg: 0, reps: 0 })) })) }));
  const favourites = Object.entries(exSets).sort((a, b) => b[1] - a[1]).slice(0, 5);
  // Best lifts: what was actually lifted, and the estimated one-rep max, from your own sets or the sets in someone's posts.
  const postSessions = posts.map((x) => ({ exercises: x.exercises.map((e) => ({ name: findExercise(s.library, e.id, e.name)?.name ?? e.name, sets: (e.log ?? []).map((l) => ({ ...l, done: true })) })) }));
  const lifts = own ? liftsOf(heaviest(baseOf(me), s.sessions)) : { squat: Number(p.squat), bench: Number(p.bench), deadlift: Number(p.deadlift) };
  const est = liftsOf(bests(baseOf(p), own ? s.sessions : postSessions));
  const liftPages: LiftPage[] = [{ title: 'Heaviest lifts', info: help.heaviest, lifts }, { title: 'Estimated 1RM', info: help.e1rm, lifts: est }];
  const sbd = Math.max(lifts.squat + lifts.bench + lifts.deadlift, est.squat + est.bench + est.deadlift);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthVisits = visits.filter((v) => new Date(v.in_at).getTime() >= monthStart);
  const visitMin = (v: { in_at: string; out_at: string | null }) => Math.min(240, Math.max(0, Math.round(((v.out_at ? new Date(v.out_at) : now).getTime() - new Date(v.in_at).getTime()) / 60000)));
  const avgVisit = monthVisits.length ? Math.round(monthVisits.reduce((n, v) => n + visitMin(v), 0) / monthVisits.length) : 0;
  const hours: Record<number, number> = {};
  visits.forEach((v) => { const h = new Date(v.in_at).getHours(); hours[h] = (hours[h] ?? 0) + 1; });
  const favHour = Object.entries(hours).sort((a, b) => b[1] - a[1])[0]?.[0];


  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }}>
      <Stack.Screen options={{ title: own ? 'Your gym stats' : `${p.name}'s stats` }} />
      <Section>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.kicker}>THIS WEEK</ThemedText>
        <ThemedText style={{ fontSize: 30, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{week.length} <ThemedText themeColor="textSecondary" style={{ fontSize: 16 }}>workout{week.length === 1 ? '' : 's'}</ThemedText></ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{Math.round(week.reduce((n, x) => n + x.volume, 0)).toLocaleString()} kg · {hrs(week.reduce((n, x) => n + (x.duration ?? 0), 0))} trained</ThemedText>
        <View style={styles.weeks}>
          {perWeek.map((w, i) => (
            <View key={w.start} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <ThemedText style={{ fontSize: 10, fontWeight: '700' }}>{w.n || ' '}</ThemedText>
              <View style={{ width: '100%', height: Math.max(4, (w.n / maxWeek) * 64), borderRadius: 3, backgroundColor: i === WEEKS - 1 ? Lime : theme.backgroundSelected }} />
              <ThemedText themeColor="textSecondary" style={{ fontSize: 9 }}>{new Date(w.start).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}</ThemedText>
            </View>
          ))}
        </View>
      </Section>

      <Section style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        <Big icon="flame" value={`${streak} wk`} label="Weekly streak" />
        <Big icon="calendar" value={total.workouts} label="Workouts" />
        <Big icon="stopwatch" value={hrs(total.minutes)} label="Time trained" />
        <Big icon="target" value={total.sets} label="Sets" />
        <Big icon="medal" value={total.prs} label="Personal records" />
        <Big icon="barbell" value={`${(total.volume / 1000).toFixed(1)} t`} label="Total volume" />
      </Section>

      {sbd > 0 && <BestLifts pages={liftPages} bw={Number(p.bw)} sex={p.sex} />}

      {logs.length > 0 && <MuscleDistribution logs={logs} bw={Number(p.bw)} />}

      {favourites.length > 0 && (
        <Section>
          <ThemedText type="smallBold" style={{ fontSize: 16, marginBottom: 6 }}>Most trained</ThemedText>
          {favourites.map(([name, n]) => {
            const fx = findExercise(s.library, undefined, name);
            return (
              <Pressable key={name} disabled={!fx || !own} onPress={() => fx && router.push({ pathname: '/exercise/[id]', params: { id: fx.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
                <ExerciseThumb ex={fx} size={40} />
                <ThemedText style={{ flex: 1, fontWeight: '500' }} numberOfLines={1}>{name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">{n} sets</ThemedText>
              </Pressable>
            );
          })}
        </Section>
      )}

      {own && (
        <Section>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}><ThemedText type="smallBold" style={{ fontSize: 16 }}>Gym visits</ThemedText><InfoTip text={help.visits} /></View>
          <View style={{ flexDirection: 'row' }}>
            {([['qr', monthVisits.length, 'This month'], ['stopwatch', avgVisit ? hrs(avgVisit) : '–', 'Avg visit'], ['bell', favHour !== undefined ? `${favHour.padStart(2, '0')}:00` : '–', 'Usual time']] as const).map(([ic, v, k]) => (
              <View key={k} style={{ flex: 1, alignItems: 'center' }}>
                <Icon name={ic} size={40} />
                <ThemedText style={{ fontSize: 18, fontWeight: '700', marginTop: 6 }}>{v}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>{k}</ThemedText>
              </View>
            ))}
          </View>
        </Section>
      )}
      {posts.length === 0 && <EmptyState art="stats" title="No stats yet" text={own ? 'Post a workout and your stats start here.' : 'No workouts to show yet.'} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  kicker: { fontSize: 12, letterSpacing: 1 },
  weeks: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 100, marginTop: 16 },
});
