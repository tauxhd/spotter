// "Share to Spotter": Hevy's Export Workout Data opens Android's share sheet; pick Spotter and the CSV lands here, then
// Settings imports it. Only loaded in the real app (expo-share-intent isn't in Expo Go).
import { router } from 'expo-router';
import { useShareIntent } from 'expo-share-intent';
import { useEffect } from 'react';

export default function ShareHandler() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  useEffect(() => {
    if (!hasShareIntent) return;
    const f = shareIntent.files?.find((x) => /csv|comma|text|excel/i.test(x.mimeType ?? '') || /\.csv$/i.test(x.fileName ?? x.path));
    if (f) router.push({ pathname: '/settings', params: { hevy: f.path } });
    resetShareIntent();
  }, [hasShareIntent, shareIntent, resetShareIntent]);
  return null;
}
