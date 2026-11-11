// Muscles hit this workout: sets per muscle (main muscle 1, others ½; warm-ups don't count), most first.
// Same rule and finer split (lats / traps / lower back, abs / obliques) as the website's Muscles pop-up.
import { useEffect } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Exercise, ExerciseLog } from '@shared/data';
import { countsPR } from '@shared/lifting';
import { muscleFor } from '@shared/muscles';
import { ThemedText } from '@/components/themed-text';
import { Press } from '@/components/ui/button';
import { Lime } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function musclesHit(exercises: ExerciseLog[], library: Exercise[]) {
  const lib = new Map(library.map((e) => [e.name, e]));
  const hit: Record<string, number> = {};
  for (const e of exercises) {
    const ex = lib.get(e.name), n = e.sets.filter((x) => x.done && countsPR(x.type)).length;
    if (!ex || !n) continue;
    const main = muscleFor(ex.muscle, ex.id);
    hit[main] = (hit[main] ?? 0) + n;
    for (const m of new Set(ex.secondary.map((x) => muscleFor(x, ex.id)))) if (m !== main) hit[m] = (hit[m] ?? 0) + n / 2;
  }
  return Object.entries(hit).sort((x, y) => y[1] - x[1]);
}

function GrowBar({ pct, i }: { pct: number; i: number }) {
  const w = useSharedValue(0);
  useEffect(() => { w.set(withDelay(80 + i * 60, withTiming(pct, { duration: 700, easing: Easing.bezier(0.65, 0, 0.35, 1) }))); }, [pct, i, w]);
  const anim = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return <Animated.View style={[styles.bar, anim]} />;
}

export default function MusclesSheet({ open, onClose, ranked }: { open: boolean; onClose: () => void; ranked: [string, number][] }) {
  const theme = useTheme();
  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={styles.head}>
          <ThemedText style={styles.h1}>Muscles hit</ThemedText>
          <Press onPress={onClose} style={[styles.close, { backgroundColor: theme.backgroundElement }]}><ThemedText type="smallBold">Done</ThemedText></Press>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
          <ThemedText type="small" themeColor="textSecondary">Sets this workout. The main muscle counts 1, others worked count ½.</ThemedText>
          {ranked.length === 0 ? <ThemedText themeColor="textSecondary" style={{ textAlign: 'center', marginTop: 30 }}>Tick sets to see muscles hit.</ThemedText>
            : ranked.map(([m, n], i) => (
              <View key={m} style={styles.row}>
                <ThemedText style={{ width: 96, textTransform: 'capitalize' }} numberOfLines={1}>{m}</ThemedText>
                <View style={{ flex: 1 }}><GrowBar pct={(n / ranked[0][1]) * 100} i={i} /></View>
                <ThemedText type="smallBold" style={{ width: 32, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{n}</ThemedText>
              </View>
            ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 4 },
  h1: { fontSize: 26, lineHeight: 32, fontWeight: '800', letterSpacing: -0.5 },
  close: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bar: { height: 8, borderRadius: 4, backgroundColor: Lime },
});
