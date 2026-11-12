import '@/global.css';

import { Platform } from 'react-native';
import { initialWindowMetrics } from 'react-native-safe-area-context';

// Spotter palette, matching the website (Tailwind zinc + lime).
export const Lime = '#84cc16';
export const LimeSoft = 'rgba(132, 204, 22, 0.18)';
export const Red = '#ef4444';

export const Colors = {
  light: {
    text: '#09090b',
    background: '#ffffff',
    backgroundElement: '#f4f4f5',
    backgroundSelected: '#e4e4e7',
    textSecondary: '#71717a',
    border: '#e4e4e7',
  },
  dark: {
    text: '#fafafa',
    background: '#09090b',
    backgroundElement: '#18181b',
    backgroundSelected: '#27272a',
    textSecondary: '#a1a1aa',
    border: '#27272a',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// Apple-style springs (damping ratio / response), as Reanimated withSpring configs. Default: no overshoot.
// Bounce only after a gesture that carried momentum (a drag release, a flick).
export const Spring = { dampingRatio: 1, duration: 350 } as const;
export const SpringBounce = { dampingRatio: 0.8, duration: 350 } as const;

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
  web: { sans: 'var(--font-display)', serif: 'var(--font-serif)', rounded: 'var(--font-rounded)', mono: 'var(--font-mono)' },
});

export const Spacing = { half: 2, one: 4, two: 8, three: 16, four: 24, five: 32, six: 64 } as const;

// room for the tab bar under floating UI; on Android the tab bar (js-tabs) also sits above the system navigation bar
export const BottomTabInset = Platform.select({ ios: 50, android: 80 + (initialWindowMetrics?.insets.bottom ?? 0), web: 72 }) ?? 0;
export const MaxContentWidth = 800;
