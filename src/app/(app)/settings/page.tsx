"use client";
// Settings (from the gear on your profile): your account, quick links, and log out. The app's twin: mobile/src/app/settings.tsx.
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Lock, LogOut } from "lucide-react";
import Avatar from "@/components/Avatar";
import Icon, { type IconName } from "@/components/Icon";
import { useStore } from "@/lib/store";
import HevyImport from "@/components/HevyImport";

export default function Settings() {
  const router = useRouter();
  const { me, signOut, demo, updateProfile } = useStore();
  const [busy, setBusy] = useState(false);
  const q = typeof window !== "undefined" ? location.search : "";

  async function logOut() {
    if (!confirm(demo ? "Leave the demo and create your own account?" : "Log out of Spotter on this device?\n\nSign back in any time with your TP number and password.")) return;
    setBusy(true);
    await signOut();
  }

  const rows: [IconName, string, string][] = [["edit", "Edit profile", `/me/edit${q}`], ["target", "Nutrition plan", `/eat/plan${q}`], ["stats", "Gym stats", `/u/${me.id}/stats${q}`]];
  return (
    <div>
      <header className="-mx-4 grid grid-cols-[2.5rem_1fr_2.5rem] items-center px-4 pb-2">
        <button onClick={() => router.back()} aria-label="Back" className="grid h-9 w-9 place-items-center"><ArrowLeft size={20} /></button>
        <h1 className="text-center text-base font-semibold">Settings</h1>
        <span />
      </header>

      <section className="card flex items-center gap-4">
        <Avatar id={me.id} url={me.avatar_url} name={me.name} size={56} className="ring-2 ring-lime-400/40" />
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{me.name}</p>
          <p className="muted text-sm">{me.tp && <span className="font-semibold tabular-nums">{me.tp} · </span>}{me.course || me.faculty}</p>
        </div>
      </section>

      <ul className="-mx-4 border-b border-zinc-200 dark:border-zinc-800/80">
        {rows.map(([icon, label, href]) => (
          <li key={label}>
            <Link href={href} className="flex items-center gap-3 px-4 py-3 transition active:bg-zinc-100 dark:active:bg-zinc-900">
              <Icon name={icon} size={26} /><span className="flex-1 font-medium">{label}</span><ChevronRight size={18} className="muted" />
            </Link>
          </li>
        ))}
      </ul>

      {/* Private account: posts set to Everyone only reach friends (mutual follows); enforced in the database (can_see_post) */}
      <label className="-mx-4 flex cursor-pointer items-center gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800/80">
        <span className="grid h-[26px] w-[26px] place-items-center"><Lock size={20} className="text-lime-500" /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">Private account</span>
          <span className="muted block text-xs">Only friends (people you follow who follow you back) see your workouts.</span>
        </span>
        <input type="checkbox" role="switch" checked={!!me.private} onChange={(e) => updateProfile({ private: e.target.checked }).catch(() => alert("Couldn't save that. Check your connection."))} className="peer sr-only" />
        <span aria-hidden className="relative h-7 w-12 shrink-0 rounded-full bg-zinc-300 transition peer-checked:bg-lime-500 peer-focus-visible:ring-2 peer-focus-visible:ring-lime-500 dark:bg-zinc-700 after:absolute after:left-0.5 after:top-0.5 after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
      </label>

      <HevyImport />

      <button onClick={logOut} disabled={busy}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 py-3 font-semibold text-red-600 transition active:scale-[0.98] disabled:opacity-50 dark:text-red-400">
        <LogOut size={18} />{busy ? "Logging out…" : demo ? "Create my own account" : "Log out"}
      </button>
    </div>
  );
}
