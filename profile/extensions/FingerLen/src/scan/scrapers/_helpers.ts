/**
 * Các helper function dùng chung cho tất cả scrapers.
 * QUAN TRỌNG: Các hàm này sẽ được SERIALIZE và chạy trong context của trang web,
 * nên KHÔNG được import bất kỳ module nào từ bên ngoài.
 */

export const clean = (s?: string | null): string => (s || '').replace(/\s+/g, ' ').trim();

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const q = (sel: string): Element | null => document.querySelector(sel);

/** Text hiển thị của phần tử, đã bỏ <style>/<script>/<svg> (CreepJS nhúng CSS ngay trong từng khối). */
export const plain = (el: Element | null | undefined): string => {
  if (!el) return '';
  const c = el.cloneNode(true) as Element;
  c.querySelectorAll('style, script, svg, noscript').forEach((n) => n.remove());
  return clean(c.textContent);
};

export const txt = (sel: string): string => clean(q(sel)?.textContent);

export const until = async (fn: () => boolean, ms: number, step = 250): Promise<boolean> => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { if (fn()) return true; } catch { /* DOM chưa sẵn sàng */ }
    await sleep(step);
  }
  return false;
};

export const num = (s: string): number | undefined => {
  const m = (s || '').replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : undefined;
};

export const bool = (s: string): boolean | undefined => {
  const v = clean(s);
  if (!v) return undefined;
  if (/^(✔|true|yes|enabled|supported)/i.test(v) || /✔/.test(v)) return true;
  if (/^(✖|false|no\b|disabled|unsupported|not supported)/i.test(v) || /✖/.test(v)) return false;
  return undefined;
};

export const set = (o: Record<string, any>, k: string, v: any) => {
  if (v === undefined || v === null || v === '' || (typeof v === 'number' && Number.isNaN(v))) return;
  o[k] = v;
};

/** Ô <td> kế bên td có nhãn khớp (bảng của BrowserLeaks). */
export const rowVal = (label: string): string => {
  for (const td of Array.from(document.querySelectorAll('td'))) {
    if (clean(td.textContent) === label) return clean(td.nextElementSibling?.textContent);
  }
  return '';
};