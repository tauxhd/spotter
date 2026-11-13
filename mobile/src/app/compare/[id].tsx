// You vs someone (the website's /u/[id]/compare): big three, strength for bodyweight (DOTS), the last 30 days, and every
// lift you both do.
import { Stack, useLocalSearchParams } from 'expo-router';
import { Crown } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { findExercise, lifters, type Post } from '@shared/data';
import { baseOf, dots, estimated } from '@shared/lifting';
import { bestLifts, setsOf, sharedLifts } from '@shared/progress';
import Avatar from '@/components/avatar';
import { ExerciseThumb } from '@/components/post-card';
import { StatsSkeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { EmptyState, Section } from '@/components/ui/kit';
import { Lime } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { POST_SELECT, sb, toPost, useStore, type Profile, type Row } from '@/lib/store';

const DAY = 864e5;
const kg = (v: number) => (v ? `${Math.round(v)} kg` : '–');

function Line({ label, x, y, fmt = String, neutral }: { label: string; x: number; y: number; fmt?: (v: number) => string; neutral?: boolean }) {
  const win = (me: boolean) => !neutral && (me ? x > y : y > x) ? { color: Lime } : null;
  return (
    <View style={styles.line}>
      <ThemedText style={[styles.val, { textAlign: 'right' }, win(true)]}>{fmt(x)}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.label}>{label}</ThemedText>
      <ThemedText style={[styles.val, win(false)]}>{fmt(y)}</ThemedText>
    </View>
  );
}

function Person({ p, d, win, you }: { p: Profile; d: number; win: boolean; you?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
      <View>
        <Avatar id={p.id} url={p.avatar_url} name={p.name} size={72} />
        {win && <View style={styles.crown}><Crown size={22} color={Lime} fill={Lime} /></View>}
      </View>
      <ThemedText type="smallBold" numberOfLines={1}>{you ? 'You' : p.name}</ThemedText>
      <ThemedText style={{ fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{d || '–'} <ThemedText type="small" themeColor="textSecondary">DOTS</ThemedText></ThemedText>
    </View>
  );
}

export default function Compare() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { s, me } = useStore();
  const theme = useTheme();
  const demo = lifters.find((l) => l.id === id);
  const [them, setThem] = useState<{ p: Profile; posts: Post[] } | null | undefined>(undefined);
  const [mine, setMine] = useState<Post[] | null>(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    const posts = ({ data }: { data: Row[] | null }) => (data ?? []).map((r) => toPost(r, me.id));
    sb.from('posts').select(POST_SELECT).eq('user_id', me.id).order('created_at', { ascending: false }).limit(1000).then((r) => setMine(posts(r)));
    (async () => {
      const p = demo ? ({ ...demo, intake: null, avatar_url: null } as Profile) : ((await sb.from('profiles').select('*').eq('id', id).maybeSingle()).data as Profile | null);
      if (!p) return setThem(null);
      const base = sb.from('posts').select(POST_SELECT);
      setThem({ p, posts: posts(await (demo ? base.is('user_id', null).eq('by', demo.name) : base.eq('user_id', id)).order('created_at', { ascending: false }).limit(1000)) });
    })();
  }, [id, demo, me.id]);

  if (them === undefined || mine === null) return <View style={{ padding: 16, flex: 1, backgroundColor: theme.background }}><StatsSkeleton /></View>;
  if (them === null) return <EmptyState art="not-found" title="This profile doesn't exist" />;

  const side = (p: Profile, posts: Post[]) => {
    const sessions = posts.map((x) => ({ exercises: x.exercises.map((e) => ({ name: findExercise(s.library, e.id, e.name)?.name ?? e.name, sets: (e.log ?? []).map((l) => ({ ...l, done: true })) })) }));
    const est = estimated(baseOf(p), sessions);
    const big = { squat: est['Squat (Barbell)'] ?? 0, bench: est['Bench Press (Barbell)'] ?? 0, deadlift: est['Deadlift (Barbell)'] ?? 0 };
    const total = big.squat + big.bench + big.deadlift;
    const recent = posts.filter((x) => now - new Date(x.at).getTime() < 30 * DAY);
    return {
      big, total, dots: total && Number(p.bw) ? Math.round(dots(total, Number(p.bw), p.sex)) : 0, best: bestLifts(posts),
      month: { workouts: recent.length, volume: recent.reduce((n, x) => n + x.volume, 0), sets: recent.reduce((n, x) => n + setsOf(x), 0) },
      prs: posts.reduce((n, x) => n + x.prs.length, 0),
    };
  };
  const a = side(me, mine), b = side(them.p, them.posts);
  const shared = sharedLifts(a.best, b.best);
  const first = them.p.name.split(' ')[0];
  const verdict = !a.dots || !b.dots ? 'Log squat, bench and deadlift to compare strength'
    : a.dots === b.dots ? 'Dead even, pound for pound' : a.dots > b.dots ? "You're stronger for your bodyweight" : `${first} is stronger for their bodyweight`;

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }}>
      <Stack.Screen options={{ title: `You vs ${first}` }} />
      <Section>
        <View style={{ flexDirection: 'row', gap: 16 }}><Person p={me} you d={a.dots} win={a.dots > b.dots} /><Person p={them.p} d={b.dots} win={b.dots > a.dots} /></View>
        <ThemedText type="smallBold" style={{ textAlign: 'center', marginTop: 14, fontSize: 16 }}>{verdict}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center', marginTop: 4, fontSize: 12 }}>DOTS scores your squat, bench and deadlift for your bodyweight, so any two lifters can be compared.</ThemedText>
      </Section>
      <Section>
        <ThemedText type="smallBold" style={styles.h}>Big three <ThemedText type="small" themeColor="textSecondary">estimated 1RM</ThemedText></ThemedText>
        <Line label="Squat" x={a.big.squat} y={b.big.squat} fmt={kg} />
        <Line label="Bench" x={a.big.bench} y={b.big.bench} fmt={kg} />
        <Line label="Deadlift" x={a.big.deadlift} y={b.big.deadlift} fmt={kg} />
        <Line label="Total" x={a.total} y={b.total} fmt={kg} />
        <Line label="Bodyweight" x={Number(me.bw)} y={Number(them.p.bw)} fmt={kg} neutral />
      </Section>
      <Section>
        <ThemedText type="smallBold" style={styles.h}>Last 30 days</ThemedText>
        <Line label="Workouts" x={a.month.workouts} y={b.month.workouts} />
        <Line label="Volume" x={a.month.volume} y={b.month.volume} fmt={(v) => `${Math.round(v).toLocaleString()} kg`} />
        <Line label="Sets" x={a.month.sets} y={b.month.sets} />
        <Line label="PRs (all time)" x={a.prs} y={b.prs} />
      </Section>
      <Section last>
        <ThemedText type="smallBold" style={styles.h}>Lifts you both do <ThemedText type="small" themeColor="textSecondary">best set</ThemedText></ThemedText>
        {shared.length === 0 && <ThemedText type="small" themeColor="textSecondary" style={{ paddingVertical: 12 }}>No exercises in common yet.</ThemedText>}
        {shared.map(({ name, a: x, b: y }) => (
          <View key={name} style={{ paddingVertical: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ExerciseThumb ex={findExercise(s.library, undefined, name)} size={32} />
              <ThemedText type="smallBold" numberOfLines={1} style={{ flex: 1 }}>{name}</ThemedText>
            </View>
            <View style={styles.line}>
              <ThemedText style={[styles.val, { textAlign: 'right' }, x.e1rm > y.e1rm && { color: Lime }]}>{kg(x.kg)} × {x.reps}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.label}>{x.e1rm > y.e1rm ? '◀ stronger' : y.e1rm > x.e1rm ? 'stronger ▶' : 'tied'}</ThemedText>
              <ThemedText style={[styles.val, y.e1rm > x.e1rm && { color: Lime }]}>{kg(y.kg)} × {y.reps}</ThemedText>
            </View>
          </View>
        ))}
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: 16, marginBottom: 4 },
  line: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  val: { flex: 1, fontWeight: '700', fontVariant: ['tabular-nums'] },
  label: { width: 96, textAlign: 'center', fontSize: 12 },
  crown: { position: 'absolute', top: -14, left: 0, right: 0, alignItems: 'center' },
});
