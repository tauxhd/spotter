# Spotter

The APU SweatZone gym, connected. Built for the APU Cloud Innovation Hackathon 2026 (Smart Campus track).

- **Clock in/out** by scanning the door QR, instead of the ID check at the counter. Gives the gym a live head count.
- **Live crowd + best time to train**: picks the quietest free hour between *your* classes, using APU's public timetable feed (enter your intake code).
- **Train**: log sets, rest timer, PR detection, equipment location on the gym map.
- **Eat**: macro targets, APU cafeteria foods, meal photo → macros with Gemini.
- **Feed**: finished workouts are shared live (with an optional video or photo, swipe for the workout); likes and comments update in real time.
- **Exercise library**: ~100 exercises by muscle group, each with an illustrated demo image (`supabase/exercises.json` → `exercises` table, images in `public/exercises`).
- **Ranks**: 13 events (powerlifting, strength, calisthenics, athletics), ranked open, pound for pound, or by IPF weight class.

## Stack

Next.js 15 (App Router) · Tailwind v4 · Supabase (Postgres, Row Level Security, anonymous auth, Realtime) · Gemini.

## Run it

```bash
npm install
npm run dev
```

`.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_KEY=<publishable key>
GEMINI_API_KEY=<optional, from Google AI Studio>
```

New Supabase project: run `supabase/schema.sql` then `supabase/exercises.sql` in the SQL editor, then turn on
**Authentication → Sign In / Providers → Allow anonymous sign-ins**.

Add `?t=17:30` to any URL to demo the app at a different time of day.

Print `/poster` and stick it on the gym door: scanning its QR opens `/checkin`, which clocks the student in.

## Tests

```bash
npm test
```
