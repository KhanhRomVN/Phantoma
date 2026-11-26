export function normalizeBase32(v: string): string {
  return v.replace(/\s+/g, '').toUpperCase();
}

export function isBase32(v: string): boolean {
  const n = normalizeBase32(v);
  return n.length === 0 || /^[A-Z2-7]+=*$/.test(n);
}

export function splitBackup(v: string): string[] {
  return v.split(/[\s,;|]+/).filter(Boolean);
}
