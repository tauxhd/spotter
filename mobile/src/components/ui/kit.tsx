// Spotter's look, ported from the website: illustrated icons, titles with an icon, flat full-width sections split by a
// hairline (the website's `.card`), illustrated empty states, and the breathing-logo splash with a lime sweep.
import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Lime } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { icon as iconSrc, img } from '@/lib/web';

export function Icon({ name, size = 24, style }: { name: string; size?: number; style?: object }) {
  const src = iconSrc(name);
  return src ? <Image source={src} style={[{ width: size, height: size }, style]} contentFit="contain" /> : <View style={{ width: size, height: size }} />;
}

// Page title with its illustrated icon, like the website's headers.
export function Title({ icon, children, sub }: { icon?: string; children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {icon && <Icon name={icon} size={34} />}
        <ThemedText style={styles.title}>{children}</ThemedText>
      </View>
      {sub ? <ThemedText type="small" themeColor="textSecondary">{sub}</ThemedText> : null}
    </View>
  );
}

// The website's `.card`: full width, padded, with a hairline under it. Use inside a page with 16px side padding.
export function Section({ children, style, last }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; last?: boolean }) {
  const theme = useTheme();
  return <View style={[styles.section, { borderBottomColor: last ? 'transparent' : theme.border }, style]}>{children}</View>;
}

// Heading inside a page: bold, with an optional small illustrated icon.
export function H2({ icon, children, right }: { icon?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {icon && <Icon name={icon} size={28} />}
      <ThemedText type="smallBold" style={{ fontSize: 16, flex: 1 }}>{children}</ThemedText>
      {right}
    </View>
  );
}

export type EmptyArt = 'workouts' | 'followers' | 'comments' | 'routines' | 'exercises' | 'search' | 'podium' | 'not-found' | 'stats';
export function EmptyState({ art, title, text, size = 120, children }: { art: EmptyArt; title: string; text?: string; size?: number; children?: React.ReactNode }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 28 }}>
      <Image source={img(`/empty/${art}.webp`)} style={{ width: size, height: size }} contentFit="contain" />
      <ThemedText type="smallBold" style={{ marginTop: 12, fontSize: 16 }}>{title}</ThemedText>
      {text ? <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center', maxWidth: 280, marginTop: 2 }}>{text}</ThemedText> : null}
      {children}
    </View>
  );
}

// Thin bar with a lime segment sweeping across: inline loading.
export function Loader({ width = 112 }: { width?: number }) {
  const theme = useTheme();
  const x = useSharedValue(-0.4);
  useEffect(() => { x.set(withRepeat(withTiming(1.25, { duration: 1100, easing: Easing.bezier(0.45, 0, 0.55, 1) }), -1)); }, [x]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * width }] }));
  return (
    <View style={{ width, height: 2, borderRadius: 1, overflow: 'hidden', backgroundColor: theme.backgroundSelected }}>
      <Animated.View style={[{ width: width * 0.4, height: 2, backgroundColor: Lime }, anim]} />
    </View>
  );
}

// First load: the logo breathes while the bar sweeps under it.
export function Splash() {
  const theme = useTheme();
  const s = useSharedValue(1);
  useEffect(() => { s.set(withRepeat(withSequence(withTiming(1.05, { duration: 800 }), withTiming(1, { duration: 800 })), -1)); }, [s]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }]}>
      <Animated.View style={anim}><Image source={img('/icon-512.png')} style={{ width: 88, height: 88, borderRadius: 20 }} /></Animated.View>
      <ThemedText type="smallBold" style={{ marginTop: 16, letterSpacing: 4, color: Lime }}>SPOTTER</ThemedText>
      <View style={{ marginTop: 20 }}><Loader /></View>
    </View>
  );
}

// Shimmering placeholder block for skeleton screens.
export function Bone({ w, h, r = 6, style }: { w: number | `${number}%`; h: number; r?: number; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const o = useSharedValue(0.5);
  useEffect(() => { o.set(withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0.5, { duration: 700 })), -1)); }, [o]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width: w, height: h, borderRadius: r, backgroundColor: theme.backgroundSelected }, anim, style]} />;
}

const styles = StyleSheet.create({
  title: { fontSize: 26, lineHeight: 32, fontWeight: '700', letterSpacing: -0.5 },
  section: { marginHorizontal: -16, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
});
