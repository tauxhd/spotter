// Pull down on any tab to reload it: posts, your own workouts / meals / weights, and pages that fetch their own data
// (they watch s.rev). Pass the result as a ScrollView's refreshControl.
import { useState } from 'react';
import { RefreshControl } from 'react-native';

import { Lime } from '@/constants/theme';
import { useStore } from '@/lib/store';

export function usePullRefresh() {
  const { refresh } = useStore();
  const [busy, setBusy] = useState(false);
  const onRefresh = async () => { setBusy(true); try { await refresh(); } finally { setBusy(false); } };
  return <RefreshControl refreshing={busy} onRefresh={onRefresh} tintColor={Lime} colors={[Lime]} progressBackgroundColor="#18181b" />;
}
