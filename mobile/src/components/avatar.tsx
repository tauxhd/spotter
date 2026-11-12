import { Image } from 'expo-image';

import { img } from '@/lib/web';

// Same as the website: uploaded photo if there is one; demo lifters (u1…u10) use their portrait; everyone else gets one of
// 8 generated default avatars, picked from their id so it never changes.
export function avatarSrc(id?: string | null, url?: string | null) {
  if (url) return url;
  if (id && /^u\d+$/.test(id)) return `/avatars/${id}.webp`;
  const n = [...(id ?? '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return `/avatars/default-${(n % 8) + 1}.webp`;
}

export default function Avatar({ id, url, size = 40, ring }: { id?: string | null; url?: string | null; name?: string; size?: number; ring?: string }) {
  return <Image source={img(avatarSrc(id, url))} contentFit="cover"
    style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#27272a', ...(ring ? { borderWidth: 2, borderColor: ring } : {}) }} />;
}
