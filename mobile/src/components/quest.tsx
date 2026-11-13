// First launch as a little game (the website's Quest.tsx): Spot the mascot talks you through sign-in, your student card,
// body, lifts and a nutrition plan, one step at a time, with an XP bar that fills as you go and a level-up at the end.
// The script (steps, lines, XP) is shared in src/lib/quest.ts.
import { createAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { ArrowLeft, UserPlus, Minus, Plus, Sparkles } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing, FadeIn, FadeInDown, FadeInLeft, FadeInRight, FlipInYLeft, useAnimatedStyle, useReducedMotion, useSharedValue,
  withDelay, withRepeat, withSequence, withSpring, withTiming, ZoomIn,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { courses, isTp, newStudent } from '@shared/apu';
import { activities, goals, nutrition, type Goal } from '@shared/nutrition';
import { activityReply, bwReply, goalReply, questArt, steps, totalXp, type Pose } from '@shared/quest';
import { fromUnit, toUnit, type Unit } from '@shared/units';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/kit';
import { Lime, Red } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { art } from '@/lib/art';
import type { Profile } from '@/lib/store';
import { img } from '@/lib/web';

type P = Omit<Profile, 'id'>;
const tap = () => Haptics.selectionAsync().catch(() => {});

// Spot's speech bubble: types the line out (tap to finish it); the full line holds the space so nothing jumps.
function Say({ text }: { text: string }) {
  const theme = useTheme();
  const reduce = useReducedMotion();
  const [n, setN] = useState(() => (reduce ? text.length : 0));
  useEffect(() => {
    if (n >= text.length) return;
    const t = setTimeout(() => setN((x) => x + 1), '.!'.includes(text[n - 1]) ? 220 : 22);
    return () => clearTimeout(t);
  }, [n, text]);
  return (
    <Animated.View entering={ZoomIn.springify().dampingRatio(0.8).duration(320)} style={{ flex: 1 }}>
      <Pressable onPress={() => setN(text.length)} accessibilityLabel={text} accessibilityLiveRegion="polite" style={[styles.bubble, { backgroundColor: theme.backgroundSelected }]}>
        <ThemedText style={styles.bubbleText}>{text.slice(0, n)}<ThemedText style={[styles.bubbleText, { color: 'transparent' }]}>{text.slice(n)}</ThemedText></ThemedText>
      </Pressable>
    </Animated.View>
  );
}

// Spot: bobs gently, pops into each new pose, wiggles when tapped.
function Spot({ pose }: { pose: Pose }) {
  const reduce = useReducedMotion();
  const y = useSharedValue(0), spin = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    y.set(withRepeat(withSequence(withTiming(-5, { duration: 1300, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1300, easing: Easing.inOut(Easing.sin) })), -1));
  }, [reduce, y]);
  const bob = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { rotate: `${spin.value}deg` }] }));
  const wiggle = () => { tap(); spin.set(withSequence(withTiming(-9, { duration: 90 }), withTiming(9, { duration: 140 }), withSpring(0, { dampingRatio: 0.5, duration: 400 }))); };
  return (
    <Pressable onPress={wiggle} accessibilityLabel="Spot, your gym buddy">
      <Animated.View key={pose} entering={reduce ? undefined : ZoomIn.springify().dampingRatio(0.55).duration(520)}>
        <Animated.View style={bob}><Image source={img(questArt(`spot-${pose}`))} style={{ width: 96, height: 96 }} /></Animated.View>
      </Animated.View>
    </Pressable>
  );
}

// "+100 XP" that floats up and fades after each step.
function XpFloat({ xp }: { xp: number }) {
  const o = useSharedValue(0), y = useSharedValue(8), s = useSharedValue(0.7);
  useEffect(() => {
    o.set(withSequence(withTiming(1, { duration: 250 }), withDelay(800, withTiming(0, { duration: 350 }))));
    y.set(withSequence(withTiming(0, { duration: 250 }), withDelay(800, withTiming(-22, { duration: 350 }))));
    s.set(withSequence(withSpring(1.15, { duration: 250 }), withSpring(1)));
  }, [o, y, s]);
  const st = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value }, { scale: s.value }] }));
  return <Animated.View pointerEvents="none" style={[styles.xp, st]}><ThemedText style={styles.xpText}>+{xp} XP</ThemedText></Animated.View>;
}

function XpBar({ xp, done }: { xp: number; done: boolean }) {
  const theme = useTheme();
  const w = useSharedValue(0);
  useEffect(() => { w.set(withSpring(Math.max(4, (xp / totalXp) * 100), { dampingRatio: 0.9, duration: 700 })); }, [xp, w]);
  const fill = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <ThemedText style={[styles.eyebrow, { color: done ? Lime : theme.textSecondary }]}>{done ? 'Level 2 · Gym rat' : 'Level 1 · Rookie'}</ThemedText>
        <ThemedText themeColor="textSecondary" style={[styles.eyebrow, { fontVariant: ['tabular-nums'] }]}>{xp} / {totalXp} XP</ThemedText>
      </View>
      <View style={[styles.track, { backgroundColor: theme.backgroundElement }]}><Animated.View style={[styles.fill, fill]} /></View>
    </View>
  );
}

function CountUp({ to, ms = 900, style }: { to: number; ms?: number; style?: object }) {
  const reduce = useReducedMotion();
  const [v, setV] = useState(() => (reduce ? to : 0));
  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => { const k = Math.min(1, (t - t0) / ms); setV(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms, reduce]);
  return <ThemedText style={style}>{v.toLocaleString('en-MY')}</ThemedText>;
}

const confettiColors = ['#84cc16', '#a3e635', '#facc15', '#38bdf8', '#f472b6', '#fb923c'];
function Piece({ i, h, w }: { i: number; h: number; w: number }) {
  const y = useSharedValue(-40), r = useSharedValue(0);
  useEffect(() => {
    y.set(withDelay((i % 9) * 70, withTiming(h + 40, { duration: 2600, easing: Easing.bezier(0.25, 0.5, 0.4, 1) })));
    r.set(withDelay((i % 9) * 70, withTiming(360 + ((i * 97) % 540), { duration: 2600 })));
  }, [i, h, y, r]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { translateX: (y.value / h) * (((i * 53) % 120) - 60) }, { rotate: `${r.value}deg` }] }));
  return <Animated.View pointerEvents="none" style={[styles.piece, { left: ((i * 37) % 100) / 100 * w, backgroundColor: confettiColors[i % 6], width: i % 3 ? 8 : 6, height: i % 2 ? 12 : 8 }, st]} />;
}
function Confetti() {
  const { width, height } = useWindowDimensions();
  if (useReducedMotion()) return null;
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>{Array.from({ length: 36 }, (_, i) => <Piece key={i} i={i} h={height} w={width} />)}</View>;
}

// A kg value shown and typed in the viewer's unit (the website's WeightInput).
function WeightField({ kg, unit, onKg, style, placeholder = '0' }: { kg: number; unit: Unit; onKg: (kg: number) => void; style?: object; placeholder?: string }) {
  const theme = useTheme();
  const [text, setText] = useState(kg ? String(Math.round(toUnit(kg, unit) * 10) / 10) : '');
  return <Input value={text} onChangeText={(t) => { const v = t.replace(',', '.').replace(/[^\d.]/g, ''); setText(v); onKg(fromUnit(Number(v) || 0, unit)); }}
    keyboardType="decimal-pad" placeholder={placeholder} placeholderTextColor={theme.textSecondary} selectTextOnFocus style={style} />;
}

function Choice({ on, art: a, title, hint, onPress, i }: { on: boolean; art: string; title: string; hint: string; onPress: () => void; i: number }) {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(120 + i * 60).springify().dampingRatio(0.8).duration(450)}>
      <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: on }}
        style={({ pressed }) => [styles.choice, { backgroundColor: on ? 'rgba(132,204,22,0.15)' : theme.backgroundElement, borderColor: on ? Lime : 'transparent', transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
        <Animated.View key={String(on)} entering={on ? ZoomIn.springify().dampingRatio(0.5).duration(400) : undefined}><Image source={img(questArt(a))} style={{ width: 56, height: 56 }} /></Animated.View>
        <View style={{ flex: 1 }}><ThemedText style={{ fontWeight: '700' }}>{title}</ThemedText><ThemedText themeColor="textSecondary" style={{ fontSize: 12, lineHeight: 16 }}>{hint}</ThemedText></View>
        <View style={[styles.radio, { borderColor: on ? Lime : theme.backgroundSelected, backgroundColor: on ? Lime : 'transparent' }]}>{on && <View style={styles.dot} />}</View>
      </Pressable>
    </Animated.View>
  );
}

function Breathe({ on, children }: { on: boolean; children: React.ReactNode }) {
  const s = useSharedValue(1);
  const reduce = useReducedMotion();
  useEffect(() => {
    s.set(on && !reduce ? withRepeat(withSequence(withTiming(1.03, { duration: 800 }), withTiming(1, { duration: 800 })), -1) : withTiming(1));
  }, [on, reduce, s]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return <Animated.View style={st}>{children}</Animated.View>;
}

export default function Quest({ onSave }: { onSave: (p: P) => Promise<void> }) {
  const theme = useTheme();
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [p, setP] = useState<P | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [tp, setTp] = useState('');
  const [name, setName] = useState('');
  const [course, setCourse] = useState('');
  const [intake, setIntake] = useState('');
  const [sex, setSex] = useState<'M' | 'F' | ''>('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [bwText, setBwText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const step = steps[i];
  const first = p?.name.split(' ')[0] ?? '';
  const xp = steps.slice(0, i).reduce((s, x) => s + x.xp, 0);
  const done = step.id === 'done';
  const unit: Unit = p?.unit ?? 'kg';
  const pose: Pose = reply && (step.id === 'goal' || step.id === 'activity') ? 'jump' : step.pose;
  const field = [styles.field, { backgroundColor: theme.backgroundElement, color: theme.text }];

  function go(n: number) {
    tap(); setDir(n > i ? 1 : -1); setReply(null); setErr(''); setBwText(null);
    if (steps[n]?.id === 'done') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      try { const s = createAudioPlayer(art['/sounds/record.mp3']); s.play(); } catch {}
    }
    setI(n); // the ScrollView is keyed by step, so each step starts at the top
  }
  const next = () => go(i + 1);

  const h = Number(height), a = Number(age), g = p?.goal_bw ?? 0;
  const statsOk = h >= 120 && h <= 230 && Number.isInteger(a) && a >= 13 && a <= 90 && g >= 30 && g <= 250;
  const plan = p && p.goal && p.activity && statsOk ? nutrition({ ...p, height: h, age: a }, [], []).targets : null;

  function login() {
    const s = newStudent({ tp, name, course, intake, sex });
    if (typeof s === 'string') return setErr(s);
    setP({ ...s, bw: 70, squat: 0, bench: 0, deadlift: 0 });
    next();
  }
  async function finish() {
    if (!p) return;
    setBusy(true); setErr('');
    const r = (n: number) => Math.round(n * 100) / 100;
    try { await onSave({ ...p, bw: r(p.bw), squat: r(p.squat), bench: r(p.bench), deadlift: r(p.deadlift), height: h, age: a, goal_bw: r(g) }); }
    catch (x) { setErr(x instanceof Error ? x.message : 'Couldn’t save'); setBusy(false); }
  }
  const nudgeBw = (d: number) => { tap(); setBwText(null); setP((x) => x && { ...x, bw: Math.min(250, Math.max(30, Math.round((x.bw + d) * 10) / 10)) }); };

  const cta: Record<string, { label: string; ok: boolean; run: () => void } | null> = {
    hello: { label: 'Start the quest', ok: true, run: next },
    login: null,
    found: { label: 'That’s me!', ok: true, run: next },
    body: { label: 'Next', ok: !!p && p.bw >= 30 && p.bw <= 250, run: next },
    lifts: { label: p && (p.squat || p.bench || p.deadlift) ? 'Next' : 'Skip for now', ok: true, run: next },
    goal: { label: 'Lock it in', ok: !!p?.goal, run: next },
    activity: { label: 'Next', ok: !!p?.activity, run: next },
    stats: { label: 'Finish quest', ok: statsOk, run: next },
    done: { label: busy ? 'Saving…' : 'Start training', ok: !busy, run: finish },
  };
  const action = cta[step.id];
  const enter = (dir > 0 ? FadeInRight : FadeInLeft).springify().dampingRatio(1).duration(450);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* XP bar */}
        <View style={styles.top}>
          <Pressable onPress={() => go(i - 1)} disabled={i === 0 || done} accessibilityLabel="Back"
            style={[styles.back, { backgroundColor: theme.backgroundElement, opacity: i === 0 || done ? 0 : 1 }]}><ArrowLeft size={18} color={theme.text} /></Pressable>
          <XpBar xp={xp} done={done} />
          {dir > 0 && i > 0 && steps[i - 1].xp > 0 && <XpFloat key={i} xp={steps[i - 1].xp} />}
        </View>

        <ScrollView key={i} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {/* Spot + what he's saying */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 12 }}>
            <Spot pose={pose} />
            <View style={{ flex: 1, flexDirection: 'row', marginBottom: 24 }}><Say key={`${i}-${reply ?? ''}`} text={reply ?? step.say(first)} /></View>
          </View>

          <Animated.View key={i} entering={enter} style={{ marginTop: 16 }}>
            {step.id === 'hello' && (
              <View>
                <Image source={img('/welcome.webp')} style={{ width: '100%', aspectRatio: 1.5, borderRadius: 6 }} contentFit="cover" />
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                  {([['train', 'Log lifts'], ['ranks', 'Climb ranks'], ['eat', 'Eat smart']] as const).map(([ic, t], n) => (
                    <Animated.View key={t} entering={FadeInDown.delay(250 + n * 80).springify()} style={[styles.tile, { backgroundColor: theme.backgroundElement }]}>
                      <Icon name={ic} size={40} /><ThemedText type="smallBold" style={{ fontSize: 12, marginTop: 4 }}>{t}</ThemedText>
                    </Animated.View>
                  ))}
                </View>
              </View>
            )}

            {step.id === 'login' && (
              <View style={{ gap: 12 }}>
                <View><ThemedText themeColor="textSecondary" style={styles.label}>Full name</ThemedText>
                  <Input autoFocus value={name} onChangeText={(v) => { setName(v.slice(0, 40)); setErr(''); }} placeholder="Aiden Lim"
                    placeholderTextColor={theme.textSecondary} autoComplete="name" style={field} /></View>
                <View><ThemedText themeColor="textSecondary" style={styles.label}>TP number</ThemedText>
                  <Input value={tp} onChangeText={(v) => { setTp(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)); setErr(''); }} placeholder="TP012345"
                    placeholderTextColor={theme.textSecondary} autoCapitalize="characters" autoCorrect={false} autoComplete="username" style={field} /></View>
                <View><ThemedText themeColor="textSecondary" style={styles.label}>Course</ThemedText>
                  <View style={{ gap: 6, marginTop: 4 }}>
                    {courses.map((c) => (
                      <Pressable key={c.course} onPress={() => { setCourse(c.course); setErr(''); }} style={[styles.pick, { backgroundColor: course === c.course ? Lime : theme.backgroundElement }]}>
                        <ThemedText type="small" style={{ color: course === c.course ? '#09090b' : theme.text, fontWeight: course === c.course ? '700' : '400' }}>{c.course}</ThemedText>
                      </Pressable>
                    ))}
                  </View></View>
                <View><ThemedText themeColor="textSecondary" style={styles.label}>Intake code (optional, for your timetable)</ThemedText>
                  <Input value={intake} onChangeText={(v) => { setIntake(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16)); setErr(''); }} placeholder="APD2F2602CS"
                    placeholderTextColor={theme.textSecondary} autoCapitalize="characters" autoCorrect={false} style={field} /></View>
                <View><ThemedText themeColor="textSecondary" style={styles.label}>Category</ThemedText>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    {([['M', 'Men'], ['F', 'Women']] as const).map(([v, l]) => (
                      <Pressable key={v} onPress={() => { setSex(v); setErr(''); }} style={[styles.pick, { flex: 1, alignItems: 'center', backgroundColor: sex === v ? Lime : theme.backgroundElement }]}>
                        <ThemedText style={{ color: sex === v ? '#09090b' : theme.text, fontWeight: '700' }}>{l}</ThemedText>
                      </Pressable>
                    ))}
                  </View></View>
                {!!err && <ThemedText type="small" style={{ color: Red }}>{err}</ThemedText>}
                <Button onPress={login} disabled={!name.trim() || !isTp(tp) || !course || !sex}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><UserPlus size={18} color="#09090b" /><ThemedText style={{ color: '#09090b', fontWeight: '700' }}>Create my account</ThemedText></View>
                </Button>
              </View>
            )}

            {step.id === 'found' && p && (
              <Animated.View entering={FlipInYLeft.delay(150).duration(700)} style={styles.cardEdge}>
                <View style={styles.card}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Icon name="id-card" size={56} />
                    <View style={{ flex: 1 }}>
                      <ThemedText numberOfLines={1} style={{ fontSize: 20, lineHeight: 24, fontWeight: '700', color: '#fff' }}>{p.name}</ThemedText>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <ThemedText type="smallBold" style={{ color: '#d4d4d8', letterSpacing: 1 }}>{p.tp}</ThemedText><Icon name="shield" size={14} /><ThemedText type="smallBold" style={{ color: Lime }}>Member</ThemedText>
                      </View>
                    </View>
                    <View style={styles.lv}><ThemedText style={{ fontSize: 11, fontWeight: '700', color: '#09090b' }}>LV 1</ThemedText></View>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
                    {([['grad-cap', 'Course', p.course], ['building', 'Faculty', p.faculty], ['intake', 'Intake', p.intake], ['category', 'Category', p.sex === 'F' ? 'Women' : 'Men']] as const).filter(([, , v]) => v).map(([ic, k, v], n) => (
                      <Animated.View key={k} entering={FadeInDown.delay(500 + n * 80).springify()} style={[styles.cell, { flexBasis: k === 'Course' ? '100%' : '45%', flexGrow: 1 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon name={ic} size={18} /><ThemedText style={[styles.eyebrow, { color: '#a1a1aa' }]}>{k}</ThemedText></View>
                        <ThemedText type="smallBold" style={{ color: '#fff', marginTop: 4 }}>{v}</ThemedText>
                      </Animated.View>
                    ))}
                  </View>
                </View>
              </Animated.View>
            )}

            {step.id === 'body' && p && (
              <View style={{ alignItems: 'center' }}>
                <View style={[styles.seg, { backgroundColor: theme.backgroundElement }]}>
                  {(['kg', 'lb'] as const).map((x) => (
                    <Pressable key={x} onPress={() => { tap(); setBwText(null); setP({ ...p, unit: x }); }} style={[styles.segBtn, unit === x && { backgroundColor: Lime }]}>
                      <ThemedText type="smallBold" style={{ color: unit === x ? '#09090b' : theme.textSecondary }}>{x}</ThemedText>
                    </Pressable>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 24 }}>
                  <Pressable onPress={() => nudgeBw(-0.5)} accessibilityLabel="Less" style={[styles.round, { backgroundColor: theme.backgroundElement }]}><Minus size={20} color={theme.text} /></Pressable>
                  <Animated.View key={Math.round(p.bw)} entering={ZoomIn.springify().dampingRatio(0.6).duration(260)} style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                    <Input value={bwText ?? String(Math.round(toUnit(p.bw, unit) * 10) / 10)} keyboardType="decimal-pad" selectTextOnFocus accessibilityLabel={`Bodyweight in ${unit}`}
                      onChangeText={(t) => { const v = t.replace(',', '.').replace(/[^\d.]/g, ''); setBwText(v); setP({ ...p, bw: fromUnit(Number(v) || 0, unit) }); }}
                      style={[styles.big, { color: theme.text }]} />
                    <ThemedText themeColor="textSecondary" style={{ fontSize: 18, fontWeight: '700', marginBottom: 10 }}>{unit}</ThemedText>
                  </Animated.View>
                  <Pressable onPress={() => nudgeBw(0.5)} accessibilityLabel="More" style={[styles.round, { backgroundColor: theme.backgroundElement }]}><Plus size={20} color={theme.text} /></Pressable>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                  {[-5, -1, 1, 5].map((d) => (
                    <Pressable key={d} onPress={() => nudgeBw(fromUnit(d, unit))} style={[styles.chip, { backgroundColor: theme.backgroundElement }]}><ThemedText type="smallBold">{d > 0 ? `+${d}` : d}</ThemedText></Pressable>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 }}><Icon name="scale" size={20} /><ThemedText type="small" themeColor="textSecondary">{bwReply(p.bw)}</ThemedText></View>
              </View>
            )}

            {step.id === 'lifts' && p && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {([['squat', 'Squat'], ['bench', 'Bench'], ['deadlift', 'Deadlift']] as const).map(([k, label], n) => (
                  <Animated.View key={k} entering={FadeInDown.delay(120 + n * 70).springify()} style={[styles.tile, { backgroundColor: theme.backgroundElement, gap: 6 }]}>
                    <Icon name={k} size={52} />
                    <ThemedText type="smallBold">{label}</ThemedText>
                    <WeightField key={k + unit} kg={p[k]} unit={unit} onKg={(v) => setP((x) => x && { ...x, [k]: v })} style={[styles.num, { backgroundColor: theme.backgroundSelected, color: theme.text }]} />
                    <ThemedText themeColor="textSecondary" style={{ fontSize: 11 }}>{unit} · 1 rep</ThemedText>
                  </Animated.View>
                ))}
              </View>
            )}

            {step.id === 'goal' && p && (
              <View style={{ gap: 8 }} accessibilityRole="radiogroup">
                {(Object.keys(goals) as Goal[]).map((k, n) => (
                  <Choice key={k} i={n} on={p.goal === k} art={k} title={goals[k].label} hint={goals[k].hint} onPress={() => { tap(); setP({ ...p, goal: k }); setReply(goalReply[k]); }} />
                ))}
              </View>
            )}

            {step.id === 'activity' && p && (
              <View style={{ gap: 8 }} accessibilityRole="radiogroup">
                {activities.map((x, n) => (
                  <Choice key={x.v} i={n} on={p.activity === x.v} art={x.label.toLowerCase()} title={x.label} hint={x.hint} onPress={() => { tap(); setP({ ...p, activity: x.v }); setReply(activityReply(x.label)); }} />
                ))}
              </View>
            )}

            {step.id === 'stats' && p && (
              <View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}><ThemedText themeColor="textSecondary" style={styles.label}>Height (cm)</ThemedText>
                    <Input autoFocus value={height} onChangeText={(v) => setHeight(v.replace(/[^0-9]/g, '').slice(0, 3))} keyboardType="number-pad" placeholder="172" placeholderTextColor={theme.textSecondary} style={[field, styles.statIn]} /></View>
                  <View style={{ flex: 1 }}><ThemedText themeColor="textSecondary" style={styles.label}>Age</ThemedText>
                    <Input value={age} onChangeText={(v) => setAge(v.replace(/[^0-9]/g, '').slice(0, 2))} keyboardType="number-pad" placeholder="21" placeholderTextColor={theme.textSecondary} style={[field, styles.statIn]} /></View>
                  <View style={{ flex: 1 }}><ThemedText themeColor="textSecondary" style={styles.label}>Goal ({unit})</ThemedText>
                    <WeightField key={'goal' + unit} kg={g} unit={unit} onKg={(v) => setP((x) => x && { ...x, goal_bw: v })} style={[field, styles.statIn]} /></View>
                </View>
                <View style={[styles.preview, { backgroundColor: theme.backgroundElement, opacity: plan ? 1 : 0.5 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Sparkles size={13} color={theme.textSecondary} /><ThemedText themeColor="textSecondary" style={styles.eyebrow}>Your plan preview</ThemedText></View>
                  {plan ? (
                    <ThemedText type="small" style={{ marginTop: 4 }}><ThemedText type="smallBold">{plan.kcal.toLocaleString('en-MY')}</ThemedText> kcal a day · <ThemedText type="smallBold">P {plan.p}g · C {plan.c}g · F {plan.f}g</ThemedText></ThemedText>
                  ) : <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 4 }}>Fill in all three to see it.</ThemedText>}
                </View>
              </View>
            )}

            {done && p && plan && (
              <View style={{ alignItems: 'center' }}>
                <Animated.View entering={ZoomIn.springify().dampingRatio(0.55).duration(600)}><Image source={img(questArt('chest'))} style={{ width: 120, height: 120 }} /></Animated.View>
                <ThemedText themeColor="textSecondary" style={[styles.eyebrow, { marginTop: 8 }]}>Your daily plan · {goals[p.goal as Goal].label}</ThemedText>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 }}>
                  <CountUp to={plan.kcal} style={styles.kcal} /><ThemedText themeColor="textSecondary" style={{ fontSize: 18, fontWeight: '700', marginBottom: 10, marginLeft: 4 }}>kcal</ThemedText>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 16, alignSelf: 'stretch' }}>
                  {([['protein', 'Protein', plan.p, '#0ea5e9'], ['carbs', 'Carbs', plan.c, '#f59e0b'], ['fat', 'Fat', plan.f, '#ec4899']] as const).map(([ic, label, v, c], n) => (
                    <Animated.View key={label} entering={FadeInDown.delay(300 + n * 90).springify()} style={[styles.tile, { backgroundColor: theme.backgroundElement }]}>
                      <Icon name={ic} size={32} />
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}><CountUp to={v} ms={1100} style={[styles.macro, { color: c }]} /><ThemedText style={[styles.macro, { color: c }]}>g</ThemedText></View>
                      <ThemedText themeColor="textSecondary" style={{ fontSize: 12 }}>{label}</ThemedText>
                    </Animated.View>
                  ))}
                </View>
                <Animated.View entering={FadeIn.delay(900)} style={styles.levelUp}><Icon name="trophy" size={20} /><ThemedText type="smallBold" style={{ color: Lime }}>Level up! +{totalXp} XP earned</ThemedText></Animated.View>
                {!!err && <ThemedText type="small" style={{ color: Red, marginTop: 12 }}>{err}</ThemedText>}
              </View>
            )}
          </Animated.View>
        </ScrollView>

        {action && (
          <View style={styles.bottom}>
            <Breathe on={action.ok && (done || step.id === 'hello')}><Button onPress={action.run} disabled={!action.ok}>{action.label}</Button></Breathe>
            {step.id === 'found' && <Pressable onPress={() => go(1)} style={{ alignSelf: 'center', marginTop: 10 }}><ThemedText type="small" themeColor="textSecondary">Fix my details</ThemedText></Pressable>}
          </View>
        )}
        {done && <Confetti />}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pick: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8 },
  back: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  track: { height: 10, borderRadius: 5, overflow: 'hidden', marginTop: 4 },
  fill: { height: '100%', borderRadius: 5, backgroundColor: Lime },
  xp: { position: 'absolute', right: 16, top: 36, backgroundColor: Lime, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  xpText: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: '#09090b' },
  body: { paddingHorizontal: 16, paddingBottom: 24 },
  bubble: { borderRadius: 8, borderBottomLeftRadius: 2, paddingHorizontal: 14, paddingVertical: 11 },
  bubbleText: { fontSize: 15, lineHeight: 21, fontWeight: '500' },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  field: { marginTop: 4, borderRadius: 5, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16 },
  tile: { flex: 1, alignItems: 'center', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 12 },
  cardEdge: { borderRadius: 8, padding: 2, backgroundColor: Lime, shadowColor: Lime, shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  card: { borderRadius: 7, backgroundColor: '#09090b', padding: 16 },
  lv: { backgroundColor: Lime, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  cell: { borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.06)', padding: 10 },
  seg: { flexDirection: 'row', borderRadius: 999, padding: 4 },
  segBtn: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 4 },
  round: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  big: { fontSize: 56, lineHeight: 64, fontWeight: '700', width: 140, textAlign: 'center', fontVariant: ['tabular-nums'], padding: 0 },
  chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  num: { alignSelf: 'stretch', borderRadius: 4, paddingVertical: 8, fontSize: 16, fontWeight: '600', textAlign: 'center', fontVariant: ['tabular-nums'] },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 8, borderWidth: 2, padding: 10, paddingRight: 16 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#09090b' },
  statIn: { textAlign: 'center', fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  preview: { marginTop: 16, borderRadius: 6, padding: 12 },
  kcal: { fontSize: 56, lineHeight: 64, fontWeight: '700', color: Lime, fontVariant: ['tabular-nums'] },
  macro: { fontSize: 22, lineHeight: 28, fontWeight: '700', fontVariant: ['tabular-nums'] },
  levelUp: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, backgroundColor: 'rgba(132,204,22,0.15)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  bottom: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  piece: { position: 'absolute', top: 0, borderRadius: 2 },
});
