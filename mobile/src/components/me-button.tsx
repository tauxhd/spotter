// Your profile picture in the top-right of every page: one tap to your profile. (The website's twin: MeButton.tsx.)
import { router } from 'expo-router';

import Avatar from '@/components/avatar';
import { Press } from '@/components/ui/button';
import { useStore } from '@/lib/store';

export function MeButton({ size = 34 }: { size?: number }) {
  const { me } = useStore();
  return (
    <Press onPress={() => router.push('/me')} accessibilityLabel="Your profile" scaleTo={0.9}>
      <Avatar id={me.id} url={me.avatar_url} name={me.name} size={size} ring="rgba(132,204,22,0.4)" />
    </Press>
  );
}

export const meHeaderRight = () => <MeButton size={30} />;
