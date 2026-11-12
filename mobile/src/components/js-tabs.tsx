// The website-style tab bar, drawn in JS: every label showing, full-colour icon when selected, grey otherwise, lime label.
// Used on web and Android (app-tabs.web.tsx / app-tabs.android.tsx); iOS keeps the native Liquid Glass bar (app-tabs.tsx),
// because Android's native bar can't show the icons in their own colours.
import { Image } from 'expo-image';
import type { Href } from 'expo-router';
import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps, type TabSlotProps } from 'expo-router/ui';
import { Screen } from 'react-native-screens';
import { Platform, Pressable, StyleSheet, Text, View, type PressableProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Lime } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const tabs = [
  { name: 'index', href: '/', label: 'Gym', icon: require('@/assets/images/tabs/gym.png'), off: require('@/assets/images/tabs/gym-off.png') },
  { name: 'train', href: '/train', label: 'Train', icon: require('@/assets/images/tabs/train.png'), off: require('@/assets/images/tabs/train-off.png') },
  { name: 'eat', href: '/eat', label: 'Eat', icon: require('@/assets/images/tabs/eat.png'), off: require('@/assets/images/tabs/eat-off.png') },
  { name: 'board', href: '/board', label: 'Ranks', icon: require('@/assets/images/tabs/ranks.png'), off: require('@/assets/images/tabs/ranks-off.png') },
  { name: 'feed', href: '/feed', label: 'Feed', icon: require('@/assets/images/tabs/feed.png'), off: require('@/assets/images/tabs/feed-off.png') },
] as const;

export default function AppTabs() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} renderFn={frozenWhenHidden} />
      <TabList asChild>
        <View style={StyleSheet.flatten([styles.bar, { borderTopColor: theme.border, backgroundColor: Platform.OS === 'web' ? theme.background + 'a0' : theme.background, paddingBottom: 8 + insets.bottom }])}>
          {tabs.map((t) => (
            <TabTrigger key={t.name} name={t.name} href={t.href as Href} asChild>
              <TabButton icon={t.icon} off={t.off}>{t.label}</TabButton>
            </TabTrigger>
          ))}
        </View>
      </TabList>
    </Tabs>
  );
}

// Like expo-router's default tab slot, but hidden tabs are frozen: they don't re-render on every store change (a food log,
// a like, the workout timer) while you're on another tab, which keeps the visible one smooth. They catch up when shown.
const frozenWhenHidden: NonNullable<TabSlotProps['renderFn']> = (descriptor, { isFocused, loaded, detachInactiveScreens }) => {
  if (!loaded && !isFocused) return null; // lazy: never-visited tabs aren't built yet
  return (
    <Screen key={descriptor.route.key} enabled={detachInactiveScreens} activityState={isFocused ? 2 : 0} freezeOnBlur
      style={[styles.screen, isFocused ? styles.focused : styles.unfocused]}>
      {descriptor.render()}
    </Screen>
  );
};

function TabButton({ children, isFocused, icon, off, ...props }: TabTriggerSlotProps & { icon: number; off: number }) {
  const theme = useTheme();
  return (
    <Pressable {...(props as PressableProps)} style={({ pressed }) => StyleSheet.flatten([styles.tab, pressed && { transform: [{ scale: 0.94 }] }])}>
      <Image source={isFocused ? icon : off} style={[styles.icon, isFocused && { transform: [{ scale: 1.1 }] }]} />
      <Text style={[styles.label, { color: isFocused ? Lime : theme.textSecondary }]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, position: 'relative', height: '100%' },
  focused: { zIndex: 1, display: 'flex', flexShrink: 0, flexGrow: 1 },
  unfocused: { zIndex: -1, display: 'none', flexShrink: 1, flexGrow: 0 },
  bar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around',
    paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth,
    // the frosted glass material (web only; Android draws the bar near-solid)
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(24px) saturate(180%)' } : {}),
  },
  tab: { alignItems: 'center', gap: 2, paddingHorizontal: 12 },
  icon: { width: 28, height: 28 },
  label: { fontSize: 11, fontFamily: 'Geist_600SemiBold' },
});
