// You vs someone (the website's /u/[id]/compare): strength for bodyweight (DOTS) with a crown on the winner, where each of
// you puts your training (radar), the big three and the last 30 days as head-to-head bars, and every lift you both do.
// `lift` (from a workout's Compare button) puts that one lift first.
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { findExercise, lifters, type Exercise, type Post } from '@shared/data';
import { baseOf, dots, estimated } from '@shared/lifting';
import { bestLifts, liftStats, setsOf, sharedLifts } from '@shared/progress';
import Avatar from '@/components/avatar';
import { Radar, sum, type Log } from '@/components/muscle-distribution';
import { ExerciseThumb } from '@/components/post-card';
import { StatsSkeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { EmptyState, Icon, Section } from '@/components/ui/kit';
import { Lime } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { POST_SELECT, sb, toPost, useStore, type Profile, type Row } from '@/lib/store';

const DAY = 864e5, SKY = '#38bdf8';
const kg = (v: number) => (v ? `${Math.round(v)} kg` : '–');
const set = (x?: { kg: number; reps: number }) => (x ? `${kg(x.kg)} × ${x.reps}` : '–');

// sets per body area as a share of all sets, so a big and a small trainer can be compared by balance
function balance(posts: Post[], library: Exercise[], bw: number) {
  const logs: Log[] = posts.map((x) => ({ at: new Date(x.at).getTime(), exercises: x.exercises.map((e) => ({ ex: findExercise(library, e.id, e.name), sets: e.log ?? [] })) }));
  const area = sum(logs, 0, Infinity, bw).area;
  const total = Object.values(area).reduce((n, v) => n + v, 0) || 1;
  return Object.fromEntries(Object.entries(area).map(([k, v]) => [k, (v / total) * 100]));
}

// One head-to-head row: both numbers, icon and label, and a bar split by who's ahead (lime = you, sky = them)
function Versus({ icon, label, x, y, fmt = String, neutral }: { icon?: string; label: string; x: number; y: number; fmt?: (v: number) => string; neutral?: boolean }) {
  const share = x + y > 0 ? (x / (x + y)) * 100 : 50;
  return (
    <View style={{ paddingVertical: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <ThemedText style={[styles.val, !neutral && x > y && { color: Lime }]}>{fmt(x)}</ThemedText>
        <View style={styles.mid}>{icon && <Icon name={icon} size={22} />}<ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }} numberOfLines={1}>{label}</ThemedText></View>
        <ThemedText style={[styles.val, { textAlign: 'right' }, !neutral && y > x && { color: SKY }]}>{fmt(y)}</ThemedText>
      </View>
      {!neutral && (
        <View style={styles.track}>
          <View style={{ width: `${share}%`, backgroundColor: Lime, opacity: x >= y ? 1 : 0.45, borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }} />
          <View style={{ flex: 1, backgroundColor: SKY, opacity: y >= x ? 1 : 0.45, borderTopRightRadius: 4, borderBottomRightRadius: 4 }} />
        </View>
      )}
    </View>
  );
}

function Person({ p, d, label, win, you }: { p: Profile; d?: number; label?: string; win: boolean; you?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
      <View style={{ paddingTop: 20 }}>
        {win && <View style={styles.crown}><Icon name="crown" size={34} /></View>}
        <View style={{ borderRadius: 999, borderWidth: 3, borderColor: you ? Lime : SKY, padding: 2 }}><Avatar id={p.id} url={p.avatar_url} name={p.name} size={70} /></View>
      </View>
      <ThemedText type="smallBold" numberOfLines={1}>{you ? 'You' : p.name}</ThemedText>
      {label !== undefined
        ? <ThemedText style={{ fontSize: 20, lineHeight: 26, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{label}</ThemedText>
        : <ThemedText style={{ fontSize: 24, lineHeight: 30, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{d || '–'} <ThemedText type="small" themeColor="textSecondary">DOTS</ThemedText></ThemedText>}
    </View>
  );
}

export default function Compare() {
  const { id, lift } = useLocalSearchParams<{ id: string; lift?: string }>();
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

  if (lift) {
    const x = liftStats(mine, lift), y = liftStats(them.posts, lift);
    const first = them.p.name.split(' ')[0];
    const when = (at: string | null) => (at ? new Date(at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : '–');
    const verdict = !x.sets ? "You haven't logged this lift yet" : !y.sets ? `${first} hasn't logged this lift` : x.e1rm === y.e1rm ? 'Dead even on this lift' : x.e1rm > y.e1rm ? "You're stronger on this lift" : `${first} is stronger on this lift`;
    const bestOf = (v: number) => { const b = v === (x.best?.e1rm ?? 0) ? x.best : y.best; return b ? `${kg(b.kg)} × ${b.reps}` : '–'; };
    return (
      <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }}>
        <Stack.Screen options={{ title: lift }} />
        <Section>
          <View style={{ alignItems: 'center' }}><ExerciseThumb ex={findExercise(s.library, undefined, lift)} size={64} /></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <Person p={me} label={kg(x.e1rm)} win={x.e1rm > y.e1rm} you />
            <Icon name="vs" size={48} />
            <Person p={them.p} label={kg(y.e1rm)} win={y.e1rm > x.e1rm} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 }}>
            <Icon name="flex" size={24} /><ThemedText type="smallBold" style={{ fontSize: 16, flexShrink: 1, textAlign: 'center' }}>{verdict}</ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center', marginTop: 4, fontSize: 12 }}>Estimated one-rep max from each person&apos;s best set (warm-ups don&apos;t count).</ThemedText>
        </Section>
        <Section last>
          <Versus icon="trophy" label="Est. 1RM" x={x.e1rm} y={y.e1rm} fmt={kg} />
          <Versus icon="barbell" label="Heaviest" x={x.heaviest} y={y.heaviest} fmt={kg} />
          <Versus icon="medal" label="Best set" x={x.best?.e1rm ?? 0} y={y.best?.e1rm ?? 0} fmt={bestOf} />
          <Versus icon="target" label="Most reps" x={x.mostReps} y={y.mostReps} />
          <Versus icon="flame" label="Best set volume" x={x.bestVolume} y={y.bestVolume} fmt={kg} />
          <Versus icon="tick-box" label="Sets logged" x={x.sets} y={y.sets} />
          <Versus icon="calendar" label="Sessions" x={x.sessions} y={y.sessions} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}>
            <ThemedText style={styles.val}>{when(x.last)}</ThemedText>
            <View style={styles.mid}><Icon name="stopwatch" size={22} /><ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>Last done</ThemedText></View>
            <ThemedText style={[styles.val, { textAlign: 'right' }]}>{when(y.last)}</ThemedText>
          </View>
        </Section>
      </ScrollView>
    );
  }

  const side = (p: Profile, posts: Post[]) => {
    const sessions = posts.map((x) => ({ exercises: x.exercises.map((e) => ({ name: findExercise(s.library, e.id, e.name)?.name ?? e.name, sets: (e.log ?? []).map((l) => ({ ...l, done: true })) })) }));
    const est = estimated(baseOf(p), sessions);
    const big = { squat: est['Squat (Barbell)'] ?? 0, bench: est['Bench Press (Barbell)'] ?? 0, deadlift: est['Deadlift (Barbell)'] ?? 0 };
    const total = big.squat + big.bench + big.deadlift;
    const recent = posts.filter((x) => now - new Date(x.at).getTime() < 30 * DAY);
    return {
      big, total, dots: total && Number(p.bw) ? Math.round(dots(total, Number(p.bw), p.sex)) : 0, best: bestLifts(posts), balance: balance(posts, s.library, Number(p.bw)),
      month: { workouts: recent.length, volume: recent.reduce((n, x) => n + x.volume, 0), sets: recent.reduce((n, x) => n + setsOf(x), 0) },
      prs: posts.reduce((n, x) => n + x.prs.length, 0),
    };
  };
  const a = side(me, mine), b = side(them.p, them.posts);
  const shared = sharedLifts(a.best, b.best, 30);
  const first = them.p.name.split(' ')[0];
  const verdict = !a.dots || !b.dots ? 'Log squat, bench and deadlift to compare strength'
    : a.dots === b.dots ? 'Dead even, pound for pound' : a.dots > b.dots ? "You're stronger for your bodyweight" : `${first} is stronger for their bodyweight`;

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }}>
      <Stack.Screen options={{ title: `You vs ${first}` }} />
      <Section>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Person p={me} d={a.dots} win={a.dots > b.dots} you />
          <Icon name="vs" size={52} />
          <Person p={them.p} d={b.dots} win={b.dots > a.dots} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 }}>
          <Icon name="flex" size={26} /><ThemedText type="smallBold" style={{ fontSize: 16, flexShrink: 1, textAlign: 'center' }}>{verdict}</ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center', marginTop: 4, fontSize: 12 }}>DOTS scores your squat, bench and deadlift for your bodyweight, so any two lifters can be compared.</ThemedText>
      </Section>


      <Section>
        <ThemedText type="smallBold" style={styles.h}>Where you train <ThemedText type="small" themeColor="textSecondary">share of sets</ThemedText></ThemedText>
        <Radar cur={a.balance} prev={b.balance} vs height={240} />
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
          <View style={styles.key}><View style={[styles.dot, { backgroundColor: Lime }]} /><ThemedText type="small">You</ThemedText></View>
          <View style={styles.key}><View style={[styles.dot, { backgroundColor: SKY }]} /><ThemedText type="small">{first}</ThemedText></View>
        </View>
      </Section>

      <Section>
        <ThemedText type="smallBold" style={styles.h}>Big three <ThemedText type="small" themeColor="textSecondary">estimated 1RM</ThemedText></ThemedText>
        <Versus icon="squat" label="Squat" x={a.big.squat} y={b.big.squat} fmt={kg} />
        <Versus icon="bench" label="Bench" x={a.big.bench} y={b.big.bench} fmt={kg} />
        <Versus icon="deadlift" label="Deadlift" x={a.big.deadlift} y={b.big.deadlift} fmt={kg} />
        <Versus icon="trophy" label="Total" x={a.total} y={b.total} fmt={kg} />
        <Versus icon="scale" label="Bodyweight" x={Number(me.bw)} y={Number(them.p.bw)} fmt={kg} neutral />
      </Section>

      <Section>
        <ThemedText type="smallBold" style={styles.h}>Last 30 days</ThemedText>
        <Versus icon="calendar" label="Workouts" x={a.month.workouts} y={b.month.workouts} />
        <Versus icon="barbell" label="Volume" x={a.month.volume} y={b.month.volume} fmt={(v) => `${Math.round(v).toLocaleString()} kg`} />
        <Versus icon="target" label="Sets" x={a.month.sets} y={b.month.sets} />
        <Versus icon="medal" label="PRs, all time" x={a.prs} y={b.prs} />
      </Section>

      <Section last>
        <ThemedText type="smallBold" style={styles.h}>Lifts you both do <ThemedText type="small" themeColor="textSecondary">best set</ThemedText></ThemedText>
        {shared.length === 0 && <ThemedText type="small" themeColor="textSecondary" style={{ paddingVertical: 12 }}>No exercises in common yet.</ThemedText>}
        {shared.map(({ name, a: x, b: y }) => (
          <View key={name} style={{ paddingTop: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ExerciseThumb ex={findExercise(s.library, undefined, name)} size={32} />
              <ThemedText type="smallBold" numberOfLines={1} style={{ flex: 1 }}>{name}</ThemedText>
            </View>
            <Versus label={x.e1rm > y.e1rm ? '◀ you' : y.e1rm > x.e1rm ? `${first} ▶` : 'tied'} x={x.e1rm} y={y.e1rm} fmt={(v) => set(v === x.e1rm ? x : y)} />
          </View>
        ))}
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: 16, marginBottom: 2 },
  val: { width: 96, fontWeight: '700', fontVariant: ['tabular-nums'] },
  mid: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  track: { flexDirection: 'row', gap: 2, height: 8, marginTop: 6, borderRadius: 4, overflow: 'hidden' },
  crown: { position: 'absolute', top: -2, left: 0, right: 0, alignItems: 'center', zIndex: 1, transform: [{ rotate: '-6deg' }] },
  key: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
