import { NativeTabs } from 'expo-router/native-tabs';

import { Lime } from '@/constants/theme';

// iOS: the system tab bar (Android and web use js-tabs.tsx). On iOS 26 it's Apple's Liquid Glass, translucent over the content, for free.
// Icons are Spotter's illustrated set: in colour when selected, grey otherwise (like the website's nav).
const tabs = [
  { name: 'index', label: 'Gym', icon: require('@/assets/images/tabs/gym.png'), off: require('@/assets/images/tabs/gym-off.png') },
  { name: 'train', label: 'Train', icon: require('@/assets/images/tabs/train.png'), off: require('@/assets/images/tabs/train-off.png') },
  { name: 'eat', label: 'Eat', icon: require('@/assets/images/tabs/eat.png'), off: require('@/assets/images/tabs/eat-off.png') },
  { name: 'board', label: 'Ranks', icon: require('@/assets/images/tabs/ranks.png'), off: require('@/assets/images/tabs/ranks-off.png') },
  { name: 'feed', label: 'Feed', icon: require('@/assets/images/tabs/feed.png'), off: require('@/assets/images/tabs/feed-off.png') },
] as const;

export default function AppTabs() {
  return (
    <NativeTabs tintColor={Lime} labelStyle={{ default: { color: '#a1a1aa', fontFamily: 'Geist_600SemiBold', fontSize: 11 }, selected: { color: Lime, fontFamily: 'Geist_600SemiBold', fontSize: 11 } }}>
      {tabs.map((t) => (
        <NativeTabs.Trigger key={t.name} name={t.name}>
          <NativeTabs.Trigger.Label>{t.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon src={{ default: t.off, selected: t.icon }} renderingMode="original" />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
