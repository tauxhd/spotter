// Pictures (exercises, muscle figures, avatars uploaded as site paths) live on the website; load them from
// EXPO_PUBLIC_WEB_URL when it's set. Full URLs (Supabase storage) pass straight through.
const WEB = process.env.EXPO_PUBLIC_WEB_URL?.replace(/\/$/, '');

export const webUrl = (p?: string | null) => (!p ? undefined : /^https?:/.test(p) ? p : WEB ? WEB + p : undefined);
