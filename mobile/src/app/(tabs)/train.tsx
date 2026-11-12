// Train (the website's /train): routines, then the live workout — sets with types, supersets, timed holds, 1RM, records with
// the fanfare, rest timer, hold a name to drag-reorder (springs), the 3D muscle body, and Finish to save and post.
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { BookmarkCheck, BookmarkPlus, Check, Clock, GripVertical, Hash, Link2, MapPin, Play, Plus, Square, Timer, X } from 'lucide-react-native';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Alert, Dimensions, Modal, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeInDown, FadeOut, FadeOutDown, LinearTransition, useAnimatedStyle, useSharedValue, withSpring, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { equipment, exercises, setTypes, templates, timeAgo, timedByDefault, type Exercise, type ExerciseLog, type SetType } from '@shared/data';
import { baseOf, bests, countsPR, e1rm, hhmmss, mmss, parseResult, setLabels } from '@shared/lifting';
import { bodyFor, isLoadedBodyweight } from '@shared/strength';
import ExercisePicker from '@/components/exercise-picker';
import MuscleModel from '@/components/muscle-model';
import MusclesSheet, { musclesHit } from '@/components/muscles-sheet';
import { ExerciseThumb } from '@/components/post-card';
import SetTypeSheet from '@/components/set-type-sheet';
import { ThemedText } from '@/components/themed-text';
import { Button, Press } from '@/components/ui/button';
import { EmptyState, Icon, Section, Title } from '@/components/ui/kit';
import { BottomTabInset, Lime, Red, Spring, SpringBounce } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/lib/store';
import { setTypeColor, supersetHex } from '@/lib/tw';
import { art } from '@/lib/art';
import { Input } from '@/components/ui/input';

const REST_KEY = 'spotter:rest', REST_ON_KEY = 'spotter:rest-on'; // same keys as the website
const store = typeof localStorage !== 'undefined' ? localStorage : undefined;
const CH = 64, STEP = CH + 12; // collapsed card height and slot step while reordering
const layout = LinearTransition.springify().dampingRatio(Spring.dampingRatio).duration(Spring.duration);
let prSound: AudioPlayer | undefined; // record fanfare (second clip of Success Sound Effects)

function ask(title: string, msg: string, yes: string, onYes: () => void) {
  if (Platform.OS === 'web') { if (confirm(`${title} ${msg}`)) onYes(); return; }
  Alert.alert(title, msg, [{ text: 'Cancel', style: 'cancel' }, { text: yes, style: 'destructive', onPress: onYes }]);
}

export default function Train() {
  const { s } = useStore();
  const theme = useTheme();
  return <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>{s.active ? <Workout /> : <Routines />}</SafeAreaView>;
}

// ---------- routines (nothing in progress) ----------
function Routines() {
  const { s, setActive } = useStore();
  const theme = useTheme();
  const lib = new Map(s.library.map((e) => [e.name, e]));
  const start = (r: { name: string; exercises: ExerciseLog[] } | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const ex = r ? structuredClone(r.exercises).map((e) => ({ ...e, sets: e.sets.map(({ kg, reps, type, secs }) => ({ kg, reps, ...(type ? { type } : {}), ...(secs !== undefined ? { secs } : {}) })) })) : [];
    setActive(() => ({ title: r?.name ?? 'Workout', startedAt: new Date().toISOString(), exercises: ex }));
  };
  const Card = ({ name, list, onStart, onEdit, i }: { name: string; list: ExerciseLog[]; onStart: () => void; onEdit: () => void; i: number }) => (
    <Animated.View entering={FadeInDown.delay(i * 40).springify().dampingRatio(1).duration(350)}>
      <Section>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <ThemedText type="smallBold" style={{ fontSize: 16 }}>{name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>{list.map((e) => e.name).join(', ') || 'No exercises'}</ThemedText>
          </View>
          <Pressable onPress={onEdit} hitSlop={8}><ThemedText type="smallBold" themeColor="textSecondary">Edit</ThemedText></Pressable>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <View style={{ flexDirection: 'row' }}>{list.slice(0, 4).map((e, k) => <View key={e.name} style={{ marginLeft: k ? -8 : 0 }}><ExerciseThumb ex={lib.get(e.name)} size={34} /></View>)}</View>
          {list.length > 4 && <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>+{list.length - 4}</ThemedText>}
          <Button onPress={onStart} disabled={!list.length} style={{ marginLeft: 'auto', paddingVertical: 9 }}>Start routine</Button>
        </View>
      </Section>
    </Animated.View>
  );
  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: BottomTabInset + 40, gap: 16 }}>
      <Title icon="train">Train</Title>
      <View style={{ gap: 8 }}>
        <ThemedText type="smallBold" style={{ fontSize: 16 }}>Quick start</ThemedText>
        <Press onPress={() => start(null)} style={styles.bigBtn}><Plus size={18} color="#09090b" /><ThemedText type="smallBold" style={{ color: '#09090b', fontSize: 16 }}>Start empty workout</ThemedText></Press>
      </View>
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ThemedText type="smallBold" style={{ fontSize: 16, flex: 1 }}>My routines <ThemedText type="small" themeColor="textSecondary">({s.routines.length})</ThemedText></ThemedText>
          <Press onPress={() => router.push('/routine')} style={[styles.ghostSm, { backgroundColor: theme.backgroundElement }]}><Plus size={16} color={theme.text} /><ThemedText type="smallBold" style={{ fontSize: 13 }}>New routine</ThemedText></Press>
        </View>
        {s.routines.length === 0 && <EmptyState art="routines" size={104} title="No routines yet" text="Build one with New routine, or copy an example below." />}
        {s.routines.map((r, i) => <Card key={r.id} i={i} name={r.name} list={r.exercises} onStart={() => start(r)} onEdit={() => router.push({ pathname: '/routine', params: { id: r.id } })} />)}
      </View>
      <View>
        <ThemedText type="smallBold" style={{ fontSize: 16 }}>Example routines</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>Tap Edit to copy one into your routines and change it.</ThemedText>
        {templates.map((t, i) => <Card key={t.name} i={i} name={`${t.name} day`} list={t.exercises} onStart={() => start({ name: `${t.name} day`, exercises: t.exercises })} onEdit={() => router.push({ pathname: '/routine', params: { from: t.name } })} />)}
      </View>
      {s.sessions.length > 0 && (
        <View>
          <ThemedText type="smallBold" style={{ fontSize: 16 }}>History</ThemedText>
          {s.sessions.slice(0, 30).map((x) => (
            <Section key={x.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 }}>
              <ThemedText type="smallBold">{x.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">{x.exercises.length} exercises · {timeAgo(x.at)}</ThemedText>
            </Section>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// ---------- the live workout ----------
function Workout() {
  const { s, me, setActive, saveRoutine } = useStore();
  const theme = useTheme();
  const a = s.active!;
  const lib = new Map(s.library.map((e) => [e.name, e]));
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(id); }, []);

  const [restSecs, setRestSecs] = useState(() => Number(store?.getItem(REST_KEY)) || 90);
  const [restOn, setRestOn] = useState(() => store?.getItem(REST_ON_KEY) !== '0');
  const [restEnd, setRestEnd] = useState<number | null>(null);
  useEffect(() => { // rest's over: buzz and clear the bar
    if (!restEnd) return;
    const t = setTimeout(() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); setRestEnd(null); }, Math.max(0, restEnd - Date.now()));
    return () => clearTimeout(t);
  }, [restEnd]);
  const [hold, setHold] = useState<{ i: number; j: number; start: number; target: number } | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [timers, setTimers] = useState(false);
  const [showHit, setShowHit] = useState(false);
  const [picking, setPicking] = useState(false);
  const [typing, setTyping] = useState<{ i: number; j: number } | null>(null);
  const [saved, setSaved] = useState(false);

  const body = bodyFor(s.library, Number(me.bw));
  const prev = bests(baseOf(me), s.sessions, body);
  const setMax = (name: string, st: { kg: number; reps: number }) => { const b = body(name); return st.reps > 0 && st.kg + b > 0 ? e1rm(st.kg + b, st.reps) - b : 0; };
  const isTimed = (e: ExerciseLog) => e.timed ?? timedByDefault(lib.get(e.name)?.id);
  const edit = (fn: (ex: ExerciseLog[]) => void) => setActive((x) => { if (!x) return x; const ex = structuredClone(x.exercises); fn(ex); return { ...x, exercises: ex }; });

  function restAfter(i: number) {
    if (!restOn) return;
    const g = a.exercises[i].superset; // in a superset, go straight to the next exercise; rest only after the last one
    if (g !== undefined && a.exercises[i + 1]?.superset === g) return;
    setRestEnd(Date.now() + restSecs * 1000); // eslint-disable-line react-hooks/purity -- runs on tap only
  }
  function changeRest(by: number) {
    const next = Math.max(15, Math.min(600, restSecs + by));
    setRestSecs(next);
    try { store?.setItem(REST_KEY, String(next)); } catch {}
    setRestEnd((e) => (e ? e + by * 1000 : e));
  }
  function toggleRest(on: boolean) {
    setRestOn(on);
    if (!on) setRestEnd(null);
    try { store?.setItem(REST_ON_KEY, on ? '1' : '0'); } catch {}
  }
  function stopHold(h = hold, secs?: number) {
    if (!h) return;
    clearTimeout(holdTimer.current);
    const done = secs ?? Math.round((Date.now() - h.start) / 1000); // eslint-disable-line react-hooks/purity -- runs on tap only
    edit((x) => { const st = x[h.i]?.sets[h.j]; if (st) { st.secs = done; st.done = true; } });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    restAfter(h.i);
    setHold(null);
  }
  function startHold(i: number, j: number) { // counts down from the target (or up if there's none); stop ends early
    const h = { i, j, start: Date.now(), target: a.exercises[i].sets[j].secs ?? 0 }; // eslint-disable-line react-hooks/purity -- runs on tap only
    setHold(h); setRestEnd(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (h.target > 0) holdTimer.current = setTimeout(() => stopHold(h, h.target), h.target * 1000);
  }
  function toggle(i: number, j: number) {
    const ex = a.exercises[i], st = ex.sets[j];
    if (!st.done && !isTimed(ex) && countsPR(st.type)) {
      const today = ex.sets.filter((x, k) => k !== j && x.done && countsPR(x.type)).map((x) => setMax(ex.name, x));
      if (setMax(ex.name, st) > Math.max(prev[ex.name] ?? 0, ...today)) { // new record: fanfare + success buzz
        try { prSound ??= createAudioPlayer(art['/sounds/record.mp3']); prSound.seekTo(0); prSound.play(); } catch {}
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } else Haptics.selectionAsync().catch(() => {});
    edit((x) => { x[i].sets[j].done = !x[i].sets[j].done; });
    if (!st.done) restAfter(i);
  }
  function addExercise(e: Exercise) {
    const bw = ['bodyweight', 'cardio', 'other'].includes(e.equipment), timed = timedByDefault(e.id);
    edit((x) => { x.push({ name: e.name, ...(timed ? { timed } : {}), sets: [timed ? { kg: 0, reps: 0, secs: 30 } : { kg: bw ? 0 : 20, reps: 10 }] }); });
    setPicking(false);
  }
  function superset(i: number) { // link exercise i with the next one, or unlink it
    edit((x) => {
      if (x[i].superset !== undefined) {
        const g = x[i].superset; delete x[i].superset;
        const left = x.filter((e) => e.superset === g);
        if (left.length < 2) left.forEach((e) => delete e.superset);
        return;
      }
      if (!x[i + 1]) return;
      const g = x[i + 1].superset ?? Date.now();
      x[i].superset = g; x[i + 1].superset = g;
    });
  }
  async function saveAsRoutine() {
    const doSave = async (name?: string) => {
      if (!name?.trim()) return;
      await saveRoutine({ name, exercises: a.exercises.map((e) => ({ ...e, sets: e.sets.map(({ kg, reps, type, secs }) => ({ kg, reps, ...(type ? { type } : {}), ...(secs !== undefined ? { secs } : {}) })) })) });
      setSaved(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    };
    const def = a.title === 'Workout' ? '' : a.title;
    if (Platform.OS === 'ios') Alert.prompt('Save as routine', 'Name it', (n) => doSave(n), 'plain-text', def);
    else if (Platform.OS === 'web') doSave(prompt('Save as routine. Name:', def) ?? undefined);
    else doSave(def || 'My routine');
  }

  // ---- hold a name to reorder: cards collapse, the held one follows the finger, neighbours glide (springs) ----
  const [drag, setDrag] = useState<{ i: number } | null>(null);
  const dragRef = useRef<{ i: number; listTop: number } | null>(null);
  const lift = useSharedValue(0);
  const listRef = useRef<ComponentRef<typeof View>>(null), scrollRef = useRef<ComponentRef<typeof ScrollView>>(null), scrollY = useRef(0), fingerAt = useRef(0);
  const sorting = drag !== null;
  const slotCenter = (k: number) => dragRef.current!.listTop + k * STEP + CH / 2;
  function beginSort(i: number, y: number) {
    fingerAt.current = y;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    listRef.current?.measureInWindow((_x, top) => {
      dragRef.current = { i, listTop: top };
      setDrag({ i });
      // after the cards collapse, scroll so the held row lands under the finger
      requestAnimationFrame(() => {
        const delta = slotCenter(i) - y;
        scrollRef.current?.scrollTo({ y: Math.max(0, scrollY.current + delta), animated: false });
        const moved = Math.max(0, scrollY.current + delta) - scrollY.current;
        dragRef.current!.listTop -= moved;
        lift.set(y - slotCenter(i));
      });
    });
  }
  function moveSort(y: number) {
    const d = dragRef.current;
    if (!d) return;
    fingerAt.current = y;
    let i = d.i;
    if (i < a.exercises.length - 1 && y > slotCenter(i) + STEP / 2 + 4) { const from = i; edit((x) => { const [m] = x.splice(from, 1); x.splice(from + 1, 0, m); }); i++; }
    else if (i > 0 && y < slotCenter(i) - STEP / 2 - 4) { const from = i; edit((x) => { const [m] = x.splice(from, 1); x.splice(from - 1, 0, m); }); i--; }
    if (i !== d.i) { d.i = i; setDrag({ i }); Haptics.selectionAsync().catch(() => {}); }
    lift.set(y - slotCenter(i));
  }
  function endSort() {
    if (!dragRef.current) return;
    lift.set(withSpring(0, SpringBounce)); // drop into the slot with a slight bounce (it was moving)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setTimeout(() => { dragRef.current = null; setDrag(null); }, 380);
  }
  const held = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }, { scale: 1.03 }] }));

  const elapsed = Math.max(0, Math.floor((now - new Date(a.startedAt).getTime()) / 1000));
  const rest = restEnd ? Math.max(0, Math.ceil((restEnd - now) / 1000)) : 0;
  const heldSecs = hold ? Math.floor((now - hold.start) / 1000) : 0;
  const groups = [...new Set(a.exercises.map((e) => e.superset).filter((g) => g !== undefined))];
  const letter = (g?: number) => (g === undefined ? '' : String.fromCharCode(65 + groups.indexOf(g)));
  const { hit, areas, ranked } = musclesHit(a.exercises, s.library);
  const typingSet = typing && a.exercises[typing.i]?.sets[typing.j];
  const discard = () => ask('Discard this workout?', 'Your sets won’t be saved.', 'Discard', () => setActive(() => null));

  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={scrollRef} scrollEnabled={!sorting} onScroll={(e) => { scrollY.current = e.nativeEvent.contentOffset.y; }} scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: BottomTabInset + 120 }} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable onPress={() => setTimers(true)} style={{ flex: 1 }} accessibilityLabel={`Workout time ${hhmmss(elapsed)}. Change timers`}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Clock size={24} color={Lime} /><ThemedText style={styles.timer}>{hhmmss(elapsed)}</ThemedText></View>
            <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>Rest {restOn ? mmss(restSecs) : 'off'}</ThemedText>
          </Pressable>
          <Press onPress={() => setShowHit(true)} accessibilityLabel="Muscles hit" scaleTo={0.95} style={{ width: 80, height: 64 }}>
            <MuscleModel hit={hit} compact />
          </Press>
          {a.exercises.length > 0 && (
            <Press onPress={saveAsRoutine} disabled={saved} style={[styles.iconBtn, { backgroundColor: theme.backgroundElement }]} accessibilityLabel={saved ? 'Saved as routine' : 'Save as routine'}>
              {saved ? <BookmarkCheck size={20} color={Lime} /> : <BookmarkPlus size={20} color={Lime} />}
            </Press>
          )}
          <Button onPress={() => router.push('/finish')} disabled={!ranked.length} style={{ paddingVertical: 9, paddingHorizontal: 16 }}>Finish</Button>
        </View>

        {a.exercises.length === 0 && <EmptyState art="exercises" title="Empty workout" text="Add your first exercise to start logging sets." />}
        <View ref={listRef} collapsable={false} style={{ gap: sorting ? 12 : 0 }}>
          {a.exercises.map((ex, i) => {
            const item = lib.get(ex.name);
            const eq = equipment.find((e) => e.id === exercises[ex.name]?.equip);
            const best = prev[ex.name];
            const labels = setLabels(ex.sets, setTypes);
            const timed = isTimed(ex), added = isLoadedBodyweight(item?.id);
            const sc = ex.superset !== undefined ? supersetHex(groups.indexOf(ex.superset)) : undefined;
            const dragging = drag?.i === i;
            const top1rm = Math.max(best ?? 0, ...ex.sets.filter((st) => st.done && countsPR(st.type)).map((st) => setMax(ex.name, st)));
            return (
              <Animated.View key={ex.name} layout={dragging ? undefined : layout}
                style={[sorting ? [styles.collapsed, { backgroundColor: theme.backgroundElement }] : [styles.card, { borderBottomColor: theme.border }],
                  sc ? { borderLeftWidth: 4, borderLeftColor: sc } : null, dragging && [styles.held, held]]}>
                {sc && !sorting && <ThemedText style={[styles.ssTag, { backgroundColor: sc }]}>SUPERSET {letter(ex.superset)}</ThemedText>}
                {/* the whole head opens the exercise; holding it reorders instead (onLongPress swallows the release) */}
                <Pressable disabled={!item || sorting} onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: item!.id } })}
                  onLongPress={() => {}} delayLongPress={400} style={({ pressed }) => ({ flexDirection: 'row', alignItems: sorting ? 'center' : 'flex-start', gap: 12, opacity: pressed ? 0.6 : 1 })}>
                  {sorting && <GripVertical size={18} color={theme.textSecondary} />}
                  <ExerciseThumb ex={item} size={sorting ? 36 : 48} />
                  <View style={{ flex: 1 }}>
                    <HoldToSort onStart={(y) => beginSort(i, y)} onMove={moveSort} onEnd={endSort}>
                      <ThemedText type="smallBold" style={{ fontSize: 16 }} numberOfLines={sorting ? 1 : undefined}>{ex.name}</ThemedText>
                    </HoldToSort>
                    {!sorting && !timed && top1rm > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Icon name="medal" size={14} /><ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>1RM </ThemedText>
                        <ThemedText type="smallBold" style={{ fontSize: 12 }}>{added ? '+' : ''}{Math.round(top1rm * 10) / 10} kg</ThemedText>
                      </View>
                    )}
                    {!sorting && (a.exercises[i + 1] || ex.superset !== undefined) && (
                      <Pressable onPress={() => superset(i)} style={styles.smallAction}>
                        <Link2 size={13} color={sc ?? theme.textSecondary} />
                        <ThemedText type="smallBold" style={{ fontSize: 12, color: sc ?? theme.textSecondary }}>{ex.superset !== undefined ? 'Unlink superset' : 'Superset'}</ThemedText>
                      </Pressable>
                    )}
                    {!sorting && (ex.timed || timedByDefault(item?.id)) && (
                      <Pressable onPress={() => edit((x) => { const on = !isTimed(x[i]); x[i].timed = on; if (on) x[i].sets.forEach((st) => { st.secs ??= 30; }); })} style={styles.smallAction}>
                        {timed ? <Hash size={13} color={theme.textSecondary} /> : <Clock size={13} color={theme.textSecondary} />}
                        <ThemedText type="smallBold" themeColor="textSecondary" style={{ fontSize: 12 }}>{timed ? 'Log reps instead' : 'Log time instead'}</ThemedText>
                      </Pressable>
                    )}
                  </View>
                  {sorting && <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>{ex.sets.length} {ex.sets.length === 1 ? 'set' : 'sets'}</ThemedText>}
                  {eq && !sorting && (
                    <Pressable onPress={() => router.push({ pathname: '/map', params: { e: eq.id } })} style={[styles.eq, { backgroundColor: theme.backgroundElement }]}>
                      <MapPin size={12} color={theme.text} /><ThemedText type="small" style={{ fontSize: 12 }} numberOfLines={1}>{eq.name}</ThemedText>
                    </Pressable>
                  )}
                </Pressable>
                {!sorting && (
                  <Animated.View entering={FadeIn.duration(250)}>
                    <View style={[styles.row, { marginTop: 12 }]}>
                      <ThemedText style={[styles.colHead, styles.cSet]}>Set</ThemedText>
                      <ThemedText style={[styles.colHead, styles.cNum]}>kg</ThemedText>
                      <ThemedText style={[styles.colHead, styles.cNum]}>{timed ? 'Time' : 'Reps'}</ThemedText>
                      <ThemedText style={[styles.colHead, timed ? styles.cPlay : styles.cOrm]}>{timed ? '' : '1RM'}</ThemedText>
                      <View style={styles.cTick} /><View style={styles.cX} />
                    </View>
                    {ex.sets.map((st, j) => {
                      const max = countsPR(st.type) ? setMax(ex.name, st) : 0;
                      const pr = st.done && max > (best ?? 0);
                      const running = hold?.i === i && hold?.j === j;
                      const numBg = st.done ? 'transparent' : theme.backgroundSelected;
                      return (
                        <Animated.View key={j} entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} layout={layout}
                          style={[styles.row, styles.setRow, st.done && (pr ? styles.prRow : styles.doneRow)]}>
                          <Pressable onPress={() => setTyping({ i, j })} style={[styles.cSet, { flexDirection: 'row', alignItems: 'center', gap: 2, height: 36 }]} accessibilityLabel={`Set ${labels[j]}: ${st.type ? setTypes[st.type].label : 'normal'}. Change set type`}>
                            <ThemedText type="smallBold" style={{ color: setTypeColor(st.type) ?? theme.text }}>{labels[j]}</ThemedText>
                            {pr && <Animated.View entering={ZoomIn.springify().dampingRatio(0.8)}><Icon name="trophy" size={16} /></Animated.View>}
                          </Pressable>
                          <Input value={st.kg ? String(st.kg) : ''} placeholder="0" placeholderTextColor={theme.textSecondary} keyboardType="decimal-pad" selectTextOnFocus
                            onChangeText={(v) => edit((x) => { x[i].sets[j].kg = Math.max(0, Number(v.replace(',', '.')) || 0); })}
                            style={[styles.cNum, styles.num, { color: theme.text, backgroundColor: numBg }]} />
                          {timed ? (
                            <>
                              {running
                                ? <ThemedText style={[styles.cNum, styles.num, { color: Lime, borderWidth: 2, borderColor: Lime, textAlignVertical: 'center', paddingVertical: 6 }]}>{mmss(hold.target ? Math.max(0, hold.target - heldSecs) : heldSecs)}</ThemedText>
                                : <Input key={`${j}-${st.secs}`} defaultValue={mmss(st.secs ?? 0)} selectTextOnFocus
                                    onEndEditing={(e) => { const v = parseResult(e.nativeEvent.text, 'time'); edit((x) => { x[i].sets[j].secs = v ?? 0; }); }}
                                    style={[styles.cNum, styles.num, { color: theme.text, backgroundColor: numBg }]} />}
                              <Press onPress={() => (running ? stopHold() : startHold(i, j))} disabled={!!hold && !running} haptic={false} scaleTo={0.88}
                                style={[styles.cPlay, styles.tick, { backgroundColor: running ? Lime : theme.backgroundSelected, opacity: hold && !running ? 0.3 : 1 }]}
                                accessibilityLabel={running ? 'Stop timer' : `Start ${mmss(st.secs ?? 0)} timer`}>
                                {running ? <Square size={14} color="#09090b" fill="#09090b" /> : <Play size={15} color={Lime} fill={Lime} />}
                              </Press>
                            </>
                          ) : (
                            <>
                              <Input value={String(st.reps)} keyboardType="number-pad" selectTextOnFocus
                                onChangeText={(v) => edit((x) => { x[i].sets[j].reps = Number(v.replace(/\D/g, '')) || 0; })}
                                style={[styles.cNum, styles.num, { color: theme.text, backgroundColor: numBg }]} />
                              <ThemedText style={[styles.cOrm, { fontSize: 12, fontWeight: '700', color: st.done ? theme.text : '#52525b', fontVariant: ['tabular-nums'] }]}>{max > 0 ? `${added ? '+' : ''}${Math.round(max)}` : '–'}</ThemedText>
                            </>
                          )}
                          <Press onPress={() => toggle(i, j)} haptic={false} scaleTo={0.88} accessibilityLabel={st.done ? 'Mark set not done' : 'Mark set done'}
                            style={[styles.cTick, styles.tick, { backgroundColor: st.done ? Lime : theme.backgroundSelected }]}>
                            <Check size={18} strokeWidth={st.done ? 2.25 : 1.75} color={st.done ? '#09090b' : theme.textSecondary} />
                          </Press>
                          <Press onPress={() => edit((x) => { x[i].sets.splice(j, 1); if (!x[i].sets.length) x.splice(i, 1); })} scaleTo={0.85} style={[styles.cX, styles.tick]} accessibilityLabel={`Remove set ${labels[j]}`}>
                            <X size={16} strokeWidth={1.75} color={Red} />
                          </Press>
                        </Animated.View>
                      );
                    })}
                    <Pressable onPress={() => edit((x) => { const l = x[i].sets.at(-1); x[i].sets.push(l ? { kg: l.kg, reps: l.reps, ...(l.secs !== undefined ? { secs: l.secs } : {}) } : { kg: 0, reps: 10 }); })} style={styles.addSet}>
                      <Icon name="plus" size={14} /><ThemedText type="smallBold" themeColor="textSecondary">Add set</ThemedText>
                    </Pressable>
                  </Animated.View>
                )}
              </Animated.View>
            );
          })}
        </View>
        {sorting && <View style={{ height: Dimensions.get('window').height }} />}
        <Press onPress={() => setPicking(true)} style={[styles.addEx, { backgroundColor: theme.backgroundElement }]}>
          <Icon name="plus-circle" size={20} /><ThemedText type="smallBold" style={{ fontSize: 16 }}>Add exercise</ThemedText>
        </Press>
        <Pressable onPress={discard} style={{ alignItems: 'center', paddingVertical: 12 }}><ThemedText type="smallBold" style={{ color: Red }}>Discard workout</ThemedText></Pressable>
      </ScrollView>

      {rest > 0 && (
        <Animated.View entering={FadeInDown.springify().dampingRatio(1).duration(350)} exiting={FadeOutDown.duration(150)} style={[styles.restBar, { bottom: BottomTabInset + 12 }]}>
          <Timer size={18} color="#a3e635" />
          <ThemedText type="smallBold" style={{ color: '#fff' }}>Rest</ThemedText>
          <Pressable onPress={() => changeRest(-15)} style={[styles.restBtn, { marginLeft: 'auto' }]}><ThemedText type="smallBold" style={{ color: '#fff', fontSize: 12 }}>−15</ThemedText></Pressable>
          <ThemedText style={styles.restTime}>{mmss(rest)}</ThemedText>
          <Pressable onPress={() => changeRest(15)} style={styles.restBtn}><ThemedText type="smallBold" style={{ color: '#fff', fontSize: 12 }}>+15</ThemedText></Pressable>
          <Pressable onPress={() => setRestEnd(null)} style={styles.restBtn} accessibilityLabel="Skip rest"><X size={16} color="#fff" /></Pressable>
        </Animated.View>
      )}

      <Modal visible={timers} transparent animationType="fade" onRequestClose={() => setTimers(false)}>
        <Pressable style={styles.scrim} onPress={() => setTimers(false)}>
          <Animated.View entering={ZoomIn.springify().dampingRatio(1).duration(350)} style={[styles.dialog, { backgroundColor: theme.backgroundElement }]}>
            <Pressable style={{ gap: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <ThemedText type="smallBold" style={{ fontSize: 16 }}>Timers</ThemedText>
                <Pressable onPress={() => setTimers(false)} hitSlop={8}><X size={18} color={theme.textSecondary} /></Pressable>
              </View>
              <View style={[styles.clockBox, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>Workout time</ThemedText>
                <ThemedText style={{ fontSize: 30, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{hhmmss(elapsed)}</ThemedText>
              </View>
              <View style={styles.trow}>
                <ThemedText type="smallBold" style={{ flex: 1 }}>Started at</ThemedText>
                <Stepper label={new Date(a.startedAt).toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit' })}
                  onMinus={() => setActive((x) => x && { ...x, startedAt: new Date(new Date(x.startedAt).getTime() - 5 * 60000).toISOString() })}
                  onPlus={() => setActive((x) => x && { ...x, startedAt: new Date(Math.min(Date.now(), new Date(x.startedAt).getTime() + 5 * 60000)).toISOString() })} />
              </View>
              <View style={styles.trow}>
                <ThemedText type="smallBold" style={{ flex: 1 }}>Rest timer</ThemedText>
                <Switch value={restOn} onValueChange={toggleRest} trackColor={{ true: Lime, false: '#3f3f46' }} thumbColor="#fff" />
              </View>
              <View style={[styles.trow, { opacity: restOn ? 1 : 0.4 }]} pointerEvents={restOn ? 'auto' : 'none'}>
                <ThemedText type="smallBold" style={{ flex: 1 }}>Rest between sets</ThemedText>
                <Stepper label={mmss(restSecs)} onMinus={() => changeRest(-15)} onPlus={() => changeRest(15)} />
              </View>
              <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>Hold exercises (planks, hangs, carries…) have a ▶ timer on each set. Switch them to reps with “Log reps instead”.</ThemedText>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
      <SetTypeSheet open={!!typingSet} current={typingSet ? typingSet.type : undefined} onClose={() => setTyping(null)}
        onPick={(t: SetType | undefined) => { if (typing) edit((x) => { x[typing.i].sets[typing.j].type = t; }); setTyping(null); }} />
      <ExercisePicker open={picking} onPick={addExercise} onClose={() => setPicking(false)} taken={a.exercises.map((e) => e.name)} />
      <MusclesSheet open={showHit} onClose={() => setShowHit(false)} hit={hit} areas={areas} ranked={ranked} />
    </View>
  );
}

// Hold the name ~0.4 s to pick the exercise up; the finger's screen y drives the sort.
function HoldToSort({ onStart, onMove, onEnd, children }: { onStart: (y: number) => void; onMove: (y: number) => void; onEnd: () => void; children: React.ReactNode }) {
  const g = Gesture.Pan().activateAfterLongPress(420).runOnJS(true)
    .onStart((e) => onStart(e.absoluteY)).onUpdate((e) => onMove(e.absoluteY)).onEnd(onEnd).onFinalize(onEnd);
  return <GestureDetector gesture={g}><View collapsable={false}>{children}</View></GestureDetector>;
}

function Stepper({ label, onMinus, onPlus }: { label: string; onMinus: () => void; onPlus: () => void }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Press onPress={onMinus} style={[styles.step, { backgroundColor: theme.backgroundSelected }]}><ThemedText type="smallBold">−</ThemedText></Press>
      <ThemedText type="smallBold" style={{ minWidth: 64, textAlign: 'center', fontVariant: ['tabular-nums'] }}>{label}</ThemedText>
      <Press onPress={onPlus} style={[styles.step, { backgroundColor: theme.backgroundSelected }]}><ThemedText type="smallBold">+</ThemedText></Press>
    </View>
  );
}

const styles = StyleSheet.create({
  bigBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Lime, borderRadius: 5, paddingVertical: 14 },
  ghostSm: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 5, paddingHorizontal: 12, paddingVertical: 7 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  timer: { fontSize: 30, lineHeight: 36, fontWeight: '700', fontVariant: ['tabular-nums'] },
  iconBtn: { width: 38, height: 38, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  card: { marginHorizontal: -16, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, backgroundColor: 'transparent' },
  collapsed: { height: CH, borderRadius: 5, paddingHorizontal: 12, justifyContent: 'center' },
  held: { zIndex: 10, borderWidth: 1, borderColor: Lime, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  ssTag: { position: 'absolute', top: -8, left: 12, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: '#09090b', paddingHorizontal: 8, paddingVertical: 1, borderRadius: 2, overflow: 'hidden' },
  smallAction: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, alignSelf: 'flex-start' },
  eq: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 2, paddingHorizontal: 8, paddingVertical: 4, maxWidth: 130 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setRow: { borderRadius: 4, paddingVertical: 4, paddingHorizontal: 6, marginHorizontal: -6 },
  doneRow: { backgroundColor: 'rgba(132,204,22,0.2)' },
  prRow: { backgroundColor: 'rgba(251,191,36,0.2)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.5)' },
  colHead: { fontSize: 12, color: '#a1a1aa', textAlign: 'center' },
  cSet: { width: 40 },
  cNum: { flex: 1, minWidth: 0, width: 0, textAlign: 'center' },
  cOrm: { width: 42, textAlign: 'center' },
  cPlay: { width: 40 },
  cTick: { width: 40 },
  cX: { width: 24 },
  num: { borderRadius: 4, paddingVertical: 8, fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  tick: { height: 36, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  addSet: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, alignSelf: 'flex-start' },
  addEx: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 5, paddingVertical: 14, marginTop: 16 },
  restBar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#27272a', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  restBtn: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 5 },
  restTime: { color: '#fff', fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'], minWidth: 52, textAlign: 'center' },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  dialog: { width: '100%', maxWidth: 380, borderRadius: 8, padding: 16 },
  clockBox: { borderRadius: 5, padding: 12, alignItems: 'center' },
  trow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  step: { width: 32, height: 32, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
});
