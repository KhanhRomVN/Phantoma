import { hueOf } from './color';

export function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = rng(20260613);

export const int = (a: number, b: number): number => Math.floor(rand() * (b - a + 1)) + a;
export const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
export const chance = (p: number): boolean => rand() < p;

export const NOW = Date.now();
export const ago = (h: number): string => new Date(NOW - h * 3600000).toISOString();

let seq = 0;
export const uid = (p: string): string => `${p}_${++seq}`;

export function sparkSeries(key: string, base: number, n = 24): number[] {
  const h = hueOf(key);
  return Array.from({ length: n }, (_, k) =>
    Math.max(
      1,
      Math.round(
        base * (0.55 + 0.3 * Math.sin(k * 0.55 + h) + 0.18 * Math.sin(k * 1.7 + h * 2) + k / (n * 4)),
      ),
    ),
  );
}