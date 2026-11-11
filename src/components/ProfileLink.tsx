"use client";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { lifters } from "@/lib/data";

// Where a person's photo / name should go: your own profile, a real student (uuid), or a demo student (u1…u10).
export function profileHref(id: string | null | undefined, meId: string) {
  if (!id) return null;
  if (id === meId) return "/me";
  return /^u\d+$/.test(id) || /^[0-9a-f-]{36}$/i.test(id) ? `/u/${id}` : null;
}

// Resolve a person from an id or (for seed data) a display name.
export const personId = (id?: string | null, name?: string) => id ?? lifters.find((l) => l.name === name)?.id ?? null;

// Wraps any photo / name so tapping it opens that person's profile. Falls back to a plain span when there's no profile.
export default function ProfileLink({ id, name, className, children }: { id?: string | null; name?: string; className?: string; children: React.ReactNode }) {
  const { me } = useStore();
  const href = profileHref(personId(id, name), me.id);
  if (!href) return <span className={className}>{children}</span>;
  return (
    <Link href={href + (typeof window !== "undefined" ? location.search : "")} className={className}
      aria-label={name ? `${name}'s profile` : undefined} onClick={(e) => e.stopPropagation()}>
      {children}
    </Link>
  );
}
