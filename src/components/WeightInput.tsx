"use client";
import { useState } from "react";
import { fromUnit, toUnit, type Unit } from "@/lib/units";

// A kg value shown and edited in the viewer's unit. Keeps the raw text while typing so "62." or "0.5" don't jump.
export default function WeightInput({ kg, unit, onKg, className = "num", ...rest }:
  { kg: number; unit: Unit; onKg: (kg: number) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const shown = kg ? String(Math.round(toUnit(kg, unit) * 10) / 10) : "";
  const [text, setText] = useState<string | null>(null);
  return (
    <input inputMode="decimal" {...rest} className={className} value={text ?? shown}
      onChange={(e) => { const t = e.target.value.replace(/[^\d.]/g, ""); setText(t); onKg(fromUnit(Number(t) || 0, unit)); }}
      onBlur={(e) => { setText(null); rest.onBlur?.(e); }} />
  );
}
