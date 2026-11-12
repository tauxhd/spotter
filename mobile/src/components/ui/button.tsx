// Spotter's buttons, with Apple-style press feedback: in instantly on finger-down, spring back on release, light haptic tap.
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { Lime, Spring } from '@/constants/theme';
import { geist } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

const APressable = Animated.createAnimatedComponent(Pressable);

// Wrap anything pressable in this to get the press-in / spring-back scale.
export function Press({ style, onPressIn, onPressOut, scaleTo = 0.97, haptic = true, ...rest }: PressableProps & { style?: StyleProp<ViewStyle>; scaleTo?: number; haptic?: boolean }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <APressable
      {...rest}
      style={[style, anim]}
      onPressIn={(e) => { scale.set(withTiming(scaleTo, { duration: 90 })); if (haptic) Haptics.selectionAsync().catch(() => {}); onPressIn?.(e); }}
      onPressOut={(e) => { scale.set(withSpring(1, Spring)); onPressOut?.(e); }}
    />
  );
}

export function Button({ children, variant = 'primary', style, disabled, ...rest }: Omit<PressableProps, 'children'> & { children: React.ReactNode; variant?: 'primary' | 'ghost'; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const primary = variant === 'primary';
  return (
    <Press {...rest} disabled={disabled}
      style={[styles.btn, { backgroundColor: primary ? Lime : theme.backgroundElement, opacity: disabled ? 0.4 : 1 }, style]}>
      {typeof children === 'string' ? <Text style={[styles.label, { color: primary ? '#09090b' : theme.text }]}>{children}</Text> : children}
    </Press>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: 5, paddingVertical: 11, paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 16, lineHeight: 23, ...geist(600) },
});
