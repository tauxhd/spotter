// Sync from Hevy: POST { key } with the user's Hevy API key (hevy.com > Settings > Developer, Hevy Pro). Fetches every
// workout from Hevy's public API and returns them; the app converts and saves them to the user's own account.
// The key is used for this request only and never stored here.
const API = "https://api.hevyapp.com/v1/workouts";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type" };
const MAX_PAGES = 300; // 3,000 workouts

export const OPTIONS = () => new Response(null, { status: 204, headers: CORS });

export async function POST(req: Request) {
  const { key } = await req.json().catch(() => ({ key: "" }));
  if (typeof key !== "string" || !/^[\w-]{10,100}$/.test(key.trim())) return Response.json({ error: "That doesn't look like a Hevy API key" }, { status: 400, headers: CORS });
  const page = async (n: number) => {
    const r = await fetch(`${API}?page=${n}&pageSize=10`, { headers: { "api-key": key.trim(), accept: "application/json" }, cache: "no-store" });
    if (r.status === 401 || r.status === 403) throw Object.assign(new Error("Hevy didn't accept that API key. Check it in Hevy: Settings > Developer (needs Hevy Pro)."), { status: 401 });
    if (r.status === 404 && n > 1) return { page_count: n - 1, workouts: [] };
    if (!r.ok) throw Object.assign(new Error(`Hevy's API answered ${r.status}. Try again in a minute.`), { status: 502 });
    return (await r.json()) as { page_count: number; workouts: unknown[] };
  };
  try {
    const first = await page(1);
    const pages = Math.min(MAX_PAGES, first.page_count || 1);
    const workouts = [...first.workouts];
    for (let n = 2; n <= pages; n += 5) { // five pages at a time, gently
      const batch = await Promise.all(Array.from({ length: Math.min(5, pages - n + 1) }, (_, k) => page(n + k)));
      for (const b of batch) workouts.push(...b.workouts);
    }
    return Response.json({ workouts }, { headers: CORS });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: (e as { status?: number }).status ?? 502, headers: CORS });
  }
}
