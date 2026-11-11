"use client";
import { useEffect, useState } from "react";
import { demoNow } from "./data";

// null until mounted (demoNow honours ?t=HH:MM): all time-based UI renders client-side only (server may be in UTC).
export function useNow(everyMs = 30_000) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(demoNow());
    const id = setInterval(() => setNow(demoNow()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}

export type Class = { code: string; name: string; start: string; end: string; room: string };

// Today's classes from the APU timetable feed. null = no intake set (UI falls back to the sample timetable).
export function useClasses(intake: string | null, date: Date | null) {
  const day = date?.toLocaleDateString("en-CA");
  const [res, setRes] = useState<{ key: string; known: boolean; classes: Class[] } | null>(null);
  useEffect(() => {
    if (!intake || !day) return;
    fetch(`/api/timetable?intake=${encodeURIComponent(intake)}&date=${day}`)
      .then((r) => r.json())
      .then((d) => setRes({ key: intake + day, known: !!d.known, classes: d.classes ?? [] }))
      .catch(() => setRes({ key: intake + day, known: false, classes: [] }));
  }, [intake, day]);
  if (!intake) return null;
  return res?.key === intake + day ? res : undefined; // undefined = loading
}
