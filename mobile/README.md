# Spotter mobile

The native Spotter app (Expo / React Native), separate from the website in the folder above but on the **same Supabase
project**: same workouts, posts, likes and exercise library. Maths and data (1RM, PRs, strength levels, workout summary)
are imported straight from the website's `../src/lib` (alias `@shared/*`), so both apps always agree.

## Run it on your phone

1. Install **Expo Go** from the App Store / Play Store.
2. Create `mobile/.env.local`:

   ```
   EXPO_PUBLIC_SUPABASE_URL=...   # same values as the website's NEXT_PUBLIC_SUPABASE_URL
   EXPO_PUBLIC_SUPABASE_KEY=...   # and NEXT_PUBLIC_SUPABASE_KEY
   EXPO_PUBLIC_WEB_URL=...        # where the website runs, for exercise pictures (e.g. your deployed URL,
                                  # or http://<your PC's LAN IP>:3000 while developing; leave out to skip pictures)
   ```

3. From the repo root:

   ```bash
   npm --prefix mobile install
   npm --prefix mobile start
   ```

4. Scan the QR code with the camera (iOS) or Expo Go (Android). Phone and PC need to be on the same Wi-Fi.

`npm --prefix mobile run web` opens a browser preview (it uses a web tab bar in place of the native one).

## What's in it

- **Tabs:** the native system tab bar (Liquid Glass on iOS 26) with Spotter's illustrated icons.
- **Gym:** clock in with the door QR (simulated scan), time inside, live crowd with the typical-day chart, and today's best
  free hour between your classes (APU timetable via the website when `EXPO_PUBLIC_WEB_URL` is set, else the sample timetable).
- **Train:** start a routine or an empty workout, add exercises from the library (search, muscle and equipment filters,
  in a native page sheet), edit kg × reps, tick sets (lime, or amber + success haptic for a new record), remove sets or
  exercises, a rest timer after each set (−15 / +15 / skip, buzz when it's over), save as a routine, finish to save the
  workout and post it, or discard. The in-progress workout is kept on the phone until finished.
- **Eat:** calories and macros against the target, snap a meal for an AI estimate (the website's `/api/meal`), today's
  log, and the cafeteria menu by stall.
- **Ranks:** leaderboards by event with open, pound-for-pound (DOTS) and weight-class standards, podium, your rank;
  log self-reported results for non-gym events.
- **Feed:** everyone's posts, pull to refresh, like.
- First launch asks for a short profile (each phone signs in anonymously, like the website does per browser).

Motion follows Apple's fluid-interface guidance: springs (`Spring`, `SpringBounce` in `src/constants/theme.ts`),
press-in on finger-down with a spring back (`Press` in `src/components/ui/button.tsx`), and haptics on meaningful moments.

## Checks

```bash
cd mobile && npx tsc --noEmit && npx expo lint
```
