import type { DuplicateEntry, DuplicateKind } from '../types/account-import.types';

export function summarizeCredential(raw: string | null | undefined): string {
  if (!raw) return '\u2014';
  try {
    const obj = JSON.parse(raw);
    const key = obj.accessToken || obj.access_token || obj.token || obj.cookie;
    if (key) {
      const s = String(key);
      return s.length > 32 ? `${s.slice(0, 12)}\u2026${s.slice(-8)}` : s;
    }
    const first = Object.keys(obj)[0];
    if (first) {
      const s = String(obj[first]);
      return `${first}: ${s.length > 24 ? s.slice(0, 12) + '\u2026' : s}`;
    }
    return raw.length > 32 ? `${raw.slice(0, 12)}\u2026${raw.slice(-8)}` : raw;
  } catch {
    return raw.length > 32 ? `${raw.slice(0, 12)}\u2026${raw.slice(-8)}` : raw;
  }
}

/** JSON.stringify ổn định: sắp xếp key để thứ tự key không ảnh hưởng kết quả so sánh. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function credentialsDiffer(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const normalize = (v: string | null | undefined) => {
    if (!v) return null;
    try { return stableStringify(JSON.parse(v)); }
    catch { return v; }
  };
  return normalize(a) !== normalize(b);
}

export function getKind(entry: DuplicateEntry): DuplicateKind {
  if (entry.kind) return entry.kind;
  if (!entry.existing) return 'new';
  return credentialsDiffer(entry.existing.credential, entry.incoming.credential)
    ? 'changed'
    : 'identical';
}
