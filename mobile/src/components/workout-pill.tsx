// While a workout is running, a small card floats above the tab bar on the other tabs: name, live timer, sets done.
// Tap to go back to it. (The website's ongoing-workout card.)
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { hhmmss } from '@shared/lifting';
import { ThemedText } from '@/components/themed-text';
import { Press } from '@/components/ui/button';
import { Icon } from '@/components/ui/kit';
import { BottomTabInset, Lime } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/lib/store';

export default function WorkoutPill() {
  const { s } = useStore();
  const theme = useTheme();
  const a = s.active;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { if (!a) return; const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, [a]);
  if (!a) return null;
  const secs = Math.max(0, Math.floor((now - new Date(a.startedAt).getTime()) / 1000));
  const done = a.exercises.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0);
  const total = a.exercises.reduce((n, e) => n + e.sets.length, 0);
  return (
    <Animated.View entering={FadeInDown.springify().dampingRatio(1).duration(350)} exiting={FadeOutDown.duration(150)} style={[styles.wrap, { bottom: BottomTabInset + 12 }]}>
      <Press onPress={() => router.navigate('/train')} scaleTo={0.98} accessibilityLabel={`Workout in progress, ${hhmmss(secs)}. Go back to it`}
        style={[styles.pill, { backgroundColor: theme.backgroundSelected, borderColor: 'rgba(255,255,255,0.08)' }]}>
        <View style={styles.badge}><Icon name="train" size={22} /><View style={styles.dot} /></View>
        <View style={{ flex: 1 }}>
          <ThemedText type="smallBold" numberOfLines={1}>{a.title === 'Workout' ? 'Workout in progress' : a.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12, fontVariant: ['tabular-nums'] }}>{hhmmss(secs)} · {done}/{total} sets</ThemedText>
        </View>
        <ChevronRight size={18} color={theme.textSecondary} />
      </Press>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  badge: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(132,204,22,0.15)', alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 2, right: 2, width: 8, height: 8, borderRadius: 4, backgroundColor: Lime },
});
