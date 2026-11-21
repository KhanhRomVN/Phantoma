export function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d}d ago` : `${Math.floor(d / 30)}mo ago`;
}

export const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleString('en-GB', { hour12: false });

export const fmtDur = (s: number): string =>
  s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;

export const fmtClock = (s: number): string =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export const hhmm = (iso: string): string =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

export function dayLabel(iso: string): string {
  const sd = (x: Date): number => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((sd(new Date()) - sd(new Date(iso))) / 86400000);
  return diff <= 0 ? 'Today' : diff === 1 ? 'Yesterday' : `${diff} days ago`;
}