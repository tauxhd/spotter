// The shared data names colours as Tailwind classes ("text-amber-500", "border-l-sky-500"); this turns them into hex.
import { setTypes, supersetColor, type SetType } from '@shared/data';

const P500: Record<string, string> = {
  lime: '#84cc16', sky: '#0ea5e9', violet: '#8b5cf6', amber: '#f59e0b', pink: '#ec4899', teal: '#14b8a6', red: '#ef4444', orange: '#f97316',
};
export const hexOf = (cls: string) => P500[cls.match(/-(lime|sky|violet|amber|pink|teal|red|orange)-\d{3}/)?.[1] ?? 'lime'];
export const setTypeColor = (t?: SetType) => (t ? hexOf(setTypes[t].color) : undefined);
export const supersetHex = (i: number) => hexOf(supersetColor(i).bar);
