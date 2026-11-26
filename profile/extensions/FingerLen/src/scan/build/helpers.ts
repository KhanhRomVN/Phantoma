import type { RawPages } from '../../types';

export type G = Record<string, any>;
/** Lấy dữ liệu thô 1 trang (id → object, rỗng nếu trang lỗi/chưa quét). */
export type Pages = (id: string) => G;

export const pagesOf = (raw: RawPages): Pages => (id) => raw[id] || {};

/** Chỉ gán khi có giá trị thật — không bịa dữ liệu thiếu. */
export const put = (o: G, k: string, v: unknown): void => {
  if (v === undefined || v === null || v === '') return;
  if (typeof v === 'number' && Number.isNaN(v)) return;
  o[k] = v;
};

export const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** "Yes/Detected/Leak…" → true, "No/None/Safe…" → false, còn lại → undefined (không đoán). */
export const flag = (s?: string): boolean | undefined => {
  const v = (s || '').trim();
  if (!v) return undefined;
  if (/^(yes|true|detected|leak|found|high|bot)/i.test(v)) return true;
  if (/^(no\b|false|none|not|safe|normal|pass|clean|low|human)/i.test(v)) return false;
  return undefined;
};

/** Số đầu tiên trong chuỗi ("10.0 GB" → 10). */
export const toNum = (s: unknown): number | undefined => {
  const m = String(s ?? '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : undefined;
};

export const ipTokens = (s?: string): string[] =>
  (s || '').match(/\b\d{1,3}(?:\.\d{1,3}){3}\b|\b[0-9a-f-]{36}\.local\b|\b[0-9a-f:]{6,}\b/gi) || [];

export const short = (h?: string) => (h || '').slice(0, 8) || undefined;

/** Lấy group 1 của regex đầu tiên khớp, hoặc undefined. */
export const grab = (text: unknown, re: RegExp): string | undefined =>
  (typeof text === 'string' ? text.match(re)?.[1] : undefined);

/** So sánh 2 IANA timezone, bỏ qua alias (Asia/Saigon ≡ Asia/Ho_Chi_Minh). */
export const sameTimezone = (a: string, b: string): boolean => {
  const canon = (z: string) => {
    try { return new Intl.DateTimeFormat('en-US', { timeZone: z }).resolvedOptions().timeZone; } catch { return z; }
  };
  return a === b || canon(a) === canon(b);
};
