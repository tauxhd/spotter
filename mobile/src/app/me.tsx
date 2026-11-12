import { useLocalSearchParams } from 'expo-router';

import ProfileView from '@/components/profile-view';
import { useStore } from '@/lib/store';

export default function Me() {
  const { me } = useStore();
  const { edit } = useLocalSearchParams<{ edit?: string }>(); // /me?edit=1 opens straight into editing (Settings > Edit profile)
  return <ProfileView userId={me.id} startEditing={edit === '1'} />;
}
