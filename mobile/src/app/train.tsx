// Train: start a routine, log sets (kg × reps), tick them off, finish to save the workout and post it to the feed.
// PRs, volume and the post summary come from the website's shared logic (@shared/*), so both apps agree.
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import { templates, type ExerciseLog } from '@shared/data';
import { baseOf, bests, countsPR, e1rm, hhmmss, liftsOf } from '@shared/lifting';
import { bodyFor } from '@shared/strength';
import { summarize } from '@shared/workout';
import ExercisePicker from '@/components/exercise-picker';
import { ThemedText } from '@/components/themed-text';
import { Button, Press } from '@/components/ui/button';
import { webUrl } from '@/lib/web';
import { BottomTabInset, Lime, LimeSoft, Red, Spring } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/lib/store';

const imageUrl = webUrl;
const REST_KEY = 'spotter:rest', REST_ON_KEY = 'spotter:rest-on'; // same keys as the website
const store = typeof localStorage !== 'undefined' ? localStorage : undefined;

// Yes/no question: native alert on phones, confirm() in the web preview (Alert does nothing in a browser).
function ask(title: string, msg: string, yes: string, onYes: () => void) {
  if (Platform.OS === 'web') { if (confirm(`${title} ${msg}`)) onYes(); return; }
  Alert.alert(title, msg, [{ text: 'Cancel', style: 'cancel' }, { text: yes, style: 'destructive', onPress: onYes }]);
}

const layout = LinearTransition.springify().dampingRatio(Spring.dampingRatio).duration(Spring.duration);
const AMBER = '#f59e0b';

export default function Train() {
  const { s } = useStore();
  const theme = useTheme();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
      {s.active ? <Workout /> : <Routines />}
    </SafeAreaView>
  );
}

function Routines() {
  const { s, setActive } = useStore();
  const theme = useTheme();
  const start = (name: string, exercises: ExerciseLog[]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setActive(() => ({ title: name, startedAt: new Date().toISOString(), exercises: structuredClone(exercises).map((e) => ({ ...e, sets: e.sets.map(({ kg, reps, type, secs }) => ({ kg, reps, type, secs })) })) }));
  };
  const list = [...s.routines.map((r) => ({ key: r.id, name: r.name, exercises: r.exercises, mine: true })), ...templates.map((t) => ({ key: t.name, name: t.name, exercises: t.exercises, mine: false }))];
  return (
    <ScrollView contentContainerStyle={[styles.page, { paddingBottom: BottomTabInset + 40 }]}>
      <ThemedText style={styles.h1}>Train</ThemedText>
      <Button onPress={() => start('Workout', [])} variant="ghost">Start empty workout</Button>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.section}>ROUTINES</ThemedText>
      {list.map((r, i) => (
        <Animated.View key={r.key} entering={FadeInDown.delay(i * 40).springify().dampingRatio(1).duration(350)} style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <View style={{ flex: 1 }}>
            <ThemedText type="smallBold" style={{ fontSize: 16 }}>{r.name}{!r.mine && <ThemedText type="small" themeColor="textSecondary">  · example</ThemedText>}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>{r.exercises.map((e) => e.name).join(', ')}</ThemedText>
          </View>
          <Button onPress={() => start(r.name, r.exercises)} style={styles.startBtn}>Start</Button>
        </Animated.View>
      ))}
    </ScrollView>
  );
}

function Workout() {
  const { s, me, setActive, finishWorkout, saveRoutine } = useStore();
  const a = s.active!;
  const theme = useTheme();
  const [now, setNow] = useState(() => Date.now()); // the clock lives in state so rendering stays pure
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);
  const [saved, setSaved] = useState(false);
  // Rest timer: starts when you tick a set; length and on/off are remembered on the phone (same keys as the website).
  const [restSecs, setRestSecs] = useState(() => Number(store?.getItem(REST_KEY)) || 90);
  const [restOn] = useState(() => store?.getItem(REST_ON_KEY) !== '0');
  const [restEnd, setRestEnd] = useState<number | null>(null);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const elapsed = Math.max(0, Math.floor((now - new Date(a.startedAt).getTime()) / 1000));
  const rest = restEnd ? Math.max(0, Math.ceil((restEnd - now) / 1000)) : 0;
  useEffect(() => { // rest's over: buzz and clear the bar
    if (!restEnd) return;
    const t = setTimeout(() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); setRestEnd(null); }, Math.max(0, restEnd - Date.now()));
    return () => clearTimeout(t);
  }, [restEnd]);
  const changeRest = (by: number) => {
    const next = Math.max(15, Math.min(600, restSecs + by));
    setRestSecs(next);
    try { store?.setItem(REST_KEY, String(next)); } catch {}
    setRestEnd((e) => (e ? e + by * 1000 : e));
  };

  const lib = useMemo(() => new Map(s.library.map((e) => [e.name, e])), [s.library]);
  const body = useMemo(() => bodyFor(s.library, Number(me.bw)), [s.library, me.bw]);
  const prev = useMemo(() => bests(baseOf(me), s.sessions, body), [me, s.sessions, body]);
  const setMax = (name: string, kg: number, reps: number) => { const b = body(name); return e1rm(kg + b, reps) - b; };

  const edit = (fn: (ex: ExerciseLog[]) => void) => setActive((x) => { if (!x) return x; const ex = structuredClone(x.exercises); fn(ex); return { ...x, exercises: ex }; });

  function toggle(i: number, j: number) {
    const ex = a.exercises[i], st = ex.sets[j];
    if (!st.done && countsPR(st.type)) {
      const today = ex.sets.filter((x, k) => k !== j && x.done && countsPR(x.type)).map((x) => setMax(ex.name, x.kg, x.reps));
      const pr = setMax(ex.name, st.kg, st.reps) > Math.max(prev[ex.name] ?? 0, ...today);
      Haptics.notificationAsync(pr ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning).catch(() => {});
    } else Haptics.selectionAsync().catch(() => {});
    if (!st.done && restOn) setRestEnd(Date.now() + restSecs * 1000);
    edit((x) => { x[i].sets[j].done = !x[i].sets[j].done; });
  }
  const pick = (e: { name: string }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    edit((x) => { x.push({ name: e.name, sets: [{ kg: 0, reps: 10 }, { kg: 0, reps: 10 }, { kg: 0, reps: 10 }] }); });
    setPicking(false);
  };
  async function saveAsRoutine() {
    try {
      await saveRoutine({ name: a.title === 'Workout' ? 'My routine' : a.title, exercises: a.exercises.map((e) => ({ ...e, sets: e.sets.map(({ kg, reps, type, secs }) => ({ kg, reps, ...(type ? { type } : {}), ...(secs !== undefined ? { secs } : {}) })) })) });
      setSaved(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      Alert.alert('Couldn’t save routine', e instanceof Error ? e.message : 'Try again');
    }
  }

  async function finish() {
    const sum = summarize(a.exercises, s.library, prev, body);
    if (!sum.done.length) return Alert.alert('Nothing to save', 'Tick at least one set first.');
    setSaving(true);
    try {
      await finishWorkout({ title: a.title, exercises: sum.done },
        { title: a.title, exercises: sum.exercises, volume: sum.volume, prs: sum.prs, duration: Math.max(1, Math.round(elapsed / 60)) },
        liftsOf(bests(prev, [{ exercises: sum.done }], body)));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      Alert.alert('Couldn’t save', e instanceof Error ? e.message : 'Try again');
      setSaving(false);
    }
  }
  const discard = () => ask('Discard this workout?', 'Your sets won’t be saved.', 'Discard', () => setActive(() => null));
  const anyDone = a.exercises.some((e) => e.sets.some((x) => x.done));

  return (
    <View style={{ flex: 1 }}>
    <ScrollView contentContainerStyle={[styles.page, { paddingBottom: BottomTabInset + 110 }]} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <View>
          <ThemedText style={styles.timer}>{hhmmss(elapsed)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{a.title} · Rest {restOn ? `${Math.floor(restSecs / 60)}:${String(restSecs % 60).padStart(2, '0')}` : 'off'}</ThemedText>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {a.exercises.length > 0 && (
            <Press onPress={saveAsRoutine} disabled={saved} accessibilityLabel={saved ? 'Saved as routine' : 'Save as routine'}
              style={[styles.iconBtn, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText style={{ color: Lime, fontSize: 17 }}>{saved ? '✓' : '＋'}</ThemedText>
            </Press>
          )}
          <Button onPress={finish} disabled={!anyDone || saving} style={styles.finish}>{saving ? 'Saving…' : 'Finish'}</Button>
        </View>
      </View>

      {a.exercises.length === 0 && (
        <ThemedText themeColor="textSecondary" style={{ textAlign: 'center', marginVertical: 30 }}>Add your first exercise to start logging sets.</ThemedText>
      )}
      {a.exercises.map((ex, i) => {
        const best = prev[ex.name];
        const item = lib.get(ex.name);
        return (
          <Animated.View key={ex.name} layout={layout} style={[styles.card, styles.exercise, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.exHead}>
              {imageUrl(item?.image) ? <Image source={{ uri: imageUrl(item?.image) }} style={styles.thumb} /> : <View style={[styles.thumb, { backgroundColor: theme.backgroundSelected }]} />}
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold" style={{ fontSize: 16 }}>{ex.name}</ThemedText>
                {!!best && <ThemedText type="small" themeColor="textSecondary">Best 1RM {Math.round(best * 10) / 10} kg</ThemedText>}
              </View>
              <Press onPress={() => ask(`Remove ${ex.name}?`, 'Its sets go too.', 'Remove', () => edit((x) => { x.splice(i, 1); }))}
                accessibilityLabel={`Remove ${ex.name}`} style={styles.xBtn}>
                <ThemedText themeColor="textSecondary" style={{ fontSize: 15 }}>✕</ThemedText>
              </Press>
            </View>
            <View style={styles.row}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.cSet}>Set</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.cNum}>kg</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.cNum}>Reps</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.cOrm}>1RM</ThemedText>
              <View style={styles.cTick} />
              <View style={styles.cX} />
            </View>
            {ex.sets.map((st, j) => {
              const orm = countsPR(st.type) && st.kg + body(ex.name) > 0 ? setMax(ex.name, st.kg, st.reps) : 0;
              const pr = st.done && orm > (best ?? 0);
              return (
                <Animated.View key={j} entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} layout={layout}
                  style={[styles.row, styles.setRow, st.done && { backgroundColor: pr ? 'rgba(245,158,11,0.2)' : LimeSoft }]}>
                  <ThemedText type="smallBold" style={[styles.cSet, pr && { color: AMBER }]}>{pr ? '★' : j + 1}</ThemedText>
                  <TextInput value={String(st.kg)} keyboardType="decimal-pad" selectTextOnFocus
                    onChangeText={(v) => edit((x) => { x[i].sets[j].kg = Math.max(0, Number(v.replace(',', '.')) || 0); })}
                    style={[styles.cNum, styles.num, { color: theme.text, backgroundColor: st.done ? 'transparent' : theme.backgroundSelected }]} />
                  <TextInput value={String(st.reps)} keyboardType="number-pad" selectTextOnFocus
                    onChangeText={(v) => edit((x) => { x[i].sets[j].reps = Math.max(0, Math.round(Number(v) || 0)); })}
                    style={[styles.cNum, styles.num, { color: theme.text, backgroundColor: st.done ? 'transparent' : theme.backgroundSelected }]} />
                  <ThemedText type="small" themeColor="textSecondary" style={styles.cOrm}>{orm ? Math.round(orm) : '–'}</ThemedText>
                  <Press onPress={() => toggle(i, j)} haptic={false} scaleTo={0.88} accessibilityLabel={st.done ? 'Mark set not done' : 'Mark set done'}
                    style={[styles.cTick, styles.tick, { backgroundColor: st.done ? Lime : theme.backgroundSelected }]}>
                    <ThemedText style={{ color: st.done ? '#09090b' : theme.textSecondary, fontWeight: '800' }}>✓</ThemedText>
                  </Press>
                  <Press onPress={() => edit((x) => { x[i].sets.splice(j, 1); })} accessibilityLabel={`Remove set ${j + 1}`} scaleTo={0.85} style={[styles.cX, styles.xBtn]}>
                    <ThemedText style={{ color: Red, fontSize: 13 }}>✕</ThemedText>
                  </Press>
                </Animated.View>
              );
            })}
            <Press onPress={() => edit((x) => { const l = x[i].sets.at(-1); x[i].sets.push(l ? { kg: l.kg, reps: l.reps } : { kg: 0, reps: 10 }); })} style={styles.addSet}>
              <ThemedText type="smallBold" style={{ color: Lime }}>+ Add set</ThemedText>
            </Press>
          </Animated.View>
        );
      })}
      <Button variant="ghost" onPress={() => setPicking(true)}>＋ Add exercise</Button>
      <Press onPress={discard} style={{ alignSelf: 'center', padding: 12, marginTop: 8 }}>
        <ThemedText type="smallBold" style={{ color: Red }}>Discard workout</ThemedText>
      </Press>
    </ScrollView>
    {rest > 0 && <RestBar left={rest} onChange={changeRest} onSkip={() => setRestEnd(null)} />}
    <ExercisePicker open={picking} onPick={pick} onClose={() => setPicking(false)} taken={a.exercises.map((e) => e.name)} />
    </View>
  );
}

// Floating rest countdown above the tab bar; rises in on a spring, −15 / +15 / skip.
function RestBar({ left, onChange, onSkip }: { left: number; onChange: (by: number) => void; onSkip: () => void }) {
  const theme = useTheme();
  const mm = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  return (
    <Animated.View entering={FadeInDown.springify().dampingRatio(1).duration(350)} exiting={FadeOut.duration(150)}
      style={[styles.restBar, { backgroundColor: theme.backgroundSelected, bottom: BottomTabInset + 16 }]}>
      <ThemedText type="smallBold" style={{ flex: 1 }}>Rest</ThemedText>
      <Press onPress={() => onChange(-15)} style={styles.restBtn}><ThemedText type="smallBold">−15</ThemedText></Press>
      <ThemedText style={styles.restTime}>{mm}</ThemedText>
      <Press onPress={() => onChange(15)} style={styles.restBtn}><ThemedText type="smallBold">+15</ThemedText></Press>
      <Press onPress={onSkip} style={styles.restBtn} accessibilityLabel="Skip rest"><ThemedText type="smallBold">✕</ThemedText></Press>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 12 },
  h1: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.6, marginBottom: 4 },
  section: { marginTop: 12, letterSpacing: 0.6 },
  card: { borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  startBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  timer: { fontSize: 34, lineHeight: 40, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  finish: { paddingVertical: 10, paddingHorizontal: 20 },
  exercise: { flexDirection: 'column', alignItems: 'stretch', gap: 6 },
  exHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  thumb: { width: 44, height: 44, borderRadius: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setRow: { borderRadius: 10, paddingVertical: 4, paddingHorizontal: 4, marginHorizontal: -4 },
  cSet: { width: 28, textAlign: 'center' },
  cNum: { flex: 1, minWidth: 0, width: 0, textAlign: 'center' }, // width 0 + flex: share the row evenly (web inputs have a default width)
  cOrm: { width: 40, textAlign: 'center' },
  cTick: { width: 44 },
  cX: { width: 22 },
  xBtn: { alignItems: 'center', justifyContent: 'center', padding: 4 },
  iconBtn: { width: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  restBar: { position: 'absolute', left: 16, right: 16, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  restBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  restTime: { fontSize: 24, lineHeight: 30, fontWeight: '800', fontVariant: ['tabular-nums'], minWidth: 64, textAlign: 'center' },
  num: { borderRadius: 10, paddingVertical: 8, fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  tick: { height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  addSet: { alignSelf: 'flex-start', paddingVertical: 8 },
});
