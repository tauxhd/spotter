// Grey placeholders shaped like the content that's loading, with a soft light sweeping across (the website's Skeleton.tsx
// and `.bone`): a post, a profile, a list of people, the stats page.
import { useEffect, useId, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

type Size = number | `${number}%`;

export function Bone({ w, h, r = 2, style }: { w?: Size; h: Size; r?: number; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const id = useId();
  const reduce = useReducedMotion();
  const [width, setWidth] = useState(0);
  const x = useSharedValue(-1);
  useEffect(() => {
    if (!reduce) x.set(withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }), -1));
  }, [reduce, x]);
  const sweep = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * width }] }));
  return (
    <View aria-hidden onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[{ width: w, height: h, borderRadius: r, overflow: 'hidden', backgroundColor: theme.backgroundSelected }, style]}>
      {width > 0 && !reduce && (
        <Animated.View style={[StyleSheet.absoluteFill, sweep]}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#ffffff" stopOpacity={0} />
                <Stop offset="0.5" stopColor="#ffffff" stopOpacity={0.07} />
                <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={`url(#${id})`} />
          </Svg>
        </Animated.View>
      )}
    </View>
  );
}

const row = { flexDirection: 'row', alignItems: 'center' } as const;

export function PostSkeleton() {
  const theme = useTheme();
  return (
    <View style={[styles.card, { borderBottomColor: theme.border }]} accessibilityLabel="Loading workout">
      <View style={[row, { gap: 12 }]}>
        <Bone w={48} h={48} r={24} />
        <View style={{ flex: 1, gap: 8 }}><Bone w={128} h={14} /><Bone w={96} h={12} /></View>
      </View>
      <Bone w={160} h={20} style={{ marginTop: 16 }} />
      <View style={[row, { marginTop: 16, gap: 8 }]}>
        {[0, 1, 2].map((i) => <View key={i} style={{ flex: 1, gap: 6 }}><Bone w={40} h={12} /><Bone w={64} h={16} /></View>)}
      </View>
      {[0, 1].map((i) => <View key={i} style={[row, { marginTop: 16, gap: 12 }]}><Bone w={40} h={40} r={20} /><Bone w={176} h={16} /></View>)}
    </View>
  );
}

export function ProfileSkeleton() {
  const theme = useTheme();
  return (
    <View accessibilityLabel="Loading profile" style={{ paddingHorizontal: 16, paddingTop: 8 }}>
      <View style={[row, { gap: 20 }]}>
        <Bone w={84} h={84} r={42} />
        <View style={[row, { flex: 1 }]}>
          {[0, 1, 2].map((i) => <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}><Bone w={24} h={20} /><Bone w={56} h={12} /></View>)}
        </View>
      </View>
      <Bone w={144} h={20} style={{ marginTop: 16 }} />
      <Bone w={208} h={14} style={{ marginTop: 8 }} />
      <View style={[row, { marginTop: 16, gap: 8 }]}><Bone h={36} style={{ flex: 1 }} /><Bone h={36} style={{ flex: 1 }} /></View>
      <View style={{ marginHorizontal: -16, marginTop: 20, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }} />
      <PostSkeleton />
    </View>
  );
}

export function PeopleSkeleton({ n = 4 }: { n?: number }) {
  const theme = useTheme();
  return (
    <View accessibilityLabel="Loading people">
      {Array.from({ length: n }, (_, i) => (
        <View key={i} style={[row, { gap: 12, paddingVertical: 12, borderBottomWidth: i < n - 1 ? StyleSheet.hairlineWidth : 0, borderBottomColor: theme.border }]}>
          <Bone w={40} h={40} r={20} />
          <View style={{ flex: 1, gap: 8 }}><Bone w={112} h={14} /><Bone w={80} h={12} /></View>
          <Bone w={64} h={28} />
        </View>
      ))}
    </View>
  );
}

export function StatsSkeleton() {
  return (
    <View accessibilityLabel="Loading stats" style={{ gap: 20 }}>
      <Bone w={128} h={28} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 }}>
        {Array.from({ length: 6 }, (_, i) => <View key={i} style={{ width: '33.3%', gap: 6 }}><Bone w={56} h={24} /><Bone w={64} h={12} /></View>)}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 112 }}>
        {[40, 65, 30, 80, 55, 90, 45, 70].map((h, i) => <Bone key={i} h={`${h}%`} style={{ flex: 1 }} />)}
      </View>
      {[0, 1, 2].map((i) => <View key={i} style={{ gap: 6 }}><Bone w={96} h={14} /><Bone w="100%" h={8} /></View>)}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: -16, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
});
