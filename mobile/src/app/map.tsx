// Gym map (the website's /map): the SweatZone floor plan; tap a machine to highlight it (it pulses) and see what it's for.
// Opens on a machine when called with ?e=<equipment id> (from a workout's location chip).
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { G, Polygon, Rect, Text as SvgText } from 'react-native-svg';

import { equipment, exercises, floor } from '@shared/data';
import { ThemedText } from '@/components/themed-text';
import { Section } from '@/components/ui/kit';
import { Lime } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const short: Record<string, string> = { dbs: 'Dumbbells', dbseat1: 'DB Bench', dbseat2: 'DB Bench', bench1: 'Bench', bench2: 'Incline' };
const label = (e: { id: string }) => short[e.id] ?? e.id.slice(1);
const ARect = Animated.createAnimatedComponent(Rect);

function Picked({ e }: { e: (typeof equipment)[number] }) {
  const o = useSharedValue(1);
  useEffect(() => { o.set(withRepeat(withSequence(withTiming(0.55, { duration: 700 }), withTiming(1, { duration: 700 })), -1)); }, [o]);
  const props = useAnimatedProps(() => ({ opacity: o.value }));
  return <ARect x={e.x} y={e.y} width={e.w} height={e.h} rx={4} fill="#a3e635" stroke="#65a30d" strokeWidth={2} animatedProps={props} />;
}

export default function GymMap() {
  const params = useLocalSearchParams<{ e?: string }>();
  const theme = useTheme();
  const [sel, setSel] = useState<string | undefined>(params.e);
  const picked = equipment.find((e) => e.id === sel);
  const zones = [...new Set(equipment.map((e) => e.zone))];
  const usedFor = picked ? Object.entries(exercises).filter(([, v]) => v.equip === picked.id).map(([k]) => k) : [];

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60, gap: 16 }}>
      <Stack.Screen options={{ title: 'Gym map' }} />
      <ThemedText type="small" themeColor="textSecondary">{picked ? `${picked.name} · ${picked.zone}` : 'Tap any equipment'}</ThemedText>
      <Section style={{ paddingVertical: 8 }}>
        <Svg viewBox="155 130 625 1155" width="100%" height={520}>
          <Polygon points={floor.outline} fill="#09090b" stroke="#3f3f46" strokeWidth={3} />
          {floor.pillars.map(([x, y, w, h], i) => <Rect key={i} x={x} y={y} width={w} height={h} fill="#3f3f46" />)}
          {equipment.map((e) => {
            const on = e.id === sel, text = label(e), tall = e.h > e.w * 1.5;
            const long = tall ? e.h : e.w, thin = tall ? e.w : e.h;
            const size = Math.min(22, (long * 1.6) / text.length, thin * 0.7);
            const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
            return (
              <G key={e.id} onPress={() => setSel(e.id)}>
                {on ? <Picked e={e} /> : <Rect x={e.x} y={e.y} width={e.w} height={e.h} rx={4} fill="#27272a" stroke="#52525b" strokeWidth={2} />}
                <SvgText x={cx} y={cy + size * 0.35} textAnchor="middle" fontSize={size} fill={on ? '#09090b' : '#a1a1aa'} fontWeight={on ? '700' : '400'}
                  transform={tall ? `rotate(90 ${cx} ${cy})` : undefined}>{text}</SvgText>
              </G>
            );
          })}
        </Svg>
      </Section>
      {picked && usedFor.length > 0 && <ThemedText type="small" themeColor="textSecondary">Used for: {usedFor.join(', ')}</ThemedText>}
      {zones.map((z) => (
        <View key={z}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={{ fontSize: 12, letterSpacing: 1, marginBottom: 8 }}>{z.toUpperCase()}</ThemedText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {equipment.filter((e) => e.zone === z).map((e) => (
              <Pressable key={e.id} onPress={() => setSel(e.id)} style={[styles.chip, { backgroundColor: e.id === sel ? Lime : theme.backgroundElement }]}>
                <ThemedText type="smallBold" style={{ fontSize: 12, color: e.id === sel ? '#09090b' : theme.text }}>{e.name.startsWith('Unlabelled') ? `#${label(e)}` : e.name}</ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ chip: { borderRadius: 3, paddingHorizontal: 12, paddingVertical: 7 } });
