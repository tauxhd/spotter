import Image from "next/image";

// Uploaded photo if there is one; demo lifters (u1…u10) use their generated portrait;
// everyone else gets one of 8 generated default avatars, picked from their id so it never changes.
export function avatarSrc(id: string, url?: string | null) {
  if (url) return url;
  if (/^u\d+$/.test(id)) return `/avatars/${id}.webp`;
  const n = [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return `/avatars/default-${(n % 8) + 1}.webp`;
}

export default function Avatar({ id, url, name, size = 40, className = "" }: { id: string; url?: string | null; name: string; size?: number; className?: string }) {
  return <Image src={avatarSrc(id, url)} alt={name} width={size} height={size} className={`shrink-0 rounded-full bg-zinc-800 object-cover ${className}`} style={{ width: size, height: size }} />;
}
