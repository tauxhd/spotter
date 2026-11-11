// Today's classes for an APU intake, from APU's public weekly timetable feed (the one APSpace uses).
// GET /api/timetable?intake=APD2F2602CS&date=2026-11-11

const FEED = "https://s3-ap-southeast-1.amazonaws.com/open-ws/weektimetable";
type Row = { INTAKE: string; MODID: string; MODULE_NAME: string; ROOM: string; DATESTAMP_ISO: string; TIME_FROM_ISO: string; TIME_TO_ISO: string };

// ponytail: whole feed (~30k rows) cached in memory for an hour; fine on one server, use a KV store if it runs on many
let cache: { at: number; rows: Row[] } | null = null;

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const intake = (q.get("intake") ?? "").trim().toUpperCase();
  const date = q.get("date") ?? new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  if (!/^[A-Z0-9()]{4,30}$/.test(intake) || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return Response.json({ error: "Bad intake code or date" }, { status: 400 });

  if (!cache || Date.now() - cache.at > 36e5) {
    const r = await fetch(FEED, { cache: "no-store" });
    if (!r.ok) return Response.json({ error: "APU timetable is unavailable right now" }, { status: 502 });
    cache = { at: Date.now(), rows: await r.json() };
  }

  const mine = cache.rows.filter((r) => r.INTAKE.toUpperCase() === intake);
  const seen = new Set<string>();
  const classes = mine
    .filter((r) => r.DATESTAMP_ISO === date)
    .map((r) => ({ code: r.MODID.split("-")[0], name: r.MODULE_NAME, start: r.TIME_FROM_ISO.slice(11, 16), end: r.TIME_TO_ISO.slice(11, 16), room: r.ROOM }))
    .filter((c) => !seen.has(c.start + c.end + c.name) && seen.add(c.start + c.end + c.name))
    .sort((a, b) => a.start.localeCompare(b.start));

  return Response.json({ known: mine.length > 0, classes }, { headers: { "Cache-Control": "public, max-age=300" } });
}
