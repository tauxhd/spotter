import { DAY, dayOf } from "@/lib/nutrition";

export type Series = { pts: { day: number; v: number }[]; color: string; dots?: boolean; line?: boolean; dashed?: boolean; step?: boolean; area?: boolean };

// Day-by-day chart over the last `days` days, values labelled on the right (the phone app has the same in trend-chart.tsx).
export default function TrendChart({ days, series, label }: { days: number; series: Series[]; label: string }) {
  const W = 340, H = 160, R = 36, B = 18, T = 8;
  const t1 = dayOf(Date.now()), t0 = t1 - days * DAY;
  const all = series.flatMap((s) => s.pts.filter((p) => p.day >= t0).map((p) => p.v));
  if (!all.length) return <p className="muted py-10 text-center text-sm">Nothing logged in the last {days} days.</p>;
  const lo = Math.min(...all), hi = Math.max(...all), pad = (hi - lo) * 0.12 || hi * 0.02 || 1;
  const y0 = lo - pad, y1 = hi + pad;
  const x = (d: number) => ((Math.max(d, t0) - t0) / (t1 - t0)) * (W - R - 4) + 2;
  const y = (v: number) => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  const ticks = [0, 1, 2, 3].map((i) => y0 + ((y1 - y0) * i) / 3);
  const dates = [0, 1, 2, 3].map((i) => t0 + ((t1 - t0) * i) / 3);
  const fmtV = (v: number) => (hi > 500 ? Math.round(v).toLocaleString("en-MY") : v.toFixed(1));
  const fmtD = (t: number) => new Date(t).toLocaleDateString("en-MY", { day: "numeric", month: "short" });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label={label}>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={0} x2={W - R} y1={y(v)} y2={y(v)} className="stroke-zinc-200 dark:stroke-zinc-800" strokeWidth={1} />
          <text x={W - R + 4} y={y(v) + 3} className="fill-zinc-500 text-[9px] tabular-nums">{fmtV(v)}</text>
        </g>
      ))}
      {dates.map((t, i) => <text key={i} x={x(t)} y={H - 4} textAnchor={i === 0 ? "start" : i === 3 ? "end" : "middle"} className="fill-zinc-500 text-[9px]">{fmtD(t)}</text>)}
      {series.map((s, si) => {
        const pts = s.pts.filter((p, i) => p.day >= t0 || (s.step && s.pts[i + 1]?.day > t0));
        if (!pts.length) return null;
        const d = s.step
          ? pts.map((p, i) => `${i ? `H${x(p.day)}V` : `M${x(p.day)},`}${y(p.v)}`).join("") + `H${x(t1)}`
          : pts.map((p, i) => `${i ? "L" : "M"}${x(p.day)},${y(p.v)}`).join("");
        return (
          <g key={si}>
            {s.area && <path d={`${d}V${H - B}H${x(pts[0].day)}Z`} fill={s.color} opacity={0.12} />}
            {s.line !== false && <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeDasharray={s.dashed ? "5 4" : undefined} />}
            {s.dots && pts.map((p) => <circle key={p.day} cx={x(p.day)} cy={y(p.v)} r={2.5} fill={s.color} />)}
          </g>
        );
      })}
    </svg>
  );
}
