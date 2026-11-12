"use client";
// The ad video, as a web page: the landing page's hero animation (components/HeroScroll) driven by a clock instead of
// the scroll, played to music. Drop an audio file anywhere (or pick one) and the animation stretches to the song.
// Space plays / pauses, ← → skip a second, H hides the controls (or ?clean for recording).
// CUES map seconds to the hero's progress; until we tune them to the song's beats they spread evenly over its length.
import { useCallback, useEffect, useRef, useState } from "react";

import HeroScroll, { HERO } from "@/components/HeroScroll";

/** [second, progress] pairs, eased linearly between; null = spread the hero evenly over the song */
const CUES: [number, number][] | null = null;

function evenCues(len: number): [number, number][] {
  return [[0, 0], [len, HERO.total]];
}
function progressAt(t: number, cues: [number, number][]) {
  if (t <= cues[0][0]) return cues[0][1];
  for (let i = 0; i + 1 < cues.length; i++) {
    const [t0, p0] = cues[i], [t1, p1] = cues[i + 1];
    if (t <= t1) return p0 + ((p1 - p0) * (t - t0)) / (t1 - t0);
  }
  return cues[cues.length - 1][1];
}
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function Video() {
  const audio = useRef<HTMLAudioElement>(null);
  const [song, setSong] = useState<{ url: string; name: string } | null>(null);
  const [len, setLen] = useState(60); // the song's length, or 60 s with no song
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ui, setUi] = useState(true);
  const clock = useRef({ start: 0, from: 0 });

  useEffect(() => { if (new URLSearchParams(location.search).has("clean")) setUi(false); }, []);

  // the clock: the song's own time when there is one, else wall time
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    clock.current = { start: performance.now(), from: t };
    const tick = () => {
      const a = audio.current;
      const now = song && a ? a.currentTime : clock.current.from + (performance.now() - clock.current.start) / 1000;
      if (now >= len) { setT(len); setPlaying(false); return; }
      setT(now);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps

  const play = useCallback((on: boolean) => {
    const a = audio.current;
    if (on && t >= len) { setT(0); if (a) a.currentTime = 0; }
    if (song && a) { if (on) void a.play(); else a.pause(); }
    setPlaying(on);
  }, [song, t, len]);
  const seek = useCallback((s: number) => {
    const v = Math.min(len, Math.max(0, s));
    setT(v);
    clock.current = { start: performance.now(), from: v };
    if (audio.current && song) audio.current.currentTime = v;
  }, [len, song]);

  const load = (f?: File | null) => {
    if (!f || !f.type.startsWith("audio")) return;
    if (song) URL.revokeObjectURL(song.url);
    setSong({ url: URL.createObjectURL(f), name: f.name });
    setPlaying(false); setT(0);
  };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); play(!playing); }
      else if (e.key === "ArrowRight") seek(t + 1);
      else if (e.key === "ArrowLeft") seek(t - 1);
      else if (e.key.toLowerCase() === "h") setUi((v) => !v);
    };
    const over = (e: DragEvent) => e.preventDefault();
    const drop = (e: DragEvent) => { e.preventDefault(); load(e.dataTransfer?.files[0]); };
    addEventListener("keydown", key); addEventListener("dragover", over); addEventListener("drop", drop);
    return () => { removeEventListener("keydown", key); removeEventListener("dragover", over); removeEventListener("drop", drop); };
  });

  const cues = CUES ?? evenCues(len);
  return (
    <div className="relative h-dvh overflow-hidden bg-zinc-950 text-zinc-100 [color-scheme:dark]">
      <HeroScroll apk="#" progress={progressAt(t, cues)} video />
      {song && <audio ref={audio} src={song.url} preload="auto" onLoadedMetadata={(e) => setLen(e.currentTarget.duration)} onEnded={() => setPlaying(false)} />}

      {ui && (
        <div className="fixed inset-x-0 bottom-0 z-[60] flex items-center gap-3 bg-zinc-950/80 px-4 py-3 text-sm backdrop-blur">
          <button onClick={() => play(!playing)} className="w-20 rounded-lg bg-lime-400 py-1.5 font-semibold text-zinc-950">{playing ? "Pause" : "Play"}</button>
          <span className="w-24 tabular-nums text-zinc-400">{mmss(t)} / {mmss(len)}</span>
          <input type="range" min={0} max={len} step={0.01} value={t} onChange={(e) => seek(Number(e.target.value))} className="flex-1 accent-lime-400" aria-label="Position" />
          <label className="cursor-pointer rounded-lg bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/15">
            {song ? `♪ ${song.name.length > 24 ? song.name.slice(0, 22) + "…" : song.name}` : "Choose a song"}
            <input type="file" accept="audio/*" className="hidden" onChange={(e) => load(e.target.files?.[0])} />
          </label>
          <span className="hidden text-xs text-zinc-500 lg:block">Space · ← → · H hides this · drop a song anywhere</span>
        </div>
      )}
    </div>
  );
}
