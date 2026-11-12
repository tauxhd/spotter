// Muscles hit this workout (the website's Muscles pop-up): swipe between the 3D body and the spider chart, then sets per
// muscle, most first (main muscle 1 set, others ½; warm-ups don't count).
import { X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { addSets, type Exercise, type ExerciseLog } from '@shared/data';
import { countsPR } from '@shared/lifting';
import { muscleFor } from '@shared/muscles';
import { Radar } from '@/components/muscle-distribution';
import MuscleModel from '@/components/muscle-model';
import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/kit';
import { Lime } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Sets per fine muscle group (for the list and the 3D body) and per body area (for the spider chart).
export function musclesHit(exercises: ExerciseLog[], library: Exercise[]) {
  const lib = new Map(library.map((e) => [e.name, e]));
  const hit: Record<string, number> = {}, areas: Record<string, number> = {};
  for (const e of exercises) {
    const ex = lib.get(e.name), n = e.sets.filter((x) => x.done && countsPR(x.type)).length;
    if (!ex || !n) continue;
    const main = muscleFor(ex.muscle, ex.id);
    hit[main] = (hit[main] ?? 0) + n;
    for (const m of new Set(ex.secondary.map((x) => muscleFor(x, ex.id)))) if (m !== main) hit[m] = (hit[m] ?? 0) + n / 2;
    addSets(areas, ex, n);
  }
  return { hit, areas, ranked: Object.entries(hit).sort((x, y) => y[1] - x[1]) };
}

function GrowBar({ pct, i }: { pct: number; i: number }) {
  const w = useSharedValue(0);
  useEffect(() => { w.set(withDelay(80 + i * 60, withTiming(pct, { duration: 700, easing: Easing.bezier(0.65, 0, 0.35, 1) }))); }, [pct, i, w]);
  const anim = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return <Animated.View style={[{ height: 8, borderRadius: 2, backgroundColor: Lime }, anim]} />;
}

export default function MusclesSheet({ open, onClose, hit, areas, ranked }: { open: boolean; onClose: () => void; hit: Record<string, number>; areas: Record<string, number>; ranked: [string, number][] }) {
  const theme = useTheme();
  const w = Dimensions.get('window').width;
  const [slide, setSlide] = useState(0);
  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={styles.head}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Icon name="stats" size={22} /><ThemedText style={styles.h1}>Muscles hit</ThemedText></View>
          <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close"><X size={20} color={theme.textSecondary} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} scrollEventThrottle={64}
            onScroll={(e) => setSlide(Math.round(e.nativeEvent.contentOffset.x / w))}>
            <View style={{ width: w, paddingHorizontal: 16 }}>{open && <MuscleModel hit={hit} />}</View>
            <View style={{ width: w, paddingHorizontal: 16, justifyContent: 'center' }}><Radar cur={areas} height={320} /></View>
          </ScrollView>
          <View style={styles.dots}>{[0, 1].map((k) => <View key={k} style={[styles.dot, slide === k && { width: 16, backgroundColor: Lime }]} />)}</View>
          <View style={{ paddingHorizontal: 16, gap: 12, marginTop: 8 }}>
            <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>Sets this workout. The main muscle counts 1, others worked count ½.</ThemedText>
            {ranked.length === 0 ? <ThemedText themeColor="textSecondary" style={{ textAlign: 'center', marginTop: 16 }}>Tick sets to see muscles hit.</ThemedText>
              : ranked.map(([m, n], i) => (
                <View key={m} style={styles.row}>
                  <ThemedText style={{ width: 96, textTransform: 'capitalize' }} numberOfLines={1}>{m}</ThemedText>
                  <View style={{ flex: 1 }}><GrowBar pct={(n / ranked[0][1]) * 100} i={i} /></View>
                  <ThemedText type="smallBold" style={{ width: 32, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{n}</ThemedText>
                </View>
              ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 4 },
  h1: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 6 },
  dot: { height: 6, width: 6, borderRadius: 3, backgroundColor: 'rgba(161,161,170,0.5)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
