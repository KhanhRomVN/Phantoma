import { SRC_ACCENT, TONES } from '../constants/theme';
import type { SourceType } from '../types/monitor.types';

export const c = (name: string, a = 1): string => `rgba(var(--${name}),${a})`;

export const tc = (tone: string, a = 1): string => c(TONES[tone] || 'ts', a);

export const acc = (s: SourceType, a = 1): string => `rgba(${SRC_ACCENT[s]},${a})`;

export const confTone = (v: number): string => (v >= 75 ? 'success' : v >= 55 ? 'info' : 'warn');

export const hueOf = (s: string): number =>
  Array.from(s).reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 360, 7);