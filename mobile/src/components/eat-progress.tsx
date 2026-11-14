// Eat > Progress: maintenance calories, today's targets, weight trend + goal, and intake vs maintenance.
// The website's twin is src/components/EatProgress.tsx.
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ChevronRight, CircleCheck, Info, TrendingDown, TrendingUp } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { dailyIntake, DAY, dayOf, goals, maintenanceSteps, mealGain, nutrition, weekly } from '@shared/nutrition';
import { ThemedText } from '@/components/themed-text';
import { TrendChart } from '@/components/trend-chart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/kit';
import { Lime } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/lib/store';
import { InfoTip } from '@/components/ui/info-tip';
import { help } from '@shared/help';

const DAYS = 30;
const fmt = (v: number) => Math.round(v).toLocaleString('en-MY');
const signed = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${fmt(Math.abs(v))}`;
const Sky = '#0ea5e9';

function Grow({ pct }: { pct: number }) {
  const w = useSharedValue(0);
  useEffect(() => { w.set(withTiming(Math.min(100, pct), { duration: 700, easing: Easing.bezier(0.65, 0, 0.35, 1) })); }, [pct, w]);
  const anim = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return <Animated.View style={[{ height: '100%', borderRadius: 2, backgroundColor: Lime }, anim]} />;
}

function Badge({ children, tint }: { children: React.ReactNode; tint?: string }) {
  const theme = useTheme();
  return <View style={[styles.badge, { backgroundColor: tint ? `${tint}1f` : theme.backgroundElement }]}>{children}</View>;
}

function Legend({ items }: { items: [string, string, boolean?][] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
      {items.map(([c, label, dot]) => (
        <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={dot ? { width: 6, height: 6, borderRadius: 3, backgroundColor: c } : { width: 12, height: 2, borderRadius: 1, backgroundColor: c }} />
          <ThemedText themeColor="textSecondary" style={{ fontSize: 12 }}>{label}</ThemedText>
        </View>
      ))}
    </View>
  );
}

export function EatProgress() {
  const { s, me, addWeight } = useStore();
  const theme = useTheme();
  const [now] = useState(() => Date.now());
  const [kg, setKg] = useState({ pre: '', post: '' }); // before / after eating
  const [busy, setBusy] = useState(false);
  const n = nutrition(me, s.food, s.weights, now);
  const delta = n.kcal - n.prev;
  const first = n.trend.find((w) => w.day >= now - DAYS * DAY);
  const change = first ? n.current - first.trend : 0;
  const card = [styles.card, { borderBottomColor: theme.border }];
  const muted = { color: theme.textSecondary };
  const plan = () => router.push('/plan');

  const gain = mealGain(s.weights, now);
  const num = (t: string) => parseFloat(t.replace(',', '.'));
  const ok = (t: string) => num(t) >= 30 && num(t) <= 250;
  async function log() {
    const todo = ([['pre', false], ['post', true]] as const).filter(([k]) => ok(kg[k]));
    if (!todo.length) return;
    const was = kg;
    setKg({ pre: ok(kg.pre) ? '' : kg.pre, post: ok(kg.post) ? '' : kg.post }); // on screen at once; numbers come back if the save fails
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setBusy(true);
    try { for (const [k, fed] of todo) await addWeight(num(was[k]), fed); } catch { setKg(was); } finally { setBusy(false); }
  }


  return (
    <View>
      <View style={card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><ThemedText style={styles.eyebrow}>Maintenance calories</ThemedText><InfoTip text={help.maintenance(n.adaptive)} /></View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <Icon name="flame" size={44} />
          <ThemedText style={styles.huge}>{fmt(n.kcal)}<ThemedText type="small" themeColor="textSecondary" style={{ fontWeight: '500' }}> kcal/day</ThemedText></ThemedText>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
          {n.adaptive
            ? <Badge tint={Lime}><CircleCheck size={13} color={Lime} /><ThemedText style={[styles.badgeText, { color: Lime }]}>{n.days >= 21 ? 'Good estimate' : 'Getting there'}</ThemedText></Badge>
            : <Badge><Info size={13} color={theme.textSecondary} /><ThemedText style={[styles.badgeText, muted]}>Formula estimate</ThemedText></Badge>}
          {delta !== 0 && <Badge>{delta < 0 ? <TrendingDown size={13} color={theme.text} /> : <TrendingUp size={13} color={theme.text} />}<ThemedText style={styles.badgeText}>{signed(delta)} this week</ThemedText></Badge>}
        </View>
        <View style={{ flexDirection: 'row', marginTop: 12 }}>
          {([['Last week', fmt(n.prev)], ['Days logged', `${n.days} / 28`], ['Based on', n.adaptive ? 'Your logs' : 'Formula']] as const).map(([k, v], i) => (
            <View key={k} style={[{ flex: 1, paddingHorizontal: 12 }, i === 0 && { paddingLeft: 0 }, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: theme.border }]}>
              <ThemedText style={[{ fontSize: 12 }, muted]}>{k}</ThemedText>
              <ThemedText type="smallBold" style={{ marginTop: 2, fontVariant: ['tabular-nums'] }}>{v}</ThemedText>
            </View>
          ))}
        </View>
      </View>

      <View style={card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><ThemedText style={styles.eyebrow}>Today’s targets</ThemedText><InfoTip text={help.targets} /></View>
          <Pressable onPress={plan} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ThemedText type="smallBold" style={{ fontSize: 12, color: Lime }}>{goals[n.goal].label}</ThemedText><ChevronRight size={14} color={Lime} />
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <Icon name="kcal" size={22} /><ThemedText themeColor="textSecondary">Calories</ThemedText>
          <ThemedText style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>{fmt(n.targets.kcal)}</ThemedText><ThemedText type="small" themeColor="textSecondary">kcal</ThemedText>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
          {([['P', n.targets.p, Sky], ['C', n.targets.c, '#f59e0b'], ['F', n.targets.f, '#ec4899']] as const).map(([k, v, c]) => (
            <View key={k} style={[styles.chip, { backgroundColor: `${c}1a` }]}>
              <ThemedText style={{ fontSize: 14, fontWeight: '700', color: c, fontVariant: ['tabular-nums'] }}>{k} {v}<ThemedText style={{ fontSize: 12, fontWeight: '500', color: c }}>g</ThemedText></ThemedText>
            </View>
          ))}
        </View>
      </View>

      <View style={card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><ThemedText style={styles.eyebrow}>Weight trend ({DAYS} days)</ThemedText><InfoTip text={help.trend} /></View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 }}>
          <ThemedText style={styles.big}>{n.current.toFixed(1)}<ThemedText type="small" themeColor="textSecondary" style={{ fontWeight: '500' }}> kg</ThemedText></ThemedText>
          {first && <Badge tint={change < 0 ? Sky : Lime}><ThemedText style={[styles.badgeText, { color: change < 0 ? Sky : Lime }]}>{change > 0 ? '+' : ''}{change.toFixed(1)} kg</ThemedText></Badge>}
        </View>
        <Legend items={[['#a1a1aa', 'Daily', true], ['#8b5cf6', 'Trend (7-day average)']]} />
        <TrendChart days={DAYS} label="Weight trend" series={[
          { pts: n.trend.map((w) => ({ day: w.day, v: w.trend })), color: '#8b5cf6', area: true },
          { pts: n.trend.map((w) => ({ day: w.day, v: w.kg })), color: '#a1a1aa', line: false, dots: true },
        ]} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {([['pre', 'Before eating'], ['post', 'After eating']] as const).map(([k, label]) => (
            <View key={k} style={{ flex: 1, justifyContent: 'center' }}>
              <Input value={kg[k]} onChangeText={(t) => setKg((x) => ({ ...x, [k]: t }))} keyboardType="decimal-pad" placeholder={label} placeholderTextColor={theme.textSecondary} onSubmitEditing={log}
                accessibilityLabel={`Weight ${label.toLowerCase()} in kg`} style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]} />
              <ThemedText type="small" themeColor="textSecondary" style={{ position: 'absolute', right: 10 }}>kg</ThemedText>
            </View>
          ))}
          <Button onPress={log} disabled={busy || !(ok(kg.pre) || ok(kg.post))} style={{ paddingHorizontal: 18 }}>Log</Button>
        </View>
        <ThemedText style={[{ fontSize: 12, marginTop: 6 }, muted]}>{gain === null
          ? 'The trend uses your before-eating weight: weigh in each morning, after the toilet.'
          : <>Today: <ThemedText style={{ fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{gain >= 0 ? '+' : '−'}{Math.abs(gain).toFixed(1)} kg</ThemedText> after eating. That’s food and water, not fat, so it stays out of the trend.</>}</ThemedText>
        <View style={[styles.split, { borderTopColor: theme.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon name="target" size={18} /><ThemedText type="smallBold">Goal status</ThemedText></View>
            <Pressable onPress={plan} hitSlop={8}><ThemedText type="smallBold" style={{ fontSize: 12, color: Lime }}>{n.goalBw ? 'Edit' : 'Set a goal weight'}</ThemedText></Pressable>
          </View>
          {n.goalBw !== null && (
            <>
              <View style={{ flexDirection: 'row', marginTop: 8 }}>
                {([['Trend weight', `${n.current.toFixed(1)} kg`], ['Goal', `${n.goalBw} kg`], ['Remaining', `${Math.abs(n.goalBw - n.current).toFixed(1)} kg`]] as const).map(([k, v], i) => (
                  <View key={k} style={{ flex: 1, alignItems: i === 2 ? 'flex-end' : 'flex-start' }}>
                    <ThemedText style={[{ fontSize: 12 }, muted]}>{k}</ThemedText>
                    <ThemedText type="smallBold" style={{ fontVariant: ['tabular-nums'] }}>{v}</ThemedText>
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}><Grow pct={(n.progress ?? 0) * 100} /></View>
                <ThemedText style={{ fontSize: 12, fontWeight: '700', color: Lime, fontVariant: ['tabular-nums'] }}>{Math.round((n.progress ?? 0) * 100)}%</ThemedText>
              </View>
            </>
          )}
        </View>
      </View>

      <View style={card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><ThemedText style={styles.eyebrow}>Calorie intake vs maintenance</ThemedText><InfoTip text={help.intake} /></View>
        <Legend items={[[Lime, 'Calorie intake'], ['#f97316', 'Maintenance']]} />
        <TrendChart days={DAYS} label="Calorie intake against maintenance" series={[
          { pts: maintenanceSteps(me, s.food, s.weights, DAYS, now).map((m) => ({ day: m.day, v: m.kcal })), color: '#f97316', step: true, dashed: true },
          // today is still being eaten, so the line stops at yesterday
          { pts: dailyIntake(s.food).filter((d) => d.day < dayOf(now)).map((d) => ({ day: d.day, v: d.kcal })), color: Lime, dots: true },
        ]} />
        <View style={[styles.split, { flexDirection: 'row', gap: 12, borderTopColor: theme.border }]}>
          <View style={styles.stat}>
            <Icon name="plate" size={30} />
            <View><ThemedText style={[{ fontSize: 12 }, muted]}>Avg intake (7 days)</ThemedText><ThemedText style={styles.statValue}>{n.weekAvg === null ? '–' : fmt(n.weekAvg)}<ThemedText style={[{ fontSize: 12 }, muted]}> kcal</ThemedText></ThemedText></View>
          </View>
          <View style={styles.stat}>
            <Icon name="scale" size={30} />
            <View><View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><ThemedText style={[{ fontSize: 12 }, muted]}>Energy balance</ThemedText><InfoTip text={help.balance} size={13} /></View><ThemedText style={[styles.statValue, n.balance !== null && { color: n.balance < 0 ? Sky : Lime }]}>{n.balance === null ? '–' : signed(n.balance)}<ThemedText style={[{ fontSize: 12 }, muted]}> kcal</ThemedText></ThemedText></View>
          </View>
        </View>
        <View style={[styles.weekly, { backgroundColor: theme.backgroundElement }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon name="target" size={18} /><ThemedText type="smallBold">Weekly check</ThemedText><InfoTip text={help.weekly} size={13} /></View>
          <ThemedText type="smallBold" style={{ marginTop: 4, fontVariant: ['tabular-nums'] }}>{weekly(n).rate}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={{ fontVariant: ['tabular-nums'] }}>{weekly(n).adjust}</ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: -16, paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth },
  eyebrow: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  huge: { fontSize: 36, lineHeight: 40, fontWeight: '700', fontVariant: ['tabular-nums'] },
  big: { fontSize: 24, lineHeight: 30, fontWeight: '700', fontVariant: ['tabular-nums'] },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 2 },
  badgeText: { fontSize: 12, lineHeight: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  chip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 2 },
  note: { fontSize: 12, lineHeight: 17, marginTop: 12 },
  input: { borderRadius: 5, paddingVertical: 10, paddingLeft: 12, paddingRight: 32, fontSize: 16, fontVariant: ['tabular-nums'] },
  split: { marginTop: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  track: { flex: 1, height: 8, borderRadius: 2, overflow: 'hidden' },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  weekly: { marginTop: 12, borderRadius: 10, padding: 12 },
  statValue: { fontWeight: '700', fontVariant: ['tabular-nums'] },
});
