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
- **Train:** start a routine, edit kg × reps, tick sets (lime, or amber + success haptic for a new record), add sets, finish
  to save the workout and post it, or discard. The in-progress workout is kept on the phone until finished.
- **Feed:** everyone's posts, pull to refresh, like.
- **Gym, Eat, Ranks:** placeholders, still on the website.
- First launch asks for a short profile (each phone signs in anonymously, like the website does per browser).

Motion follows Apple's fluid-interface guidance: springs (`Spring`, `SpringBounce` in `src/constants/theme.ts`),
press-in on finger-down with a spring back (`Press` in `src/components/ui/button.tsx`), and haptics on meaningful moments.

## Checks

```bash
cd mobile && npx tsc --noEmit && npx expo lint
```
