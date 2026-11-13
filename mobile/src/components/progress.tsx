// Stats: training by week, month or year (the website's Progress). Switch the bars between workouts, volume, time and
// sets; tap a bar to see that period against the one before it.
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { buckets, change, type Metric, type Period, type PostLike } from '@shared/progress';
import { ThemedText } from '@/components/themed-text';
import { Section } from '@/components/ui/kit';
import { Lime, Red } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const hrs = (min: number) => (min < 60 ? `${min}m` : `${Math.floor(min / 60)}h ${min % 60}m`);
const METRICS: [Metric, string][] = [['workouts', 'Workouts'], ['volume', 'Volume'], ['minutes', 'Time'], ['sets', 'Sets']];
const PERIODS: Period[] = ['week', 'month', 'year'];
const fmt = (m: Metric | 'prs', v: number) => (m === 'volume' ? `${Math.round(v).toLocaleString()} kg` : m === 'minutes' ? hrs(v) : String(v));

export function Delta({ cur, prev, against, size = 13 }: { cur: number; prev: number; against?: string; size?: number }) {
  const theme = useTheme();
  const c = change(cur, prev);
  if (c === null) return against ? <ThemedText type="small" themeColor="textSecondary">First one on record</ThemedText> : null;
  return <ThemedText style={{ fontSize: size, fontWeight: '600', color: c > 0 ? Lime : c < 0 ? Red : theme.textSecondary }}>{c > 0 ? '↑' : c < 0 ? '↓' : '='} {Math.abs(c)}%{against ? ` vs ${against}` : ''}</ThemedText>;
}

export default function Progress({ posts }: { posts: PostLike[] }) {
  const theme = useTheme();
  const [period, setPeriod] = useState<Period>('week');
  const [metric, setMetric] = useState<Metric>('workouts');
  const [pick, setPick] = useState<number | null>(null);
  const b = buckets(posts, period);
  const i = pick ?? b.length - 1, cur = b[i], prev = b[i - 1];
  const max = Math.max(1, ...b.map((x) => x[metric]));
  const tap = () => Haptics.selectionAsync();

  return (
    <Section>
      <View style={styles.row}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.kicker} numberOfLines={1}>{cur.long.toUpperCase()}</ThemedText>
        <View style={[styles.seg, { backgroundColor: theme.backgroundElement }]}>
          {PERIODS.map((p) => (
            <Pressable key={p} onPress={() => { tap(); setPeriod(p); setPick(null); }} accessibilityRole="tab" accessibilityState={{ selected: period === p }}
              style={[styles.segBtn, period === p && { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="smallBold" themeColor={period === p ? 'text' : 'textSecondary'} style={{ fontSize: 12, textTransform: 'capitalize' }}>{p}</ThemedText>
            </Pressable>
          ))}
        </View>
      </View>
      <ThemedText style={{ fontSize: 30, lineHeight: 36, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
        {fmt(metric, cur[metric])}{(metric === 'workouts' || metric === 'sets') && <ThemedText themeColor="textSecondary" style={{ fontSize: 16 }}> {metric === 'sets' ? 'sets' : cur.workouts === 1 ? 'workout' : 'workouts'}</ThemedText>}
      </ThemedText>
      {prev ? <Delta cur={cur[metric]} prev={prev[metric]} against={prev.long.replace('Week of ', 'the week of ')} /> : <ThemedText type="small"> </ThemedText>}

      <View style={styles.bars}>
        {b.map((x, k) => (
          <Pressable key={x.start} onPress={() => { tap(); setPick(k); }} accessibilityLabel={`${x.long}: ${fmt(metric, x[metric])}`} accessibilityState={{ selected: k === i }} style={styles.bar}>
            <ThemedText themeColor={k === i ? 'text' : 'textSecondary'} style={{ fontSize: 9, fontWeight: '700' }}>{x[metric] ? (metric === 'volume' ? `${Math.round(x.volume / 1000)}t` : metric === 'minutes' ? `${Math.round(x.minutes / 60)}h` : x[metric]) : ' '}</ThemedText>
            <View style={{ width: '100%', height: Math.max(4, (x[metric] / max) * 72), borderRadius: 4, backgroundColor: k === i ? Lime : theme.backgroundSelected }} />
            <ThemedText themeColor={k === i ? 'text' : 'textSecondary'} style={{ fontSize: 8, fontWeight: k === i ? '700' : '400' }} numberOfLines={1}>{x.label}</ThemedText>
          </Pressable>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ marginTop: 12 }}>
        {METRICS.map(([m, label]) => (
          <Pressable key={m} onPress={() => { tap(); setMetric(m); }} style={[styles.chip, { backgroundColor: metric === m ? Lime : theme.backgroundElement }]}>
            <ThemedText type="smallBold" style={{ fontSize: 13, color: metric === m ? '#09090b' : theme.text }}>{label}</ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.grid}>
        {([...METRICS.filter(([m]) => m !== metric), ['prs', 'PRs']] as [Metric | 'prs', string][]).map(([m, label]) => (
          <View key={m} style={styles.cell}>
            <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <ThemedText type="smallBold" style={{ fontVariant: ['tabular-nums'] }}>{fmt(m, cur[m])}</ThemedText>
              {prev && <Delta cur={cur[m]} prev={prev[m]} size={11} />}
            </View>
          </View>
        ))}
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  kicker: { fontSize: 12, letterSpacing: 1, flexShrink: 1 },
  seg: { flexDirection: 'row', borderRadius: 8, padding: 2 },
  segBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 116, marginTop: 14 },
  bar: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, rowGap: 8 },
  cell: { width: '50%', flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingRight: 14 },
});
