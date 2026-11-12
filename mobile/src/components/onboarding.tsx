// First launch (the website's Onboarding): sign in with your APU TP number, we pull your records, then bodyweight,
// (optional) lifts and a nutrition plan (goal, activity, height, age, goal weight) for the Eat targets.
import { Image } from 'expo-image';
import { LogIn } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { apuStudent, isTp } from '@shared/apu';
import { activities, goals, nutrition, type Goal } from '@shared/nutrition';
import type { Profile } from '@/lib/store';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/kit';
import { Lime, Red } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { img } from '@/lib/web';

type P = Omit<Profile, 'id'>;

function Login({ onFound }: { onFound: (p: P) => void }) {
  const theme = useTheme();
  const [tp, setTp] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const field = [styles.field, { backgroundColor: theme.backgroundElement, color: theme.text }];
  function submit() {
    const s = apuStudent(tp);
    if (!s) return setErr('TP number looks like TP012345');
    onFound({ ...s, bw: 70, squat: 0, bench: 0, deadlift: 0 });
  }
  return (
    <View style={{ gap: 15 }}>
      <View>
        <ThemedText themeColor="textSecondary" style={styles.label}>TP number</ThemedText>
        <Input value={tp} onChangeText={(v) => { setTp(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)); setErr(''); }} placeholder="TP012345"
          placeholderTextColor={theme.textSecondary} autoCapitalize="characters" autoCorrect={false} autoComplete="username" style={field} />
      </View>
      <View>
        <ThemedText themeColor="textSecondary" style={styles.label}>APU password</ThemedText>
        <Input value={pw} onChangeText={setPw} secureTextEntry autoComplete="current-password" style={field} onSubmitEditing={submit} />
      </View>
      {!!err && <ThemedText type="small" style={{ color: Red }}>{err}</ThemedText>}
      <Button onPress={submit} disabled={!isTp(tp) || !pw}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><LogIn size={18} color="#09090b" /><ThemedText type="smallBold" style={{ color: '#09090b', fontSize: 16 }}>Sign in with APU</ThemedText></View>
      </Button>
      <ThemedText themeColor="textSecondary" style={{ fontSize: 12, textAlign: 'center' }}>Demo build: any TP number and password works. Your details are pulled from APU records.</ThemedText>
    </View>
  );
}

// The read-only part of the profile that comes from APU.
function Records({ p }: { p: P }) {
  const theme = useTheme();
  const rows = ([['grad-cap', 'Course', p.course], ['building', 'Faculty', p.faculty], ['intake', 'Intake', p.intake], ['category', 'Category', p.sex === 'F' ? 'Women' : 'Men']] as const).filter(([, , v]) => v);
  return (
    <View style={[styles.section, { borderBottomColor: theme.border, paddingTop: 0 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 8 }}>
        <Icon name="id-card" size={52} />
        <View style={{ flex: 1 }}>
          <ThemedText numberOfLines={1} style={{ fontSize: 20, lineHeight: 24, fontWeight: '700' }}>{p.name}</ThemedText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            {p.tp && <ThemedText type="smallBold" style={{ letterSpacing: 1, fontVariant: ['tabular-nums'] }}>{p.tp}</ThemedText>}
            <Icon name="shield" size={14} /><ThemedText type="small" style={{ fontWeight: '500', color: Lime }}>APU verified</ThemedText>
          </View>
        </View>
      </View>
      {rows.map(([icon, k, v], i) => (
        <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 15, paddingTop: 9 }}>
          <Icon name={icon} size={30} />
          <View style={{ flex: 1, paddingBottom: 9, borderBottomWidth: i < rows.length - 1 ? StyleSheet.hairlineWidth : 0, borderBottomColor: theme.border }}>
            <ThemedText themeColor="textSecondary" style={{ fontSize: 12, lineHeight: 16 }}>{k}</ThemedText>
            <ThemedText style={{ fontWeight: '500', lineHeight: 21 }}>{v}</ThemedText>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function Onboarding({ onSave }: { onSave: (p: P) => Promise<void> }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [p, setP] = useState<P | null>(null);
  const [nums, setNums] = useState<Record<string, string>>({ bw: '70', squat: '', bench: '', deadlift: '', height: '', age: '', goal_bw: '' });
  const [goal, setGoal] = useState<Goal | null>(null);
  const [activity, setActivity] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function save() {
    if (!p) return;
    const n = (k: string) => Math.round((Number(nums[k].replace(',', '.')) || 0) * 100) / 100;
    setBusy(true); setErr('');
    try { await onSave({ ...p, bw: n('bw'), squat: n('squat'), bench: n('bench'), deadlift: n('deadlift'), goal, activity, height: n('height'), age: n('age'), goal_bw: n('goal_bw') }); }
    catch (x) { setErr(x instanceof Error ? x.message : 'Couldn’t save'); setBusy(false); }
  }
  const num = (k: string) => Number(nums[k].replace(',', '.'));
  const bw = num('bw'), h = num('height'), a = num('age'), g = num('goal_bw');
  // new users must set a nutrition plan: it drives their calorie and macro targets in Eat
  const planOk = !!goal && !!activity && h >= 120 && h <= 230 && Number.isInteger(a) && a >= 13 && a <= 90 && g >= 30 && g <= 250;
  const preview = planOk && p && bw >= 30 ? nutrition({ ...p, bw, goal, activity, height: h, age: a }, [], []).targets : null;
  const chip = (on: boolean) => [styles.chip, { backgroundColor: on ? Lime : theme.backgroundElement }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {!p ? (
            <>
              <Image source={img('/welcome.webp')} style={{ width, height: width * (800 / 1200), marginHorizontal: -16, marginBottom: 19 }} contentFit="cover" />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Image source={img('/icon-512.png')} style={{ width: 24, height: 24, borderRadius: 3 }} />
                <ThemedText type="smallBold" style={{ color: Lime, letterSpacing: 1.2, fontWeight: '700' }}>SPOTTER</ThemedText>
              </View>
              <ThemedText style={[styles.title, { marginTop: 4 }]}>Welcome to the APU gym</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ marginBottom: 19 }}>Sign in with your student account.</ThemedText>
              <Login onFound={setP} />
            </>
          ) : (
            <View style={{ gap: 19 }}>
              <View>
                <ThemedText style={styles.title}>Hi, {p.name.split(' ')[0]} 👋</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">We found you. Add your bodyweight and nutrition plan and you&apos;re in.</ThemedText>
              </View>
              <Records p={p} />
              <View style={[styles.section, { borderBottomColor: theme.border }]}>
                <ThemedText style={{ fontWeight: '600' }}>Body &amp; bests <ThemedText type="small" themeColor="textSecondary">(kg)</ThemedText></ThemedText>
                <ThemedText themeColor="textSecondary" style={{ fontSize: 12, lineHeight: 17 }}>Bodyweight is needed for DOTS. Lifts are optional, they put you on the leaderboard and update as you log sets.</ThemedText>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 15 }}>
                  {([['bw', 'Body', 'scale'], ['squat', 'Squat', 'squat'], ['bench', 'Bench', 'bench'], ['deadlift', 'Deadlift', 'deadlift']] as const).map(([k, label, icon]) => (
                    <View key={k} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                      <Icon name={icon} size={36} />
                      <ThemedText themeColor="textSecondary" style={{ fontSize: 12, lineHeight: 16 }}>{label}</ThemedText>
                      <Input value={nums[k]} onChangeText={(v) => setNums((x) => ({ ...x, [k]: v }))} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={theme.textSecondary} selectTextOnFocus
                        style={[styles.num, { backgroundColor: theme.backgroundElement, color: theme.text }, k === 'bw' && { borderWidth: 1, borderColor: 'rgba(132,204,22,0.5)' }]} />
                    </View>
                  ))}
                </View>
              </View>
              <View style={[styles.section, { borderBottomColor: theme.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Icon name="target" size={22} /><ThemedText style={{ fontWeight: '600' }}>Nutrition plan</ThemedText></View>
                <ThemedText themeColor="textSecondary" style={{ fontSize: 12, lineHeight: 17 }}>Sets your daily calorie and macro targets in Eat. You can change it any time.</ThemedText>
                <ThemedText themeColor="textSecondary" style={[styles.label, { marginTop: 15 }]}>Goal</ThemedText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }} accessibilityRole="radiogroup">
                  {(Object.keys(goals) as Goal[]).map((k) => (
                    <Pressable key={k} onPress={() => setGoal(k)} accessibilityRole="radio" accessibilityState={{ checked: goal === k }} style={chip(goal === k)}>
                      <ThemedText type="smallBold" style={goal === k ? { color: '#09090b' } : undefined}>{goals[k].label}</ThemedText>
                    </Pressable>
                  ))}
                </View>
                {goal && <ThemedText themeColor="textSecondary" style={{ fontSize: 12, marginTop: 6 }}>{goals[goal].hint}</ThemedText>}
                <ThemedText themeColor="textSecondary" style={[styles.label, { marginTop: 15 }]}>Activity</ThemedText>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }} accessibilityRole="radiogroup">
                  {activities.map((x) => (
                    <Pressable key={x.v} onPress={() => setActivity(x.v)} accessibilityRole="radio" accessibilityState={{ checked: activity === x.v }} style={[chip(activity === x.v), { flex: 1 }]}>
                      <ThemedText type="smallBold" style={activity === x.v ? { color: '#09090b' } : undefined}>{x.label}</ThemedText>
                      <ThemedText style={{ fontSize: 11, lineHeight: 14, color: activity === x.v ? '#27272a' : theme.textSecondary }}>{x.hint}</ThemedText>
                    </Pressable>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 15 }}>
                  {([['height', 'Height (cm)', '172', 'number-pad'], ['age', 'Age', '21', 'number-pad'], ['goal_bw', 'Goal weight (kg)', '0', 'decimal-pad']] as const).map(([k, label, ph, kb]) => (
                    <View key={k} style={{ flex: 1 }}>
                      <ThemedText themeColor="textSecondary" style={styles.label}>{label}</ThemedText>
                      <Input value={nums[k]} onChangeText={(v) => setNums((x) => ({ ...x, [k]: v }))} keyboardType={kb} placeholder={ph} placeholderTextColor={theme.textSecondary}
                        style={[styles.field, { backgroundColor: theme.backgroundElement, color: theme.text, fontVariant: ['tabular-nums'] }]} />
                    </View>
                  ))}
                </View>
                {preview && (
                  <ThemedText type="small" style={{ marginTop: 12 }}>
                    <ThemedText type="smallBold">{preview.kcal.toLocaleString('en-MY')}</ThemedText><ThemedText type="small" themeColor="textSecondary"> kcal a day · </ThemedText>
                    <ThemedText type="smallBold">P {preview.p}g · C {preview.c}g · F {preview.f}g</ThemedText>
                  </ThemedText>
                )}
              </View>
              {!!err && <ThemedText type="small" style={{ color: Red }}>{err}</ThemedText>}
              <Button onPress={save} disabled={busy || !(bw >= 30 && bw <= 250) || !planOk}>{busy ? 'Saving…' : 'Let’s go'}</Button>
              <Pressable onPress={() => setP(null)} style={{ alignSelf: 'center' }}><ThemedText type="small" themeColor="textSecondary">Not you? Sign in again</ThemedText></Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingBottom: 40 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.5 },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  field: { marginTop: 4, borderRadius: 5, paddingHorizontal: 11, paddingVertical: 9, fontSize: 16 },
  section: { marginHorizontal: -16, paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth },
  chip: { borderRadius: 2, paddingHorizontal: 12, paddingVertical: 7 },
  num: { alignSelf: 'stretch', borderRadius: 4, paddingVertical: 8, fontSize: 16, fontWeight: '600', textAlign: 'center', fontVariant: ['tabular-nums'] },
});
