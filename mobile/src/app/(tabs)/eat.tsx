// Eat: today's calories and macros against the lean-bulk target, snap a meal for an AI estimate (website /api/meal,
// Gemini), today's log, and the APU cafeteria menu by stall. Same data as the website's /eat.
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, LinearTransition, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { foods, highProtein, slug, stalls } from '@shared/data';
import { goals, nutrition } from '@shared/nutrition';
import { EatProgress } from '@/components/eat-progress';
import { ThemedText } from '@/components/themed-text';
import { Button, Press } from '@/components/ui/button';
import { H2, Icon, Title } from '@/components/ui/kit';
import WorkoutPill from '@/components/workout-pill';
import { ChevronRight, Plus, Search, Sparkles, Trash2 } from 'lucide-react-native';
import { BottomTabInset, Lime, Red, Spring } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/lib/store';
import { img } from '@/lib/web';
import { Input } from '@/components/ui/input';

type Food = { name: string; kcal: number; p: number; c: number; f: number };
const ALL = 'All', HP = 'High protein';
const WEB = process.env.EXPO_PUBLIC_WEB_URL?.replace(/\/$/, '');
const layout = LinearTransition.springify().dampingRatio(Spring.dampingRatio).duration(Spring.duration);
const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
const openFood = (name: string) => router.push({ pathname: '/food/[id]', params: { id: slug(name) } });

function Thumb({ name, size = 48 }: { name: string; size?: number }) {
  const src = foods.some((f) => f.name === name) ? img(`/food/${slug(name)}.webp`) : undefined;
  return src ? <Image source={src} style={{ width: size, height: size, borderRadius: 5, backgroundColor: '#18181b' }} />
    : <View style={{ width: size, height: size, borderRadius: 5, backgroundColor: '#18181b', alignItems: 'center', justifyContent: 'center' }}><ThemedText style={{ color: Lime, fontSize: size / 2.6 }}>✦</ThemedText></View>;
}

function Bar({ pct, color, height, delay = 0 }: { pct: number; color: string; height: number; delay?: number }) {
  const w = useSharedValue(0);
  useEffect(() => { w.set(withDelay(delay, withTiming(Math.min(100, pct), { duration: 700, easing: easeInOut }))); }, [pct, delay, w]);
  const anim = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return <Animated.View style={[{ height, borderRadius: 2, backgroundColor: color }, anim]} />;
}

export default function Eat() {
  const { s, me, addFood, removeFood } = useStore();
  const [view, setView] = useState<'today' | 'progress'>('today');
  const theme = useTheme();
  const [q, setQ] = useState('');
  const [pick, setPick] = useState<string>(ALL);
  const [busy, setBusy] = useState(false);
  const [guess, setGuess] = useState<(Food & { ai: boolean }) | null>(null);

  const today = new Date().toDateString();
  const log = s.food.filter((f) => new Date(f.at).toDateString() === today);
  const sum = log.reduce((t, f) => ({ kcal: t.kcal + f.kcal, p: t.p + f.p, c: t.c + f.c, f: t.f + f.f }), { kcal: 0, p: 0, c: 0, f: 0 });
  const n = nutrition(me, s.food, s.weights);
  const targets = n.targets;
  const left = targets.kcal - Math.round(sum.kcal);
  const add = ({ name, kcal, p, c, f }: Food) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); return addFood({ name, kcal, p, c, f }); };

  // Photo → the website's /api/meal (Gemini). No website / no key → a demo guess so the flow still works.
  async function snap() {
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6 };
    let res: ImagePicker.ImagePickerResult;
    if (Platform.OS === 'web') res = await ImagePicker.launchImageLibraryAsync(opts);
    else {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      res = perm.granted ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    }
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    setBusy(true); setGuess(null);
    let ai: Food | null = null;
    if (WEB) {
      const body = new FormData();
      if (a.file) body.append('photo', a.file);
      else body.append('photo', { uri: a.uri, name: 'meal.jpg', type: a.mimeType ?? 'image/jpeg' } as unknown as Blob); // React Native file part
      const r = await fetch(`${WEB}/api/meal`, { method: 'POST', body }).catch(() => null);
      ai = r?.ok ? await r.json() : null;
    }
    if (!ai) await new Promise((ok) => setTimeout(ok, 900));
    setGuess(ai ? { ...ai, ai: true } : { ...foods[Math.floor(Math.random() * foods.length)], ai: false });
    setBusy(false);
  }

  const macros = [
    { k: 'p', label: 'Protein', color: '#0ea5e9', icon: 'protein' },
    { k: 'c', label: 'Carbs', color: '#f59e0b', icon: 'carbs' },
    { k: 'f', label: 'Fat', color: '#ec4899', icon: 'fat' },
  ] as const;
  const card = { marginHorizontal: -16, paddingHorizontal: 16, borderRadius: 0, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }; // flat sections, like the website's .card
  const icon = (n: string) => img(`/icons/${n}.webp`);
  const menu = foods.filter((f) => (pick === ALL || (pick === HP ? highProtein(f) : f.stall === pick)) && `${f.name} ${f.stall}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={[styles.page, { paddingBottom: BottomTabInset + 40 }]} keyboardShouldPersistTaps="handled">
        <Title icon="eat" sub={
          <Pressable onPress={() => router.push('/plan')} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ThemedText type="small" themeColor="textSecondary">{goals[n.goal].label} · {targets.kcal} kcal target</ThemedText><ChevronRight size={14} color={theme.textSecondary} />
          </Pressable>
        }>Eat</Title>

        <View style={[styles.seg, { backgroundColor: theme.backgroundElement }]} accessibilityRole="tablist">
          {(['today', 'progress'] as const).map((v) => (
            <Pressable key={v} onPress={() => setView(v)} accessibilityRole="tab" accessibilityState={{ selected: view === v }}
              style={[styles.segBtn, view === v && { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="smallBold" themeColor={view === v ? 'text' : 'textSecondary'}>{v === 'today' ? 'Today' : 'Progress'}</ThemedText>
            </Pressable>
          ))}
        </View>

        {view === 'progress' ? <EatProgress /> : <>

        <View style={[styles.card, card]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {icon('target') && <Image source={icon('target')} style={{ width: 42, height: 42 }} />}
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.big}>{Math.abs(left)}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">{left >= 0 ? 'kcal left today' : 'kcal over target'}</ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={{ alignSelf: 'flex-start', fontVariant: ['tabular-nums'] }}>{Math.round(sum.kcal)} / {targets.kcal}</ThemedText>
          </View>
          <View style={[styles.track, { height: 8, backgroundColor: theme.backgroundSelected }]}><Bar pct={(sum.kcal / targets.kcal) * 100} color={left >= 0 ? Lime : Red} height={8} /></View>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
            {macros.map((m, i) => (
              <View key={m.k} style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Icon name={m.icon} size={16} /><ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>{m.label}</ThemedText></View>
                <ThemedText type="smallBold" style={{ fontVariant: ['tabular-nums'] }}>{Math.round(sum[m.k])}<ThemedText type="small" themeColor="textSecondary">/{targets[m.k]}g</ThemedText></ThemedText>
                <View style={[styles.track, { height: 6, backgroundColor: theme.backgroundSelected }]}><Bar pct={(sum[m.k] / targets[m.k]) * 100} color={m.color} height={6} delay={(i + 1) * 60} /></View>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.card, card]}>
          <Press onPress={snap} disabled={busy} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={styles.camera}>{busy ? <Sparkles size={22} color="#a3e635" /> : <Icon name="camera" size={36} />}</View>
            <View style={{ flex: 1 }}>
              <ThemedText type="smallBold" style={{ fontSize: 16 }}>{busy ? 'Estimating macros…' : 'Snap your meal'}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">AI estimates calories and macros from a photo</ThemedText>
            </View>
          </Press>
          {guess && (
            <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(150)} style={[styles.guess, { backgroundColor: theme.backgroundSelected }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Thumb name={guess.name} size={54} />
                <View style={{ flex: 1 }}>
                  <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>{guess.ai ? 'Gemini estimate · check before adding' : 'Looks like (demo estimate)'}</ThemedText>
                  <ThemedText type="smallBold">{guess.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={{ fontVariant: ['tabular-nums'] }}>{guess.kcal} kcal · P {guess.p} · C {guess.c} · F {guess.f}</ThemedText>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <Button onPress={() => { add(guess); setGuess(null); }} style={{ flex: 1, paddingVertical: 10 }}>Add to log</Button>
                <Button variant="ghost" onPress={() => setGuess(null)} style={{ paddingVertical: 10 }}>Not it</Button>
              </View>
            </Animated.View>
          )}
        </View>

        {log.length > 0 && (
          <View style={{ gap: 8 }}>
            <H2 icon="plate">Today</H2>
            <View style={[styles.card, card, { paddingVertical: 4 }]}>
              {log.map((f) => (
                <Animated.View key={f.id} entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} layout={layout} style={styles.logRow}>
                  <Thumb name={f.name} size={40} />
                  <View style={{ flex: 1 }}>
                    <ThemedText type="smallBold" numberOfLines={1}>{f.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12, fontVariant: ['tabular-nums'] }}>{f.kcal} kcal · P {f.p} · C {f.c} · F {f.f}</ThemedText>
                  </View>
                  <Press onPress={() => removeFood(f.id)} accessibilityLabel={`Remove ${f.name}`} style={{ padding: 6 }}>
                    <Trash2 size={16} color={theme.textSecondary} />
                  </Press>
                </Animated.View>
              ))}
            </View>
          </View>
        )}

        <ThemedText type="smallBold" style={{ fontSize: 16 }}>APU cafeteria</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: -8, fontSize: 12 }}>Typical portions, estimated. Tap + to log.</ThemedText>
        <View style={{ justifyContent: 'center' }}>
          <Input value={q} onChangeText={setQ} placeholder="Search food…" placeholderTextColor={theme.textSecondary}
            style={[styles.search, { backgroundColor: theme.backgroundElement, color: theme.text }]} />
          <Search size={16} color={theme.textSecondary} style={{ position: 'absolute', left: 11 }} pointerEvents="none" />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }} style={{ marginHorizontal: -16, flexGrow: 0 }}>
          {[ALL, HP, ...stalls].map((x) => {
            const on = pick === x, src = x === ALL ? icon('all') : x === HP ? icon('high-protein') : img(`/stalls/${slug(x)}.webp`);
            return (
              <Pressable key={x} onPress={() => setPick(x)} style={{ width: 60, alignItems: 'center', gap: 4 }}>
                <View style={[styles.stall, { borderColor: on ? Lime : 'transparent' }]}>{src && <Image source={src} style={x === ALL || x === HP ? { width: 40, height: 40 } : { width: '100%', height: '100%' }} contentFit="cover" />}</View>
                <ThemedText type="small" style={{ fontSize: 11, lineHeight: 13, textAlign: 'center', fontWeight: on ? '700' : '500', color: on ? theme.text : theme.textSecondary }}>{x}</ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
        {menu.map((f) => (
          <Animated.View key={f.stall + f.name} layout={layout}>
          {/* the whole card opens the dish; the + inside adds it without opening */}
          <Pressable onPress={() => openFood(f.name)} accessibilityRole="link" accessibilityLabel={f.name}
            style={({ pressed }) => [styles.card, card, styles.dish, pressed && { backgroundColor: theme.backgroundElement }]}>
            <Thumb name={f.name} size={84} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <ThemedText type="smallBold" style={{ fontSize: 15 }}>{f.name}</ThemedText>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                    {pick !== f.stall && <ThemedText style={[styles.tag, { backgroundColor: theme.backgroundSelected, color: theme.textSecondary }]}>{f.stall.toUpperCase()}</ThemedText>}
                    {highProtein(f) && <ThemedText style={[styles.tag, { backgroundColor: 'rgba(132,204,22,0.15)', color: Lime }]}>HIGH PROTEIN</ThemedText>}
                  </View>
                </View>
                <Press onPress={() => add(f)} haptic={false} scaleTo={0.9} accessibilityLabel={`Add ${f.name}`} style={styles.plus}>
                  <Plus size={20} strokeWidth={2.5} color="#09090b" />
                </Press>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 2 }}>
                {([['kcal', f.kcal, '', 'kcal'], ['prot', f.p, 'g', 'protein'], ['carb', f.c, 'g', 'carbs'], ['fat', f.f, 'g', 'fat']] as const).map(([k, v, unit, ic]) => (
                  <View key={k} style={styles.macro}>
                    <Icon name={ic} size={14} />
                    <ThemedText type="smallBold" style={{ fontSize: 12, lineHeight: 16, fontVariant: ['tabular-nums'] }}>{v}{unit}</ThemedText>
                    <ThemedText themeColor="textSecondary" style={{ fontSize: 11, lineHeight: 16 }}>{k}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
          </Pressable>
          </Animated.View>
        ))}
        </>}
      </ScrollView>
      <WorkoutPill />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  seg: { flexDirection: 'row', padding: 2, borderRadius: 4, marginTop: 12 },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 3 },
  page: { padding: 16, gap: 14 },
  h1: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.6 },
  card: { borderRadius: 6, padding: 16 },
  big: { fontSize: 30, lineHeight: 34, fontWeight: '700', fontVariant: ['tabular-nums'] },
  track: { borderRadius: 2, overflow: 'hidden', marginTop: 6 },
  camera: { width: 45, height: 45, borderRadius: 5, backgroundColor: '#27272a', alignItems: 'center', justifyContent: 'center' },
  guess: { borderRadius: 5, padding: 12, marginTop: 12 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  search: { borderRadius: 5, paddingLeft: 36, paddingRight: 12, paddingVertical: 11, fontSize: 16 },
  stall: { width: 53, height: 53, borderRadius: 6, overflow: 'hidden', borderWidth: 2, backgroundColor: '#18181b', alignItems: 'center', justifyContent: 'center' },
  dish: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
  tag: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 2, overflow: 'hidden' },
  plus: { width: 34, height: 34, borderRadius: 5, backgroundColor: Lime, alignItems: 'center', justifyContent: 'center' },
  macro: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 3 },
});
