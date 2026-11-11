// Pictures: the website's artwork is bundled into the app (src/lib/art.ts, from scripts/sync-art.js), so it shows offline.
// Anything else (Supabase-hosted avatars, post photos) loads from its full URL. API calls go to EXPO_PUBLIC_WEB_URL.
import type { ImageSource } from 'expo-image';

import { art } from './art';

export const WEB = process.env.EXPO_PUBLIC_WEB_URL?.replace(/\/$/, '');

// Image source for a website path ("/icons/gym.webp") or a full URL; undefined if there's nothing to show.
export function img(p?: string | null): ImageSource | number | undefined {
  if (!p) return undefined;
  if (art[p]) return art[p];
  if (/^https?:/.test(p)) return { uri: p };
  return WEB ? { uri: WEB + p } : undefined;
}
export const icon = (name: string) => img(`/icons/${name}.webp`);

// kept for code that needs a URL string
export const webUrl = (p?: string | null) => (!p ? undefined : /^https?:/.test(p) ? p : WEB ? WEB + p : undefined);
