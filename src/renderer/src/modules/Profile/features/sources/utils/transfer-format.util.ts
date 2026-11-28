const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

export const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  const i = Math.min(UNITS.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  const v = n / 1024 ** i;
  return `${v >= 100 || i === 0 ? v.toFixed(0) : v.toFixed(1)} ${UNITS[i]}`;
}

export function formatDuration(sec: number | null): string {
  if (sec === null || !Number.isFinite(sec) || sec < 0) return '-';
  const s = Math.round(sec);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m ${s % 60}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

export const hsl = (color: string, alpha = 1): string => `hsl(${color} / ${alpha})`;
