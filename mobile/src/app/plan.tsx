// Set your nutrition plan (the website's /eat/plan): goal, body details and activity -> maintenance and targets, live.
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { activities, bodyOf, goals, nutrition, type Goal } from '@shared/nutrition';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/kit';
import { Lime, Red } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/lib/store';

const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));

export default function Plan() {
  const { s, me, updateProfile } = useStore();
  const theme = useTheme();
  const b = bodyOf(me);
  const [goal, setGoal] = useState<Goal>(b.goal);
  const [height, setHeight] = useState(String(b.height));
  const [age, setAge] = useState(String(b.age));
  const [activity, setActivity] = useState(b.activity);
  const [goalBw, setGoalBw] = useState(me.goal_bw ? String(me.goal_bw) : '');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => Date.now());

  const h = num(height), a = num(age), g = num(goalBw);
  const valid = h !== null && h >= 120 && h <= 230 && a !== null && a >= 13 && a <= 90 && (g === null || (g >= 30 && g <= 250));
  const n = nutrition({ ...me, goal, height: valid ? h : b.height, age: valid ? a : b.age, activity, goal_bw: g }, s.food, s.weights, now);

  async function save() {
    setBusy(true); setErr(null);
    try {
      await updateProfile({ goal, height: h, age: a, activity, goal_bw: g });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Couldn’t save'); setBusy(false); }
  }

  const list = [styles.list, { borderColor: theme.border }];
  const option = (on: boolean, last: boolean) => ({ pressed }: { pressed: boolean }) => [styles.option, { borderBottomColor: theme.border, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, backgroundColor: on ? 'rgba(132,204,22,0.1)' : pressed ? theme.backgroundElement : 'transparent' }];
  const radio = (on: boolean) => <View style={[styles.radio, { borderColor: on ? Lime : theme.backgroundSelected, backgroundColor: on ? Lime : 'transparent' }]}>{on && <Check size={13} strokeWidth={3} color="#09090b" />}</View>;
  const field = [styles.field, { color: theme.text, backgroundColor: theme.backgroundElement }];

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <ThemedText style={styles.h1}>Set your nutrition plan</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 4 }}>Pick a goal and check your details. Your targets update as you go.</ThemedText>

      <ThemedText type="smallBold" style={styles.h3}>Goal</ThemedText>
      <ThemedText themeColor="textSecondary" style={{ fontSize: 12 }}>The outcome you want to work toward.</ThemedText>
      <View style={list}>
        {(Object.keys(goals) as Goal[]).map((k, i, all) => (
          <Pressable key={k} onPress={() => setGoal(k)} accessibilityState={{ selected: goal === k }} style={option(goal === k, i === all.length - 1)}>
            <View style={{ flex: 1 }}><ThemedText type="smallBold">{goals[k].label}</ThemedText><ThemedText themeColor="textSecondary" style={{ fontSize: 12 }}>{goals[k].hint}</ThemedText></View>
            {radio(goal === k)}
          </Pressable>
        ))}
      </View>

      <ThemedText type="smallBold" style={styles.h3}>Body</ThemedText>
      <ThemedText themeColor="textSecondary" style={{ fontSize: 12 }}>Used for your starting maintenance estimate. Weight comes from your profile ({me.bw} kg).</ThemedText>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        {([['Height (cm)', height, setHeight, 'number-pad', ''], ['Age', age, setAge, 'number-pad', ''], ['Goal weight (kg)', goalBw, setGoalBw, 'decimal-pad', 'Optional']] as const).map(([label, v, set, kb, ph]) => (
          <View key={label} style={{ flex: 1 }}>
            <ThemedText themeColor="textSecondary" style={{ fontSize: 12 }}>{label}</ThemedText>
            <Input value={v} onChangeText={set} keyboardType={kb} placeholder={ph} placeholderTextColor={theme.textSecondary} style={field} />
          </View>
        ))}
      </View>

      <ThemedText type="smallBold" style={styles.h3}>Activity</ThemedText>
      <View style={list}>
        {activities.map((x, i) => (
          <Pressable key={x.v} onPress={() => setActivity(x.v)} accessibilityState={{ selected: activity === x.v }} style={option(activity === x.v, i === activities.length - 1)}>
            <View style={{ flex: 1 }}><ThemedText type="smallBold">{x.label}</ThemedText><ThemedText themeColor="textSecondary" style={{ fontSize: 12 }}>{x.hint}</ThemedText></View>
            {radio(activity === x.v)}
          </Pressable>
        ))}
      </View>

      <View style={[styles.summary, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText themeColor="textSecondary" style={styles.eyebrow}>Your plan</ThemedText>
        <View style={styles.sumRow}>
          <Icon name="flame" size={28} />
          <ThemedText type="small"><ThemedText type="smallBold" style={{ fontVariant: ['tabular-nums'] }}>{n.kcal.toLocaleString('en-MY')}</ThemedText><ThemedText type="small" themeColor="textSecondary"> kcal maintenance{n.adaptive ? ' (from your logs)' : ''}</ThemedText></ThemedText>
        </View>
        <View style={styles.sumRow}>
          <Icon name="target" size={28} />
          <ThemedText type="small" style={{ flex: 1 }}><ThemedText type="smallBold" style={{ fontVariant: ['tabular-nums'] }}>{n.targets.kcal.toLocaleString('en-MY')}</ThemedText><ThemedText type="small" themeColor="textSecondary"> kcal a day · </ThemedText><ThemedText type="smallBold" style={{ fontVariant: ['tabular-nums'] }}>P {n.targets.p}g · C {n.targets.c}g · F {n.targets.f}g</ThemedText></ThemedText>
        </View>
      </View>

      {err && <ThemedText type="small" style={{ color: Red, marginTop: 12 }}>{err}</ThemedText>}
      <Button onPress={save} disabled={!valid || busy} style={{ marginTop: 16 }}>{busy ? 'Saving…' : 'Save plan'}</Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.5 },
  h3: { fontSize: 16, marginTop: 24 },
  eyebrow: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  list: { marginTop: 8, borderRadius: 5, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  field: { marginTop: 4, borderRadius: 5, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, fontVariant: ['tabular-nums'] },
  summary: { marginTop: 24, borderRadius: 5, padding: 12, gap: 6 },
  sumRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
