// Web preview of the tab bar (the phone uses the native one in app-tabs.tsx): a frosted bar along the bottom.
import { Image } from 'expo-image';
import type { Href } from 'expo-router';
import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View, type PressableProps } from 'react-native';

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
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <View style={StyleSheet.flatten([styles.bar, { borderTopColor: theme.border, backgroundColor: theme.background + 'a0' }])}>
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
  bar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around',
    paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth,
    // web-only style: the frosted glass material
    backdropFilter: 'blur(24px) saturate(180%)',
  },
  tab: { alignItems: 'center', gap: 2, paddingHorizontal: 12 },
  icon: { width: 28, height: 28 },
  label: { fontSize: 11, fontWeight: '600' },
});
