// A cafeteria dish (the website's /eat/[id]): photo, calories and macros against your daily targets, where the calories
// come from, log it, and more from the same stall.
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Check, ChevronRight, Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { calSplit, foodBySlug, foods, highProtein, slug } from '@shared/data';
import { nutrition } from '@shared/nutrition';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { EmptyState, Icon } from '@/components/ui/kit';
import { Lime } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/lib/store';
import { img } from '@/lib/web';
import { InfoTip } from '@/components/ui/info-tip';
import { help } from '@shared/help';

const macros = [
  { k: 'p', label: 'Protein', icon: 'protein', color: '#0ea5e9' },
  { k: 'c', label: 'Carbs', icon: 'carbs', color: '#f59e0b' },
  { k: 'f', label: 'Fat', icon: 'fat', color: '#ec4899' },
] as const;

function Grow({ pct, color }: { pct: number; color: string }) {
  const w = useSharedValue(0);
  useEffect(() => { w.set(withTiming(Math.min(100, pct), { duration: 700, easing: Easing.bezier(0.65, 0, 0.35, 1) })); }, [pct, w]);
  const anim = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return <Animated.View style={[{ height: '100%', borderRadius: 2, backgroundColor: color }, anim]} />;
}

export default function FoodPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { s, me, addFood } = useStore();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [added, setAdded] = useState(false);
  const f = foodBySlug(id);
  if (!f) return <View style={{ flex: 1, backgroundColor: theme.background }}><EmptyState art="not-found" title="Dish not found" text="It may have left the menu." /></View>;

  const { targets } = nutrition(me, s.food, s.weights);
  const split = calSplit(f);
  const today = new Date().toDateString();
  const times = s.food.filter((x) => x.name === f.name && new Date(x.at).toDateString() === today).length;
  const more = foods.filter((x) => x.stall === f.stall && x.name !== f.name);
  const side = Math.min(288, width - 32);
  const section = [styles.section, { borderBottomColor: theme.border }];

  function add() { // shows at once; the store saves it in the background
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    addFood({ name: f!.name, kcal: f!.kcal, p: f!.p, c: f!.c, f: f!.f });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: f.stall, headerTitleAlign: 'center' }} />
      <View style={[section, { paddingTop: 4 }]}>
        <Image source={img(`/food/${slug(f.name)}.webp`)} style={{ width: side, height: side, alignSelf: 'center', borderRadius: 6, backgroundColor: '#18181b' }} contentFit="cover" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 15 }}><ThemedText style={[styles.name, { marginTop: 0, flexShrink: 1 }]}>{f.name}</ThemedText><InfoTip text={help.portion} size={17} label="About these numbers" /></View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
          <ThemedText style={[styles.tag, { backgroundColor: theme.backgroundSelected, color: theme.textSecondary }]}>{f.stall.toUpperCase()}</ThemedText>
          {highProtein(f) && <ThemedText style={[styles.tag, { backgroundColor: 'rgba(163,230,53,0.1)', color: Lime }]}>HIGH PROTEIN</ThemedText>}
        </View>
      </View>

      <View style={section}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Icon name="kcal" size={40} />
          <View style={{ flex: 1 }}>
            <ThemedText style={{ fontSize: 30, lineHeight: 32, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{f.kcal}<ThemedText type="small" themeColor="textSecondary"> kcal</ThemedText></ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 4 }}>{Math.round((f.kcal / targets.kcal) * 100)}% of your {targets.kcal} kcal day</ThemedText>
          </View>
        </View>
        <View style={styles.split} accessibilityLabel="Where the calories come from">
          {macros.map((m) => <View key={m.k} style={{ width: `${split[m.k] * 100}%`, backgroundColor: m.color }} />)}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          {macros.map((m) => (
            <ThemedText key={m.k} themeColor="textSecondary" style={{ fontSize: 12 }}>
              <ThemedText style={{ fontSize: 12, fontWeight: '600' }}>{Math.round(split[m.k] * 100)}%</ThemedText> {m.label.toLowerCase()}
            </ThemedText>
          ))}
        </View>
      </View>

      <View style={[section, { gap: 12 }]}>
        {macros.map((m) => (
          <View key={m.k}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name={m.icon} size={20} />
              <ThemedText type="smallBold" style={{ flex: 1 }}>{m.label}</ThemedText>
              <ThemedText type="smallBold" style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>{f[m.k]}g</ThemedText>
              <ThemedText themeColor="textSecondary" style={{ fontSize: 12, width: 96, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{Math.round((f[m.k] / targets[m.k]) * 100)}% of {targets[m.k]}g</ThemedText>
            </View>
            <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}><Grow pct={(f[m.k] / targets[m.k]) * 100} color={m.color} /></View>
          </View>
        ))}
      </View>

      <View style={{ paddingVertical: 15 }}>
        <Button onPress={add}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {added ? <Check size={18} color="#09090b" /> : <Plus size={18} strokeWidth={2.5} color="#09090b" />}
            <ThemedText style={{ color: '#09090b', fontWeight: '600' }}>{added ? 'Added to today' : 'Add to today’s log'}</ThemedText>
          </View>
        </Button>
        {times > 0 && <ThemedText themeColor="textSecondary" style={{ fontSize: 12, textAlign: 'center', marginTop: 8 }}>Logged {times}× today</ThemedText>}
      </View>

      {more.length > 0 && (
        <View style={[styles.more, { borderTopColor: theme.border }]}>
          <ThemedText style={{ fontWeight: '600' }}>More from {f.stall}</ThemedText>
          {more.map((x) => (
            <Pressable key={x.name} onPress={() => router.push({ pathname: '/food/[id]', params: { id: slug(x.name) } })} style={styles.row}>
              <Image source={img(`/food/${slug(x.name)}.webp`)} style={{ width: 48, height: 48, borderRadius: 5, backgroundColor: '#18181b' }} />
              <View style={{ flex: 1 }}>
                <ThemedText numberOfLines={1} style={{ fontWeight: '500' }}>{x.name}</ThemedText>
                <ThemedText themeColor="textSecondary" style={{ fontSize: 12, fontVariant: ['tabular-nums'] }}>{x.kcal} kcal · {x.p}g protein</ThemedText>
              </View>
              <ChevronRight size={18} color={theme.textSecondary} />
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: { marginHorizontal: -16, paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth },
  name: { fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.5, marginTop: 15 },
  tag: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 2, overflow: 'hidden' },
  split: { flexDirection: 'row', height: 10, borderRadius: 2, overflow: 'hidden', marginTop: 15 },
  track: { height: 6, borderRadius: 2, overflow: 'hidden', marginTop: 6 },
  more: { marginHorizontal: -16, paddingHorizontal: 16, paddingTop: 15, borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
});
