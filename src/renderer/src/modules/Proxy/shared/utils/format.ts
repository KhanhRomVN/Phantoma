import type { Proxy, Tone } from '../types/proxy-domain.types';

export function timeAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function flag(code: string): string {
  return code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

export function latencyTone(ms: number | null): Tone {
  if (ms === null) return 'muted';
  if (ms < 150) return 'success';
  if (ms < 400) return 'warn';
  return 'error';
}

export function successTone(rate: number): Tone {
  if (rate >= 95) return 'success';
  if (rate >= 80) return 'warn';
  return 'error';
}

export function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((Date.parse(iso) - Date.now()) / 86400000);
}

export function quotaPercent(p: Proxy): number | null {
  if (!p.quotaTotalGb) return null;
  return Math.min(100, Math.round((p.quotaUsedGb / p.quotaTotalGb) * 100));
}

export function buildProxyUrl(p: Proxy, reveal: boolean): string {
  const auth = p.username ? `${p.username}:${reveal ? (p.password ?? '') : '••••••'}@` : '';
  return `${p.protocol}://${auth}${p.host}:${p.port}`;
}