// Gym map (the website's /map): the SweatZone in isometric 3D (components/gym-3d) or as the flat floor plan; tap a machine to highlight it (it pulses) and see what it's for.
// Opens on a machine when called with ?e=<equipment id> (from a workout's location chip). Plain dashed boxes are tables.
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { G, Polygon, Rect, Text as SvgText } from 'react-native-svg';

import { equipKinds, equipment, exercises, floor } from '@shared/data';
import Gym3D from '@/components/gym-3d';
import { ThemedText } from '@/components/themed-text';
import { Section } from '@/components/ui/kit';
import { Lime } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const ARect = Animated.createAnimatedComponent(Rect);

function Picked({ e }: { e: (typeof equipment)[number] }) {
  const o = useSharedValue(1);
  useEffect(() => { o.set(withRepeat(withSequence(withTiming(0.55, { duration: 700 }), withTiming(1, { duration: 700 })), -1)); }, [o]);
  const props = useAnimatedProps(() => ({ opacity: o.value }));
  return <ARect x={e.x} y={e.y} width={e.w} height={e.h} rx={4} fill="#a3e635" stroke="#65a30d" strokeWidth={2} animatedProps={props} />;
}

function Chip({ on, label, onPress, a11y, square }: { on: boolean; label: string; onPress: () => void; a11y?: string; square?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityLabel={a11y} accessibilityState={{ selected: on }}
      style={[styles.chip, square && styles.square, { backgroundColor: on ? Lime : theme.backgroundElement }]}>
      <ThemedText type="smallBold" style={{ fontSize: 12, color: on ? '#09090b' : theme.text }}>{label}</ThemedText>
    </Pressable>
  );
}

export default function GymMap() {
  const params = useLocalSearchParams<{ e?: string }>();
  const theme = useTheme();
  const [sel, setSel] = useState<string | undefined>(params.e);
  const [plan, setPlan] = useState(false);
  const [scroll, setScroll] = useState(true); // off while a finger is on the 3D gym
  const picked = equipment.find((e) => e.id === sel);
  const zones = [...new Set(equipment.map((e) => e.zone))];
  const [tab, setTab] = useState<string>();
  const zone = tab ?? picked?.zone ?? zones[0]; // follows the picked machine until you choose a zone yourself
  const kind = equipKinds.find((k) => k.items.some((e) => e.id === sel));
  const pickId = (id?: string) => { setTab(undefined); setSel(id); };
  const usedFor = picked ? Object.entries(exercises).filter(([, v]) => v.equip === picked.id).map(([k]) => k) : [];

  return (
    <ScrollView scrollEnabled={scroll} style={{ backgroundColor: theme.background }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60, gap: 16 }}>
      <Stack.Screen options={{ title: 'Gym map' }} />
      <ThemedText type="small" themeColor="textSecondary">{picked ? `${picked.name} · ${picked.zone}` : 'Tap any equipment'}</ThemedText>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['3D', 'Floor plan'] as const).map((m) => {
          const on = (m === 'Floor plan') === plan;
          return (
            <Pressable key={m} onPress={() => setPlan(m === 'Floor plan')} accessibilityState={{ selected: on }} style={[styles.chip, { backgroundColor: on ? Lime : theme.backgroundElement }]}>
              <ThemedText type="smallBold" style={{ fontSize: 12, color: on ? '#09090b' : theme.text }}>{m}</ThemedText>
            </Pressable>
          );
        })}
      </View>
      {!plan ? <Section style={{ padding: 0, overflow: 'hidden' }}><Gym3D sel={sel} onPick={pickId} onGrab={(on) => setScroll(!on)} /></Section> : <Section style={{ paddingVertical: 8 }}>
        <Svg viewBox={floor.viewBox} width="100%" height={560}>
          <Polygon points={floor.outline} fill="#09090b" stroke="#3f3f46" strokeWidth={3} />
          {(([x, y, w, h]) => (
            <G>
              <Rect x={x} y={y} width={w} height={h} fill={Lime} />
              <SvgText x={x - 8} y={y + h / 2} textAnchor="middle" fontSize={13} fontWeight="700" fill={Lime} transform={`rotate(-90 ${x - 8} ${y + h / 2})`}>Entrance</SvgText>
            </G>
          ))(floor.door)}
          {floor.tables.map(([x, y, w, h], i) => <Rect key={i} x={x} y={y} width={w} height={h} rx={2} fill="#18181b" stroke="#3f3f46" strokeWidth={1.5} strokeDasharray="4 3" />)}
          {equipment.map((e) => {
            const on = e.id === sel, text = e.label, tall = e.h > e.w * 1.5;
            const long = tall ? e.h : e.w, thin = tall ? e.w : e.h;
            const size = Math.min(14, (long * 1.7) / text.length, thin * 0.62);
            const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
            return (
              <G key={e.id} onPress={() => pickId(e.id)}>
                {on ? <Picked e={e} /> : <Rect x={e.x} y={e.y} width={e.w} height={e.h} rx={4} fill="#27272a" stroke="#52525b" strokeWidth={2} />}
                <SvgText x={cx} y={cy + size * 0.35} textAnchor="middle" fontSize={size} fill={on ? '#09090b' : '#a1a1aa'} fontWeight={on ? '700' : '400'}
                  transform={tall ? `rotate(90 ${cx} ${cy})` : undefined}>{text}</SvgText>
              </G>
            );
          })}
        </Svg>
      </Section>}
      {picked && usedFor.length > 0 && <ThemedText type="small" themeColor="textSecondary">Used for: {usedFor.join(', ')}</ThemedText>}
      {/* compact picker: zone tabs, one scrolling row of machine kinds, then unit numbers for kinds with several */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={{ paddingHorizontal: 16, gap: 20 }}>
        {zones.map((z) => (
          <Pressable key={z} onPress={() => setTab(z)} accessibilityRole="tab" accessibilityState={{ selected: z === zone }}
            style={{ paddingBottom: 6, borderBottomWidth: 2, borderBottomColor: z === zone ? Lime : 'transparent' }}>
            <ThemedText type="smallBold" themeColor={z === zone ? 'text' : 'textSecondary'}>{z}</ThemedText>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {equipKinds.filter((k) => k.zone === zone).map((k) => (
          <Chip key={k.name} on={k === kind} onPress={() => pickId(k.items[0].id)} label={k.items.length > 1 ? `${k.name}  ×${k.items.length}` : k.name} />
        ))}
      </ScrollView>
      {kind && kind.items.length > 1 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {kind.items.map((e, i) => <Chip key={e.id} on={e.id === sel} onPress={() => pickId(e.id)} label={String(i + 1)} a11y={e.name} square />)}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: { borderRadius: 3, paddingHorizontal: 12, paddingVertical: 7 },
  square: { width: 34, paddingHorizontal: 0, alignItems: 'center' },
  bleed: { marginHorizontal: -16, flexGrow: 0 },
});
