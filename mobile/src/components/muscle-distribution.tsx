// Spider chart of sets per body area (this period vs the one before) plus totals with their change — the website's
// MuscleDistribution, drawn with react-native-svg. `Radar` alone is reused in the workout's Muscles sheet.
import { ArrowDown, ArrowUp } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';

import { addSets, type Exercise } from '@shared/data';
import { countsVolume } from '@shared/lifting';
import { volumeShare } from '@shared/strength';
import { ThemedText } from '@/components/themed-text';
import { Section } from '@/components/ui/kit';
import { Lime, Red } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type Log = { at: number; exercises: { ex?: Exercise; sets: { kg: number; reps: number; type?: string }[] }[] };
const AREAS = ['Back', 'Chest', 'Core', 'Shoulders', 'Arms', 'Legs'] as const;
const PERIODS = [['7D', 7], ['30D', 30], ['3M', 91], ['1Y', 365]] as const;
const DAY = 864e5;

function sum(logs: Log[], from: number, to: number, bw: number) {
  const area: Record<string, number> = {};
  let workouts = 0, sets = 0, reps = 0, volume = 0;
  for (const l of logs) {
    if (l.at < from || l.at >= to) continue;
    workouts++;
    for (const e of l.exercises) {
      addSets(area, e.ex, e.sets.length);
      sets += e.sets.length;
      const body = bw * volumeShare(e.ex?.id); // pull-ups, dips, push-ups move bodyweight too
      for (const st of e.sets) { reps += st.reps; if (countsVolume(st.type as never)) volume += (st.kg + body) * st.reps; }
    }
  }
  return { area, workouts, sets, reps, volume };
}

export function Radar({ cur, prev, height = 260 }: { cur: Record<string, number>; prev?: Record<string, number>; height?: number }) {
  const theme = useTheme();
  const max = Math.max(1, ...AREAS.flatMap((a) => [cur[a] ?? 0, prev?.[a] ?? 0]));
  const R = 92, C = 130;
  const pt = (i: number, f: number) => { const a = ((i * 60 - 120) * Math.PI) / 180; return [C + Math.cos(a) * R * f, C + Math.sin(a) * R * f] as const; };
  const poly = (vals: Record<string, number>) => AREAS.map((a, i) => pt(i, (vals[a] ?? 0) / max).join(',')).join(' ');
  return (
    <Svg viewBox="-40 0 340 260" width="100%" height={height}>
      {[0.2, 0.4, 0.6, 0.8, 1].map((f) => <Polygon key={f} points={AREAS.map((_, i) => pt(i, f).join(',')).join(' ')} fill="none" stroke={theme.border} strokeWidth={1} />)}
      {AREAS.map((_, i) => <Line key={i} x1={C} y1={C} x2={pt(i, 1)[0]} y2={pt(i, 1)[1]} stroke={theme.border} strokeWidth={1} />)}
      {prev && <Polygon points={poly(prev)} fill="rgba(161,161,170,0.1)" stroke="#71717a" strokeWidth={1.5} strokeDasharray="4 3" />}
      <Polygon points={poly(cur)} fill="rgba(132,204,22,0.25)" stroke={Lime} strokeWidth={2} strokeLinejoin="round" />
      {AREAS.map((a, i) => { const [x, y] = pt(i, (cur[a] ?? 0) / max); return <Circle key={a} cx={x} cy={y} r={2.5} fill="#a3e635" />; })}
      {AREAS.map((a, i) => { const [x, y] = pt(i, 1.2); return <SvgText key={a} x={x} y={y + 4} fontSize={11} fill="#71717a" textAnchor={x < C - 10 ? 'end' : x > C + 10 ? 'start' : 'middle'}>{a}</SvgText>; })}
    </Svg>
  );
}

export default function MuscleDistribution({ logs, bw = 0 }: { logs: Log[]; bw?: number }) {
  const theme = useTheme();
  const [p, setP] = useState(1);
  const [now] = useState(() => Date.now());
  const days = PERIODS[p][1];
  const cur = sum(logs, now - days * DAY, now + DAY, bw), prev = sum(logs, now - 2 * days * DAY, now - days * DAY, bw);
  const kVol = (kg: number) => (kg >= 1000 ? `${(kg / 1000).toFixed(1)}k kg` : `${Math.round(kg)} kg`);
  const cards: [string, number, number, (n: number) => string][] = [
    ['Workouts', cur.workouts, prev.workouts, String], ['Sets', cur.sets, prev.sets, String],
    ['Volume', cur.volume, prev.volume, kVol], ['Reps', cur.reps, prev.reps, (n) => n.toLocaleString()],
  ];
  return (
    <Section>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <ThemedText type="smallBold" style={{ fontSize: 16, flex: 1 }}>Muscle distribution</ThemedText>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          {PERIODS.map(([label], i) => (
            <Pressable key={label} onPress={() => setP(i)} style={[styles.tab, p === i && { borderBottomColor: Lime }]}>
              <ThemedText type="smallBold" style={{ fontSize: 12, color: p === i ? theme.text : theme.textSecondary }}>{label}</ThemedText>
            </Pressable>
          ))}
        </View>
      </View>
      <Radar cur={cur.area} prev={prev.area} />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: -6 }}>
        <View style={styles.key}><View style={[styles.swatch, { backgroundColor: Lime }]} /><ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>This {days === 7 ? 'week' : 'period'}</ThemedText></View>
        <View style={styles.key}><View style={[styles.swatch, { backgroundColor: '#71717a' }]} /><ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>Previous</ThemedText></View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 14, rowGap: 14 }}>
        {cards.map(([k, v, before, f]) => {
          const d = v - before;
          return (
            <View key={k} style={{ width: '50%' }}>
              <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>{k}</ThemedText>
              <ThemedText style={{ fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{f(v)}</ThemedText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                {d > 0 ? <ArrowUp size={12} color={Lime} /> : d < 0 ? <ArrowDown size={12} color={Red} /> : null}
                <ThemedText type="smallBold" style={{ fontSize: 12, color: d > 0 ? Lime : d < 0 ? Red : theme.textSecondary }}>{d === 0 ? 'Same as before' : f(Math.abs(d))}</ThemedText>
              </View>
            </View>
          );
        })}
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  tab: { paddingBottom: 4, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  key: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 8, height: 8, borderRadius: 4 },
});
