import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import DemoFrame from "@/components/DemoFrame";
import DemoFullscreen from "@/components/DemoFullscreen";
import HeroScroll from "@/components/HeroScroll";

// The landing page: what Spotter is, a live demo of the web app in a phone frame (a made-up account, /?demo=1, nothing is
// saved), and the Android download. Outside the (app) group, so it has no store, sign-in or bottom nav.

export const metadata: Metadata = {
  title: "Spotter · the APU gym, in your pocket",
  description: "Clock in with a QR, log every set, track macros from the APU cafeteria, climb the ranks and find any machine on a 3D map of the SweatZone.",
};

// The Android build, attached to the repo's latest GitHub release (set NEXT_PUBLIC_APK_URL to host it elsewhere).
const EXPO_GO = "exp://u.expo.dev/9f32282c-cb97-4413-b5ec-7d76a546e49a?channel-name=main&runtime-version=exposdk:58.0.0";
const APK = process.env.NEXT_PUBLIC_APK_URL ?? "https://github.com/tauxhd/spotter/releases/latest/download/spotter.apk";

const features: [icon: string, title: string, text: string][] = [
  ["qr", "Clock in with a scan", "Skip the ID check at the counter: scan the QR at the door and you're in."],
  ["crowd", "Know how busy it is", "Live headcount and the quietest hour to train around your classes."],
  ["plate", "Log every set", "Routines, supersets, rest timers, PRs and a 3D body showing what you worked."],
  ["eat", "Eat smart on campus", "Macros for every dish in the APU cafeteria, tuned to your goal."],
  ["ranks", "Climb the ranks", "Leaderboards by lift, faculty and bodyweight class. Heaviest lift wins, not reps."],
  ["map", "Find any machine", "A 3D map of the SweatZone. Every exercise points to the machine you need."],
];

export default function Welcome() {
  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 [color-scheme:dark]">
      <nav className="sticky top-0 z-10 border-b border-white/5 bg-zinc-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Image src="/icon-192.png" alt="" width={32} height={32} className="rounded-lg" />
          <span className="text-lg font-bold tracking-tight">Spotter</span>
          <div className="ml-auto flex items-center gap-1 text-sm sm:gap-4">
            <a href="#features" className="hidden px-2 py-1 text-zinc-400 hover:text-white sm:block">Features</a>
            <a href="#demo" className="px-2 py-1 text-zinc-400 hover:text-white">Demo</a>
            <a href={APK} className="rounded-lg bg-lime-400 px-3 py-1.5 font-semibold text-zinc-950 transition active:scale-[0.97]">Get the app</a>
          </div>
        </div>
      </nav>

      <HeroScroll apk={APK} />

      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Everything between the door and your last set</h2>
        <div className="mt-14 grid gap-x-12 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(([icon, title, text]) => (
            <div key={title}>
              <Image src={`/icons/${icon}.webp`} alt="" width={56} height={56} className="h-14 w-14 object-contain" />
              <h3 className="mt-5 text-xl font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 max-w-xs text-zinc-400">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="demo" className="scroll-mt-16 border-t border-white/5 bg-gradient-to-b from-lime-400/[0.06] to-transparent">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-[auto_1fr] md:gap-16">
          {/* the real web app, signed in to a demo account with made-up data */}
          <div className="mx-auto w-[min(390px,calc(100vw-2rem),calc((100dvh-10rem)*0.462))]">
            <p className="mb-4 flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-lime-400">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-lime-400" /></span>
              Live demo · tap around
            </p>
            <div className="relative aspect-[390/844] rounded-[3.2rem] bg-zinc-800 p-[10px] shadow-2xl shadow-lime-400/10 ring-1 ring-white/15">
              <div className="absolute -left-[3px] top-28 h-8 w-[3px] rounded-l bg-zinc-700" aria-hidden />
              <div className="absolute -left-[3px] top-40 h-14 w-[3px] rounded-l bg-zinc-700" aria-hidden />
              <div className="absolute -right-[3px] top-36 h-20 w-[3px] rounded-r bg-zinc-700" aria-hidden />
              <div className="relative h-full overflow-hidden rounded-[2.6rem] bg-zinc-950">
                <div className="pointer-events-none absolute left-1/2 top-2.5 z-10 h-7 w-24 -translate-x-1/2 rounded-full bg-black" aria-hidden />
                <DemoFrame src="/?demo=1&t=18:00" />
              </div>
            </div>
            <DemoFullscreen src="/?demo=1&t=18:00&full=1" />
          </div>

          <div>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Take it for a spin</h2>
            <p className="mt-4 max-w-md text-lg text-zinc-300">
              <span className="font-semibold text-lime-400"><span className="hidden md:inline">← </span>The phone is live.</span> It&apos;s the real app, signed in to a demo student with eight weeks of training. Log a workout, add a meal, check the ranks or find a machine on the 3D map. Nothing you do here is saved; to make your own account, open Me, then Settings, then Create my own account.
            </p>

          </div>
        </div>
        <div className="mx-auto grid max-w-6xl gap-14 px-4 pb-20 md:grid-cols-2 md:gap-16">
          <div id="download" className="scroll-mt-20">
            <h3 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">Try it yourself on Android<Info text="Your own account, your own data, plus clock-in with your camera and haptics." /></h3>
            <a href={APK} className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-lime-400 px-5 py-3 font-semibold text-zinc-950 transition active:scale-[0.97]">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden><path d="M17.6 9.48l1.84-3.18a.38.38 0 0 0-.66-.38l-1.86 3.22a11.4 11.4 0 0 0-9.84 0L5.22 5.92a.38.38 0 1 0-.66.38L6.4 9.48A10.8 10.8 0 0 0 1 18h22a10.8 10.8 0 0 0-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" /></svg>
              Download the APK
            </a>
            {/* ponytail: hand-kept; update with each release (Actions > Android APK) */}
            <Facts rows={[["Size", "78 MB"], ["Version", "1.0.13"], ["Requires", "Android 7.0 or newer"], ["Works on", "64-bit phones (almost every phone since 2017)"], ["Price", "Free, no ads"]]} />

            <p className="mt-3 text-sm text-zinc-400">Download not starting? <a href="/download" download="spotter.apk" className="font-medium text-lime-400 underline underline-offset-4">Get it straight from this site</a></p>
            <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-zinc-400">
              <li>Open the downloaded file on your phone.</li>
              <li>Allow installs from your browser if Android asks.</li>
              <li>Open Spotter and start the quest.</li>
            </ol>
          </div>
          <div id="expo" className="scroll-mt-20">
            {/* Expo Go: the same app, loaded from EAS Update (channel "main" always serves the newest publish) */}
            <h3 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">Or open in Expo Go (Android)<Info text="No install file, on any network. iPhones can't open other people's projects in Expo Go: use the web app instead." /></h3>
            <div className="mt-5 flex items-center gap-5">
              <Image src="/expo-go-qr.svg" alt="QR code that opens Spotter in Expo Go" width={128} height={128} className="h-32 w-32 shrink-0 rounded-lg" unoptimized />
              <ol className="list-decimal space-y-1 pl-5 text-sm text-zinc-400">
                <li>Get Expo Go from the <a href="https://play.google.com/store/apps/details?id=host.exp.exponent" className="text-lime-400 underline underline-offset-4">Play Store</a>.</li>
                <li>Open Expo Go and scan the code.</li>
                <li>On your phone already? <a href={EXPO_GO} className="text-lime-400 underline underline-offset-4">Open in Expo Go</a></li>
              </ol>
            </div>
            <Facts rows={[["Needs", "Expo Go app (free)"], ["Android", "7.0 or newer"], ["iPhone", "Not supported: use the web app"], ["Internet", "Needed to open it"], ["Updates", "Always the newest version, automatically"], ["Missing", "Home-screen icon; it opens inside Expo Go"]]} />
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 px-4 py-8 text-center text-sm text-zinc-500">
        Spotter · made for APU students · <Link href="/?app=1" className="hover:text-zinc-300">Open the web app</Link>
      </footer>
    </div>
  );
}

// A small (i) that shows its text on hover, or on tap (focus) on a phone.
function Info({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <button type="button" aria-label={text} className="grid h-6 w-6 place-items-center rounded-full text-zinc-500 transition hover:text-zinc-200 focus:text-zinc-200 focus:outline-none">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
      </button>
      <span role="tooltip" className="pointer-events-none absolute left-0 top-full z-10 mt-2 w-64 rounded-lg bg-zinc-800 p-3 text-sm font-normal leading-snug tracking-normal text-zinc-200 opacity-0 shadow-xl transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">{text}</span>
    </span>
  );
}

function Facts({ rows }: { rows: [string, string][] }) {
  return (
    <table className="mt-4 w-full text-sm">
      <tbody className="divide-y divide-white/10">
        {rows.map(([k, v]) => (
          <tr key={k}><th scope="row" className="py-2 pr-4 text-left font-medium text-zinc-500">{k}</th><td className="py-2 text-right text-zinc-200">{v}</td></tr>
        ))}
      </tbody>
    </table>
  );
}
