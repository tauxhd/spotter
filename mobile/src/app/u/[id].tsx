import { Stack, useLocalSearchParams } from 'expo-router';

import ProfileView from '@/components/profile-view';

export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <><Stack.Screen options={{ title: 'Profile' }} /><ProfileView userId={id} /></>;
}
