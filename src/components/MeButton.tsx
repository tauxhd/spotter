"use client";
// Your profile picture in the top-right of every page: one tap to your profile. (The phone app's twin: me-button.tsx.)
import Link from "next/link";
import Avatar from "./Avatar";
import { useStore } from "@/lib/store";

export default function MeButton({ size = 34, className = "" }: { size?: number; className?: string }) {
  const { me } = useStore();
  const q = typeof window !== "undefined" ? location.search : "";
  return (
    <Link href={`/me${q}`} aria-label="Your profile" className={`shrink-0 rounded-full transition active:scale-90 ${className}`}>
      <Avatar id={me.id} url={me.avatar_url} name={me.name} size={size} className="ring-2 ring-lime-400/40" />
    </Link>
  );
}
