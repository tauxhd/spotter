import { NativeTabs } from 'expo-router/native-tabs';

import { Lime } from '@/constants/theme';

// The system tab bar: on iOS 26 it's Apple's Liquid Glass, translucent over the content, for free.
// Icons are Spotter's illustrated set, drawn in their own colours.
const tabs = [
  { name: 'index', label: 'Gym', icon: require('@/assets/images/tabs/gym.png') },
  { name: 'train', label: 'Train', icon: require('@/assets/images/tabs/train.png') },
  { name: 'eat', label: 'Eat', icon: require('@/assets/images/tabs/eat.png') },
  { name: 'board', label: 'Ranks', icon: require('@/assets/images/tabs/ranks.png') },
  { name: 'feed', label: 'Feed', icon: require('@/assets/images/tabs/feed.png') },
] as const;

export default function AppTabs() {
  return (
    <NativeTabs tintColor={Lime} labelStyle={{ selected: { color: Lime } }}>
      {tabs.map((t) => (
        <NativeTabs.Trigger key={t.name} name={t.name}>
          <NativeTabs.Trigger.Label>{t.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon src={t.icon} renderingMode="original" />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
