// Day-by-day chart over the last `days` days, values labelled on the right (the website's TrendChart.tsx).
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';

import { DAY, dayOf } from '@shared/nutrition';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export type Series = { pts: { day: number; v: number }[]; color: string; name?: string; dots?: boolean; line?: boolean; dashed?: boolean; step?: boolean; area?: boolean };

// Tap a dot for a small popup with every named series' value on that day.
export function TrendChart({ days, series, label, unit }: { days: number; series: Series[]; label: string; unit: string }) {
  const theme = useTheme();
  const [sel, setSel] = useState<number | null>(null);
  const [w, setW] = useState(0);
  const [t1] = useState(() => dayOf(Date.now()));
  const W = 340, H = 160, R = 36, B = 18, T = 8;
  const t0 = t1 - days * DAY;
  const all = series.flatMap((s) => s.pts.filter((p) => p.day >= t0).map((p) => p.v));
  if (!all.length) return <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center', paddingVertical: 40 }}>Nothing logged in the last {days} days.</ThemedText>;
  const lo = Math.min(...all), hi = Math.max(...all), pad = (hi - lo) * 0.12 || hi * 0.02 || 1;
  const y0 = lo - pad, y1 = hi + pad;
  const x = (d: number) => ((Math.max(d, t0) - t0) / (t1 - t0)) * (W - R - 4) + 2;
  const y = (v: number) => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  const ticks = [0, 1, 2, 3].map((i) => y0 + ((y1 - y0) * i) / 3);
  const dates = [0, 1, 2, 3].map((i) => t0 + ((t1 - t0) * i) / 3);
  const fmtV = (v: number) => (hi > 500 ? Math.round(v).toLocaleString('en-MY') : v.toFixed(1));
  const fmtD = (t: number) => new Date(t).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
  // a step line (maintenance) holds its value until the next step
  const at = (sr: Series, day: number) => (sr.step ? sr.pts.filter((p) => p.day <= day).at(-1) : sr.pts.find((p) => p.day === day));
  const rows = sel === null ? [] : series.filter((sr) => sr.name).flatMap((sr) => { const p = at(sr, sel); return p ? [{ name: sr.name!, color: sr.color, v: p.v }] : []; });
  const k = Math.min(w / W, HEIGHT / H), ox = (w - W * k) / 2, oy = (HEIGHT - H * k) / 2; // viewBox -> screen (it's letterboxed)
  return (
    <Pressable onPress={() => setSel(null)} onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ marginTop: 12 }}>
    <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={HEIGHT} accessibilityLabel={label}>
      {ticks.map((v) => (
        <G key={v}>
          <Line x1={0} x2={W - R} y1={y(v)} y2={y(v)} stroke={theme.border} strokeWidth={1} />
          <SvgText x={W - R + 4} y={y(v) + 3} fontSize={9} fill="#71717a">{fmtV(v)}</SvgText>
        </G>
      ))}
      {dates.map((t, i) => <SvgText key={i} x={x(t)} y={H - 4} fontSize={9} fill="#71717a" textAnchor={i === 0 ? 'start' : i === 3 ? 'end' : 'middle'}>{fmtD(t)}</SvgText>)}
      {series.map((s, si) => {
        const pts = s.pts.filter((p, i) => p.day >= t0 || (s.step && s.pts[i + 1]?.day > t0));
        if (!pts.length) return null;
        const d = s.step
          ? pts.map((p, i) => `${i ? `H${x(p.day)}V` : `M${x(p.day)},`}${y(p.v)}`).join('') + `H${x(t1)}`
          : pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.day)},${y(p.v)}`).join('');
        return (
          <G key={si}>
            {s.area && <Path d={`${d}V${H - B}H${x(pts[0].day)}Z`} fill={s.color} opacity={0.12} />}
            {s.line !== false && <Path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeDasharray={s.dashed ? '5 4' : undefined} />}
            {s.dots && pts.map((p) => (
              <G key={p.day} onPress={() => setSel(sel === p.day ? null : p.day)}>
                <Circle cx={x(p.day)} cy={y(p.v)} r={10} fill="transparent" />
                <Circle cx={x(p.day)} cy={y(p.v)} r={sel === p.day ? 4 : 2.5} fill={s.color} />
              </G>
            ))}
          </G>
        );
      })}
      {sel !== null && <Line x1={x(sel)} x2={x(sel)} y1={T} y2={H - B} stroke="#a1a1aa" strokeWidth={1} strokeDasharray="2 3" />}
    </Svg>
    {sel !== null && rows.length > 0 && w > 0 && (
      <View pointerEvents="none" style={[styles.pop, { backgroundColor: theme.backgroundElement, borderColor: theme.border,
        left: Math.min(w - 170, Math.max(0, ox + x(sel) * k - 85)), top: Math.max(0, oy + Math.min(...rows.map((r) => y(r.v))) * k - 14 - 22 * (rows.length + 1)) }]}>
        <ThemedText style={{ fontSize: 12, fontWeight: '700' }}>{new Date(sel).toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'short' })}</ThemedText>
        {rows.map((r) => (
          <View key={r.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: r.color }} />
            <ThemedText themeColor="textSecondary" style={{ fontSize: 12, flex: 1 }}>{r.name}</ThemedText>
            <ThemedText style={{ fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{fmtV(r.v)} {unit}</ThemedText>
          </View>
        ))}
      </View>
    )}
    </Pressable>
  );
}

const HEIGHT = 180;
const styles = StyleSheet.create({
  pop: { position: 'absolute', width: 170, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, gap: 2, elevation: 4,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
});
