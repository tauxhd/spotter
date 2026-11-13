"use client";
// "Put Spotter on your home screen". iPhones can't run Spotter in Expo Go and don't let a page install itself, so on an
// iPhone this shows Safari's steps (Share > Add to Home Screen); browsers that can install (Android Chrome) get a real
// Install button. Opens when you arrive with ?install (the landing page's "Open on iPhone") or on a first visit on an
// iPhone; never when already installed, inside the landing page's demo phone, or after "Not now".
import { useEffect, useState } from "react";
import Image from "next/image";
import { Share, SquarePlus, X } from "lucide-react";

type Prompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const SEEN = "spotter:installSeen";

export default function InstallSheet() {
  const [mode, setMode] = useState<"ios" | "prompt" | null>(null);
  const [ask, setAsk] = useState<Prompt | null>(null);

  useEffect(() => {
    const installed = matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    if (installed || self !== top) return;
    const wanted = new URLSearchParams(location.search).has("install");
    let seen = false;
    try { seen = !!localStorage.getItem(SEEN); } catch {}
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (ios && (wanted || !seen)) setMode("ios");
    const onPrompt = (e: Event) => { e.preventDefault(); setAsk(e as Prompt); if (wanted || !seen) setMode("prompt"); };
    addEventListener("beforeinstallprompt", onPrompt);
    return () => removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const close = () => { setMode(null); try { localStorage.setItem(SEEN, "1"); } catch {} };
  if (!mode) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={close} role="dialog" aria-modal aria-label="Install Spotter">
      <div className="anim-slide-up w-full max-w-md rounded-t-3xl bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] dark:bg-zinc-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <Image src="/icon-192.png" alt="" width={56} height={56} className="rounded-2xl" />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold">Put Spotter on your home screen</h2>
            <p className="muted text-sm">It opens full screen like an app, with its own icon.</p>
          </div>
          <button onClick={close} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center"><X size={20} /></button>
        </div>

        {mode === "ios" ? (
          <ol className="mt-5 space-y-3 text-[15px]">
            <li className="flex items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lime-500 font-bold text-zinc-950">1</span>
              <span>Tap <b>Share</b> <Share size={18} className="mx-0.5 inline -translate-y-0.5 text-sky-500" /> in Safari&apos;s toolbar</span></li>
            <li className="flex items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lime-500 font-bold text-zinc-950">2</span>
              <span>Scroll down and tap <b>Add to Home Screen</b> <SquarePlus size={18} className="mx-0.5 inline -translate-y-0.5" /></span></li>
            <li className="flex items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lime-500 font-bold text-zinc-950">3</span>
              <span>Tap <b>Add</b>, then open Spotter from your home screen</span></li>
          </ol>
        ) : (
          <button onClick={async () => { await ask?.prompt(); close(); }} className="btn mt-5 w-full py-3 text-base font-bold">Install Spotter</button>
        )}

        <button onClick={close} className="muted mt-4 w-full text-center text-sm font-semibold">Not now</button>
        {mode === "ios" && <p className="muted mt-3 text-center text-xs">In Chrome on iPhone, the Share button is at the top, next to the address.</p>}
      </div>
    </div>
  );
}
