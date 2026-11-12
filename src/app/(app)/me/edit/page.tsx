"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Camera } from "lucide-react";
import Avatar from "@/components/Avatar";
import Onboarding from "@/components/Onboarding";
import { useStore } from "@/lib/store";

export default function Me() {
  const { me, saveProfile, setAvatar } = useStore();
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  async function pick(file?: File) {
    if (!file) return;
    setUploading(true);
    setErr("");
    try { await setAvatar(file); } catch (x) { setErr((x as Error).message); }
    setUploading(false);
  }
  const router = useRouter();
  const { id: _, ...initial } = me; // eslint-disable-line @typescript-eslint/no-unused-vars
  const back = "/me" + (typeof window !== "undefined" ? location.search : "");

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <Link href={back} aria-label="Back" className="grid h-9 w-9 place-items-center rounded-xl bg-white ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"><ArrowLeft size={18} /></Link>
        <h1 className="h-title">Edit profile</h1>
      </header>
      <div className="flex flex-col items-center gap-2">
        <label className="relative cursor-pointer">
          <Avatar id={me.id} url={me.avatar_url} name={me.name} size={96} className={`ring-4 ring-lime-400/30 ${uploading ? "animate-pulse" : ""}`} />
          <span className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full bg-lime-500 text-zinc-950 ring-4 ring-zinc-100 dark:ring-zinc-950"><Camera size={16} /></span>
          <input type="file" accept="image/*" className="sr-only" aria-label="Change profile photo" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
        <p className="muted text-xs">{uploading ? "Uploading…" : "Tap to change your photo"}</p>
        {err && <p className="text-xs text-red-600">{err}</p>}
      </div>
      <Onboarding initial={{ ...initial, bw: Number(me.bw), squat: Number(me.squat), bench: Number(me.bench), deadlift: Number(me.deadlift) }}
        onSave={async (p) => { await saveProfile(p); router.push(back); }} />
    </div>
  );
}
