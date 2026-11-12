// One exercise, your history with it (the website's /exercise/[id]): progress plot, personal records, strength level,
// set records by 1RM, and past sessions.
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { setTypes, timedByDefault } from '@shared/data';
import { countsPR, countsVolume, e1rm, mmss, setLabels } from '@shared/lifting';
import { LEVELS, bodyFor, isLoadedBodyweight, strengthLevel } from '@shared/strength';
import { rankedLifts, repRecords, type RankedLift } from '@shared/workout';
import { ThemedText } from '@/components/themed-text';
import { EmptyState, Icon, Section } from '@/components/ui/kit';
import { Lime } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/lib/store';
import { img } from '@/lib/web';

type Point = { at: number; heaviest: number; orm: number; setVol: number; vol: number; reps: number; hold: number };
type Metric = { key: keyof Point; label: string; kind: 'kg' | 'reps' | 'time' };
const RANGES = [['3M', 91], ['1Y', 365], ['All', Infinity]] as const;
const DAY = 864e5, TOP = 5;
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const kg = (v: number) => `${Math.round(v * 10) / 10} kg`;
const day = (t: number) => new Date(t).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });

function Tabs({ items, on, set, small }: { items: string[]; on: number; set: (i: number) => void; small?: boolean }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: small ? 16 : 22 }}>
      {items.map((t, i) => (
        <Pressable key={t} onPress={() => set(i)} style={{ paddingBottom: small ? 4 : 8, borderBottomWidth: 2, borderBottomColor: on === i ? Lime : 'transparent' }}>
          <ThemedText type="smallBold" style={{ fontSize: small ? 12 : 14, color: on === i ? theme.text : theme.textSecondary }}>{t}</ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

function Plot({ points, k, days, fmt, pick, onPick }: { points: Point[]; k: keyof Point; days: number; fmt: (v: number) => string; pick: number | null; onPick: (i: number) => void }) {
  const theme = useTheme();
  const [now] = useState(() => Date.now());
  const pts = points.filter((p) => now - p.at <= days * DAY);
  const W = 340, H = 150, L = 34, B = 18, T = 10;
  if (!pts.length) return <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center', paddingVertical: 40 }}>Nothing logged in this range.</ThemedText>;
  const ys = pts.map((p) => p[k] as number);
  const lo = Math.min(...ys), hi = Math.max(...ys), pad = (hi - lo) * 0.15 || hi * 0.1 || 1;
  const y0 = Math.max(0, lo - pad), y1 = hi + pad;
  const t0 = pts[0].at, t1 = Math.max(pts.at(-1)!.at, t0 + DAY);
  const x = (t: number) => (pts.length === 1 ? (L + W) / 2 : L + ((t - t0) / (t1 - t0)) * (W - L - 6));
  const y = (v: number) => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  const sel = pick !== null && pts[pick] ? pick : pts.length - 1;
  const dates = pts.length === 1 ? [t0] : [t0, t0 + (t1 - t0) / 2, t1];
  return (
    <View>
      <ThemedText style={{ fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{fmt(pts[sel][k] as number)} <ThemedText type="smallBold" style={{ color: Lime }}>{day(pts[sel].at)}</ThemedText></ThemedText>
      <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={170} style={{ marginTop: 8 }}>
        {[y0, (y0 + y1) / 2, y1].map((v) => (
          <G key={v}>
            <Line x1={L} x2={W} y1={y(v)} y2={y(v)} stroke={theme.border} strokeWidth={1} />
            <SvgText x={L - 4} y={y(v) + 3} textAnchor="end" fontSize={9} fill="#71717a">{Math.round(v)}</SvgText>
          </G>
        ))}
        {dates.map((t, i) => <SvgText key={i} x={x(t)} y={H - 4} fontSize={9} fill="#71717a" textAnchor={i === 0 ? 'start' : i === dates.length - 1 ? 'end' : 'middle'}>{day(t)}</SvgText>)}
        <Polyline points={pts.map((p) => `${x(p.at)},${y(p[k] as number)}`).join(' ')} fill="none" stroke={Lime} strokeWidth={2} strokeLinejoin="round" />
        {pts.map((p, i) => (
          <G key={p.at} onPress={() => onPick(i)}>
            <Circle cx={x(p.at)} cy={y(p[k] as number)} r={12} fill="transparent" />
            <Circle cx={x(p.at)} cy={y(p[k] as number)} r={i === sel ? 5 : 3} fill={i === sel ? '#a3e635' : Lime} stroke="#09090b" strokeWidth={i === sel ? 2 : 0} />
          </G>
        ))}
      </Svg>
    </View>
  );
}

function Seg({ pct, i }: { pct: number; i: number }) {
  const w = useSharedValue(0);
  useEffect(() => { w.set(withDelay(80 + i * 120, withTiming(pct, { duration: 700, easing: Easing.bezier(0.65, 0, 0.35, 1) }))); }, [pct, i, w]);
  const anim = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return <Animated.View style={[{ height: '100%', backgroundColor: Lime }, anim]} />;
}

function LiftTable({ lifts, added, ranked }: { lifts: RankedLift[]; added: boolean; ranked?: boolean }) {
  const theme = useTheme();
  const head = ranked ? ['#', 'Set', 'Date', 'Est. 1RM'] : ['Reps', 'Best', 'Date', 'Est. 1RM'];
  return (
    <View>
      <View style={styles.liftRow}>{head.map((h, i) => <ThemedText key={h} style={[styles.liftHead, i === 3 && { textAlign: 'right' }]}>{h.toUpperCase()}</ThemedText>)}</View>
      {lifts.map((l, i) => (
        <View key={`${l.kg}x${l.reps}`} style={[styles.liftRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
          <ThemedText type="small" style={styles.liftCell}>{ranked ? i + 1 : l.reps}</ThemedText>
          <ThemedText type="small" style={styles.liftCell}>{ranked ? `${added ? '+' : ''}${l.kg} kg × ${l.reps}` : `${added ? '+' : ''}${l.kg} kg`}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.liftCell}>{new Date(l.at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: '2-digit' })}</ThemedText>
          <ThemedText type="smallBold" style={[styles.liftCell, { textAlign: 'right', color: Lime }]}>{added ? '+' : ''}{Math.round(l.orm * 10) / 10}</ThemedText>
        </View>
      ))}
    </View>
  );
}

export default function ExerciseStats() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { s, me } = useStore();
  const theme = useTheme();
  const ex = s.library.find((e) => e.id === id);
  const [tab, setTab] = useState(0);
  const [metric, setMetric] = useState(0);
  const [range, setRange] = useState(1);
  const [pick, setPick] = useState<number | null>(null);
  const [allLifts, setAllLifts] = useState(false);
  const timed = timedByDefault(id), added = isLoadedBodyweight(id);
  const body = bodyFor(s.library, Number(me.bw))(ex?.name ?? '');

  const sessions = s.sessions
    .map((x) => ({ at: new Date(x.at).getTime(), title: x.title, sets: x.exercises.filter((e) => e.name === ex?.name).flatMap((e) => e.sets.filter((st) => st.done)) }))
    .filter((x) => x.sets.length).sort((a, b) => a.at - b.at);
  const points: Point[] = sessions.map(({ at, sets }) => {
    const work = sets.filter((st) => countsPR(st.type)), vol = sets.filter((st) => countsVolume(st.type));
    return {
      at, heaviest: Math.max(0, ...work.map((st) => st.kg)),
      orm: Math.max(0, ...work.filter((st) => st.reps > 0 && st.kg + body > 0).map((st) => e1rm(st.kg + body, st.reps) - body)),
      setVol: Math.max(0, ...vol.map((st) => st.kg * st.reps)), vol: vol.reduce((n, st) => n + st.kg * st.reps, 0),
      reps: Math.max(0, ...work.map((st) => st.reps)), hold: Math.max(0, ...sets.map((st) => st.secs ?? 0)),
    };
  });
  const metrics: Metric[] = timed ? [{ key: 'hold', label: 'Longest hold', kind: 'time' }] : [
    { key: 'heaviest', label: added ? 'Heaviest added' : 'Heaviest weight', kind: 'kg' }, { key: 'orm', label: 'One rep max', kind: 'kg' },
    { key: 'setVol', label: 'Best set volume', kind: 'kg' }, { key: 'vol', label: 'Session volume', kind: 'kg' }, { key: 'reps', label: 'Most reps', kind: 'reps' },
  ];
  const m = metrics[Math.min(metric, metrics.length - 1)];
  const fmt = (v: number) => (m.kind === 'time' ? mmss(v) : m.kind === 'reps' ? `${v} reps` : kg(v));
  const allSets = sessions.flatMap((x) => x.sets.filter((st) => countsPR(st.type)));
  const best = (k: keyof Point) => Math.max(0, ...points.map((p) => p[k] as number));
  const bestSet = allSets.reduce<{ kg: number; reps: number } | null>((b, st) => (!b || st.kg * st.reps > b.kg * b.reps ? st : b), null);
  const lifts = rankedLifts(s.sessions, ex?.name ?? '', body);
  const repBest = repRecords(lifts);
  const lvl = !timed && points.length ? strengthLevel(id, best('orm'), Number(me.bw), me.sex) : null;

  if (!ex) return s.library.length ? <EmptyState art="not-found" title="Exercise not found" /> : null;
  const records: [string, string][] = timed ? [['Longest hold', best('hold') ? mmss(best('hold')) : '–']] : [
    [added ? 'Heaviest added' : 'Heaviest weight', points.length ? `${added ? '+' : ''}${kg(best('heaviest'))}` : '–'],
    ['Best 1RM', best('orm') ? `${added ? '+' : ''}${kg(best('orm'))}` : '–'],
    ['Best set volume', bestSet ? `${bestSet.kg} kg × ${bestSet.reps}` : '–'],
    ['Best session volume', best('vol') ? `${Math.round(best('vol'))} kg` : '–'],
  ];

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }}>
      <Stack.Screen options={{ title: ex.name }} />
      <View style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border, marginHorizontal: -16, paddingHorizontal: 16 }}>
        <Tabs items={['Summary', 'History']} on={tab} set={setTab} />
      </View>
      {tab === 0 ? (
        <>
          <Section style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Image source={img(ex.image)} style={{ width: 112, height: 112, borderRadius: 4, backgroundColor: '#18181b' }} />
            <View style={{ flex: 1 }}>
              <ThemedText style={{ fontSize: 18, fontWeight: '700' }}>{ex.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 4 }}>Primary: <ThemedText type="small">{cap(ex.muscle)}</ThemedText></ThemedText>
              {ex.secondary.length > 0 && <ThemedText type="small" themeColor="textSecondary">Secondary: <ThemedText type="small">{ex.secondary.map(cap).join(', ')}</ThemedText></ThemedText>}
              <ThemedText type="small" themeColor="textSecondary">{cap(ex.equipment)}</ThemedText>
            </View>
          </Section>
          {points.length === 0 ? <EmptyState art="stats" title="No sets logged yet" text="Do this exercise in a workout and your progress shows up here." /> : (
            <>
              <Section>
                <Plot points={points} k={m.key} days={RANGES[range][1]} fmt={fmt} pick={pick} onPick={setPick} />
                <View style={{ alignItems: 'flex-end', marginTop: 4 }}><Tabs small items={RANGES.map((r) => r[0])} on={range} set={(i) => { setRange(i); setPick(null); }} /></View>
                {metrics.length > 1 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
                    <Tabs items={metrics.map((x) => x.label)} on={metric} set={(i) => { setMetric(i); setPick(null); }} />
                  </ScrollView>
                )}
              </Section>
              <Section>
                <View style={styles.h3}><Icon name="medal" size={22} /><ThemedText type="smallBold" style={{ fontSize: 16 }}>Personal records</ThemedText></View>
                {records.map(([k, v], i) => (
                  <View key={k} style={[styles.recRow, i < records.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}>
                    <ThemedText>{k}</ThemedText><ThemedText type="smallBold" style={{ color: Lime, fontSize: 15 }}>{v}</ThemedText>
                  </View>
                ))}
              </Section>
              {lvl && (
                <Section>
                  <View style={styles.h3}><Icon name="ranks" size={22} /><ThemedText type="smallBold" style={{ fontSize: 16 }}>Strength level</ThemedText></View>
                  <View style={{ flexDirection: 'row', marginTop: 8 }}>
                    <View style={{ flex: 1 }}><ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>Best 1RM</ThemedText><ThemedText style={{ fontSize: 18, fontWeight: '700' }}>{added ? '+' : ''}{kg(best('orm'))}</ThemedText></View>
                    <View style={{ flex: 1, paddingLeft: 16, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: theme.border }}><ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>Level</ThemedText><ThemedText style={{ fontSize: 18, fontWeight: '700', color: Lime }}>{lvl.level}</ThemedText></View>
                  </View>
                  <View style={{ marginTop: 16, justifyContent: 'center' }}>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      {[0, 1, 2, 3].map((i) => <View key={i} style={[styles.seg, { backgroundColor: theme.backgroundSelected }]}><Seg pct={Math.min(100, Math.max(0, (lvl.pos * 4 - i) * 100))} i={i} /></View>)}
                    </View>
                    <View style={[styles.marker, { left: `${lvl.pos * 100}%` }]} />
                  </View>
                  <View style={{ height: 34, marginTop: 8 }}>
                    {LEVELS.map((l, i) => (
                      <View key={l} style={{ position: 'absolute', left: `${i * 25}%`, transform: [{ translateX: i === 0 ? 0 : i === 4 ? -64 : -32 }], width: 64, alignItems: i === 0 ? 'flex-start' : i === 4 ? 'flex-end' : 'center' }}>
                        <ThemedText style={{ fontSize: 11, fontWeight: l === lvl.level ? '700' : '400', color: l === lvl.level ? theme.text : theme.textSecondary }}>{l}</ThemedText>
                        <ThemedText style={{ fontSize: 11, color: l === lvl.level ? Lime : theme.textSecondary, fontVariant: ['tabular-nums'] }}>{added ? '+' : ''}{lvl.tiers[i]}</ThemedText>
                      </View>
                    ))}
                  </View>
                  <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 8 }}>Stronger than about <ThemedText type="smallBold">{lvl.pct}%</ThemedText> of {me.sex === 'F' ? 'women' : 'men'} who train, at your bodyweight. Tier weights are 1RMs in kg.</ThemedText>
                </Section>
              )}
              {!timed && repBest.length > 0 && (
                <Section last>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 }}>
                    <ThemedText type="smallBold" style={{ fontSize: 16, flex: 1 }}>{allLifts ? 'All lifts by 1RM' : 'Set records'}</ThemedText>
                    {lifts.length > TOP && <ThemedText type="smallBold" style={{ color: Lime }} onPress={() => setAllLifts((x) => !x)}>{allLifts ? 'Show records' : `See all ${lifts.length}`}</ThemedText>}
                  </View>
                  {allLifts ? <LiftTable lifts={lifts} added={added} ranked /> : <LiftTable lifts={repBest.slice(0, TOP)} added={added} />}
                </Section>
              )}
            </>
          )}
        </>
      ) : (
        <View style={{ paddingTop: 8 }}>
          {sessions.length === 0 && <EmptyState art="workouts" title="No history yet" text="Sessions with this exercise appear here." />}
          {[...sessions].reverse().map((x) => {
            const labels = setLabels(x.sets, setTypes);
            return (
              <Section key={x.at}>
                <ThemedText type="smallBold">{x.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>{new Date(x.at).toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</ThemedText>
                <View style={{ marginTop: 8, gap: 4 }}>
                  {x.sets.map((st, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: 12, opacity: st.type === 'warmup' ? 0.6 : 1 }}>
                      <ThemedText type="small" style={{ width: 22, fontWeight: st.type === 'warmup' ? '800' : '400', color: st.type === 'warmup' ? '#f59e0b' : theme.textSecondary }}>{labels[i]}</ThemedText>
                      <ThemedText type="small" style={{ fontVariant: ['tabular-nums'] }}>{timed ? `${st.kg ? `${st.kg} kg × ` : ''}${mmss(st.secs ?? 0)}` : `${st.kg || !added ? `${st.kg} kg` : 'BW'} × ${st.reps}`}</ThemedText>
                      {!timed && countsPR(st.type) && st.reps > 0 && st.kg + body > 0 && <ThemedText type="small" themeColor="textSecondary" style={{ marginLeft: 'auto', fontSize: 12 }}>1RM {Math.round(e1rm(st.kg + body, st.reps) - body)} kg</ThemedText>}
                    </View>
                  ))}
                </View>
              </Section>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h3: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  recRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  seg: { flex: 1, height: 8, borderRadius: 2, overflow: 'hidden' },
  marker: { position: 'absolute', width: 16, height: 16, marginLeft: -8, borderRadius: 8, borderWidth: 2, borderColor: '#09090b', backgroundColor: '#a3e635', shadowColor: Lime, shadowOpacity: 0.7, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  liftRow: { flexDirection: 'row', paddingVertical: 8 },
  liftHead: { flex: 1, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: '#a1a1aa' },
  liftCell: { flex: 1, fontVariant: ['tabular-nums'] },
});
