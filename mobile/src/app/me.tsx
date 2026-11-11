import ProfileView from '@/components/profile-view';
import { useStore } from '@/lib/store';

export default function Me() {
  const { me } = useStore();
  return <ProfileView userId={me.id} />;
}
