// Gym: clock in with the door QR, live crowd, and the best free hour to train today between classes.
// Same rules as the website's home page; the timetable comes from the website's /api/timetable when it's reachable.
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withDelay, withTiming, Easing } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { classes as sample, crowdAt, crowdByHour, fmt, gym, minsOf, toMin } from '@shared/data';
import { gaps } from '@shared/lifting';
import { ChevronRight } from 'lucide-react-native';
import Avatar from '@/components/avatar';
import { Icon, Section } from '@/components/ui/kit';
import WorkoutPill from '@/components/workout-pill';
import { ThemedText } from '@/components/themed-text';
import { Button, Press } from '@/components/ui/button';
import { BottomTabInset, Lime } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { sb, useStore } from '@/lib/store';
import { img } from '@/lib/web';

type Class = { code: string; name: string; start: string; end: string; room: string };
const level = (p: number) => (p >= 80 ? { label: 'Packed', color: '#ef4444' } : p >= 50 ? { label: 'Busy', color: '#f59e0b' } : { label: 'Quiet', color: Lime });
const WEB = process.env.EXPO_PUBLIC_WEB_URL?.replace(/\/$/, '');
const easeInOut = Easing.bezier(0.65, 0, 0.35, 1); // bars ease in and out, like the website

// Today's classes for an intake from the website's timetable feed; null = no intake (sample timetable), undefined = loading.
function useClasses(intake: string | null, day: string) {
  const [res, setRes] = useState<{ key: string; known: boolean; classes: Class[] } | null>(null);
  useEffect(() => {
    if (!intake || !WEB) return;
    fetch(`${WEB}/api/timetable?intake=${encodeURIComponent(intake)}&date=${day}`).then((r) => r.json())
      .then((d) => setRes({ key: intake + day, known: !!d.known, classes: d.classes ?? [] }))
      .catch(() => setRes({ key: intake + day, known: false, classes: [] }));
  }, [intake, day]);
  if (!intake || !WEB) return null;
  return res?.key === intake + day ? res : undefined;
}

function Bar({ pct, color, height = 8, delay = 0 }: { pct: number; color: string; height?: number; delay?: number }) {
  const w = useSharedValue(0);
  useEffect(() => { w.set(withDelay(delay, withTiming(pct, { duration: 700, easing: easeInOut }))); }, [pct, delay, w]);
  const anim = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return <Animated.View style={[{ height, borderRadius: 4, backgroundColor: color }, anim]} />;
}

function HourBar({ p, now, i }: { p: number; now: boolean; i: number }) {
  const theme = useTheme();
  const h = useSharedValue(0);
  useEffect(() => { h.set(withDelay(i * 30, withTiming(Math.max(p, 4) * 0.5, { duration: 700, easing: easeInOut }))); }, [p, i, h]);
  const anim = useAnimatedStyle(() => ({ height: h.value }));
  return <Animated.View style={[{ width: '100%', borderRadius: 3, backgroundColor: now ? level(p).color : theme.backgroundSelected }, anim]} />;
}

export default function GymHome() {
  const { s, me, clockIn, clockOut } = useStore();
  const theme = useTheme();
  const [now, setNow] = useState(() => new Date());
  const [scanning, setScanning] = useState(false);
  const [inside, setInside] = useState(0);
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 5000); return () => clearInterval(id); }, []);
  useEffect(() => {
    const load = () => sb.rpc('gym_count').then(({ data }) => typeof data === 'number' && setInside(data));
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [s.clockedIn]);
  const tt = useClasses(me.intake, now.toLocaleDateString('en-CA'));
  const classes = tt === null ? sample : tt?.classes ?? [];

  const m = minsOf(now);
  const open = m >= toMin(gym.open) && m < toMin(gym.close);
  const since = s.clockedIn ? new Date(s.clockedIn) : null;
  const clockedIn = since && since.toDateString() === now.toDateString() && open ? s.clockedIn : null; // forgotten clock-outs count as out at closing
  const people = open ? Math.round((crowdAt(m) / 100) * gym.capacity) + inside : 0;
  const pct = Math.min(100, Math.round((people / gym.capacity) * 100));
  const lv = level(pct);

  const busy = classes.map((c) => ({ start: toMin(c.start), end: toMin(c.end) }));
  const slots: { start: number; crowd: number }[] = [];
  for (const g of gaps(busy, toMin(gym.open), toMin(gym.close) - 30, m))
    for (let t = g.start; t + 60 <= g.end; t += 15) slots.push({ start: t, crowd: Math.round((crowdAt(t) + crowdAt(t + 30) + crowdAt(t + 60)) / 3) });
  const quietest = Math.min(...slots.map((x) => x.crowd));
  const best = slots.find((x) => x.crowd <= quietest + 5) ?? null;
  const before = best && classes.filter((c) => toMin(c.end) <= best.start).at(-1);
  const after = best && classes.find((c) => toMin(c.start) >= best.start + 60);
  const mins = clockedIn ? Math.max(0, Math.round((now.getTime() - new Date(clockedIn).getTime()) / 60000)) : 0;

  function scan() {
    setScanning(true);
    // simulated door-QR scan, like the website's demo; the real flow opens /checkin from the door's code
    setTimeout(() => clockIn().then(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})).finally(() => setScanning(false)), 1200);
  }
  const icon = (n: string) => img(`/icons/${n}.webp`);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={[styles.page, { paddingBottom: BottomTabInset + 40 }]}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <ThemedText type="small" themeColor="textSecondary">Hey {me.name} 👋</ThemedText>
            <ThemedText style={styles.h1}>{gym.name}</ThemedText>
          </View>
          <View style={[styles.pill, { backgroundColor: open ? 'rgba(132,204,22,0.15)' : theme.backgroundSelected }]}>
            <ThemedText type="smallBold" style={{ fontSize: 12, color: open ? Lime : theme.textSecondary }}>{open ? `Open until ${gym.close}` : `Opens ${gym.open}`}</ThemedText>
          </View>
          <Press onPress={() => router.push('/me')} accessibilityLabel="Your profile" scaleTo={0.92}><Avatar url={me.avatar_url} name={me.name} size={38} ring="rgba(132,204,22,0.4)" /></Press>
        </View>

        {clockedIn ? (
          <Animated.View entering={FadeIn.duration(250)} style={[styles.clock, { backgroundColor: Lime }]}>
            <ThemedText type="smallBold" style={styles.kicker}>CLOCKED IN</ThemedText>
            <ThemedText style={styles.big}>{Math.floor(mins / 60)}h {String(mins % 60).padStart(2, '0')}m</ThemedText>
            <ThemedText type="small" style={{ color: '#09090b', opacity: 0.8 }}>since {new Date(clockedIn).toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit' })} · {me.name}</ThemedText>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              <Press onPress={() => router.navigate('/train')} style={[styles.dark, { flex: 1 }]}>
                <ThemedText type="smallBold" style={{ color: '#fff', fontSize: 15 }}>{s.active ? 'Resume workout' : 'Start workout'}</ThemedText>
              </Press>
              <Press onPress={clockOut} style={styles.out}><ThemedText type="smallBold" style={{ color: '#09090b' }}>Out</ThemedText></Press>
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.duration(250)} style={[styles.clock, { backgroundColor: '#18181b' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold" style={[styles.kicker, { color: '#a1a1aa' }]}>SKIP THE ID CHECK AT THE COUNTER</ThemedText>
                <ThemedText style={{ color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 24, marginTop: 4 }}>Scan the QR code at the gym door to clock in</ThemedText>
              </View>
              {icon('qr') && <Image source={icon('qr')} style={{ width: 60, height: 60, opacity: scanning ? 0.5 : 1 }} />}
            </View>
            <Button onPress={scan} disabled={!open || scanning} style={{ marginTop: 14 }}>
              {scanning ? 'Scanning…' : open ? 'Scan to clock in' : 'Gym is closed'}
            </Button>
          </Animated.View>
        )}

        <Section>
          <View style={styles.cardHead}>
            {icon('crowd') && <Image source={icon('crowd')} style={{ width: 28, height: 28 }} />}
            <ThemedText type="smallBold" style={{ fontSize: 16, flex: 1 }}>Live crowd</ThemedText>
            <View style={styles.live}><View style={styles.dot} /><ThemedText type="smallBold" style={{ fontSize: 11, color: Lime }}>LIVE</ThemedText></View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
            <ThemedText style={styles.big2}>{people}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">/ {gym.capacity} people</ThemedText>
            <ThemedText type="smallBold" style={{ marginLeft: 'auto', color: open ? lv.color : theme.textSecondary }}>{open ? lv.label : 'Closed'}</ThemedText>
          </View>
          <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}><Bar pct={pct} color={lv.color} /></View>
          <View style={styles.hours} accessibilityLabel="Typical crowd by hour">
            {Object.entries(crowdByHour).map(([h, p], i) => {
              const isNow = Number(h) === Math.floor(m / 60);
              return (
                <View key={h} style={styles.hour}>
                  <HourBar p={p} now={isNow && open} i={i} />
                  <ThemedText style={{ fontSize: 9, color: isNow ? theme.text : theme.textSecondary, fontWeight: isNow ? '800' : '400' }}>{Number(h) % 3 === 0 ? h : ' '}</ThemedText>
                </View>
              );
            })}
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>Typical crowd today, from past clock-ins</ThemedText>
        </Section>

        <Section>
          <View style={styles.cardHead}>
            {icon('calendar') && <Image source={icon('calendar')} style={{ width: 28, height: 28 }} />}
            <ThemedText type="smallBold" style={{ fontSize: 16 }}>Best time to train today</ThemedText>
          </View>
          {tt === undefined ? <ActivityIndicator color={Lime} style={{ marginVertical: 12, alignSelf: 'flex-start' }} />
            : best ? (
              <>
                <ThemedText style={[styles.big2, { marginTop: 8 }]}>{fmt(best.start)}–{fmt(best.start + 60)}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">~{best.crowd}% full{before ? ` · after ${before.name}` : ''}{after ? ` · before ${after.name} at ${after.start}` : ''}</ThemedText>
              </>
            ) : <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 6 }}>No free hour left today. Rest day? 😴</ThemedText>}
          {tt !== undefined && classes.length > 0 && (
            <View style={[styles.classes, { borderColor: theme.border }]}>
              {classes.map((c) => (
                <View key={c.start + c.name} style={{ flexDirection: 'row', gap: 8 }}>
                  <ThemedText type="small" themeColor="textSecondary" style={{ width: 92, fontSize: 12, fontVariant: ['tabular-nums'] }}>{c.start}–{c.end}</ThemedText>
                  <ThemedText type="small" numberOfLines={1} style={{ flex: 1, fontSize: 12 }}>{c.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>{c.room}</ThemedText>
                </View>
              ))}
            </View>
          )}
          <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12, marginTop: 6 }}>
            {tt === null ? 'Sample timetable · tap your picture, then Edit profile, to add your intake' : tt === undefined ? ' ' : !tt.known ? `Intake ${me.intake} not found in the APU timetable` : `${me.intake} · ${classes.length ? `${classes.length} class${classes.length > 1 ? 'es' : ''} today` : 'no classes today'} · APU timetable`}
          </ThemedText>
        </Section>

        <Press onPress={() => router.push('/map')} scaleTo={0.98} style={styles.mapRow}>
          <Icon name="map" size={44} />
          <View style={{ flex: 1 }}>
            <ThemedText type="smallBold" style={{ fontSize: 16 }}>Gym map</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">Find any machine or rack</ThemedText>
          </View>
          <ChevronRight size={18} color={theme.textSecondary} />
        </Press>
      </ScrollView>
      <WorkoutPill />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 14 },
  mapRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  h1: { fontSize: 26, lineHeight: 32, fontWeight: '800', letterSpacing: -0.5 },
  pill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 4 },
  clock: { borderRadius: 20, padding: 18 },
  kicker: { fontSize: 11, letterSpacing: 1, color: '#09090b', opacity: 0.75 },
  big: { fontSize: 32, lineHeight: 38, fontWeight: '800', color: '#09090b', fontVariant: ['tabular-nums'], marginTop: 2 },
  big2: { fontSize: 28, lineHeight: 34, fontWeight: '800', fontVariant: ['tabular-nums'] },
  dark: { backgroundColor: '#09090b', borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  out: { backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 14, paddingHorizontal: 18, justifyContent: 'center' },
  card: { borderRadius: 20, padding: 16 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Lime },
  track: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 8 },
  hours: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 70, marginTop: 14, marginBottom: 4 },
  hour: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  classes: { marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 4 },
});
