"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QrCode } from "lucide-react";
import { useStore } from "@/lib/store";
import { demoNow, gym, minsOf, toMin } from "@/lib/data";

// The door QR opens this page: clock in (once per day), then land on the Gym tab.
// ponytail: static QR, so a photo of it works from anywhere; rotate a signed token on a door screen if that gets abused.
export default function CheckIn() {
  const { s, clockIn } = useStore();
  const router = useRouter();
  const ran = useRef(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const m = minsOf(demoNow());
    if (m < toMin(gym.open) || m >= toMin(gym.close)) return setClosed(true);
    const today = s.clockedIn && new Date(s.clockedIn).toDateString() === new Date().toDateString();
    (today ? Promise.resolve() : clockIn()).then(() => router.replace("/"));
  }, [s.clockedIn, clockIn, router]);

  if (closed) return (
    <div className="grid min-h-[60dvh] place-items-center text-center">
      <div>
        <p className="text-lg font-semibold">{gym.name} is closed</p>
        <p className="muted text-sm">Open {gym.open}–{gym.close} daily</p>
        <Link href="/" className="btn mt-4 inline-block">Back to Spotter</Link>
      </div>
    </div>
  );

  return (
    <div className="grid min-h-[60dvh] place-items-center text-center">
      <div>
        <QrCode size={40} className="mx-auto animate-pulse text-lime-500" />
        <p className="mt-3 font-semibold">Clocking you in…</p>
      </div>
    </div>
  );
}
