import { ACR } from '../data/constants';

export const label = (k: string): string => {
  const s = k.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(' ')
    .map((x) => ACR[x.toLowerCase()] || x.toLowerCase()).join(' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const plain = (v: unknown): string =>
  Array.isArray(v) ? (v.length ? v.join(', ') : 'None')
    : typeof v === 'boolean' ? (v ? 'Yes' : 'No')
    : v == null ? 'n/a' : String(v);

/** Màu ổn định sinh từ 4 ký tự hex đầu của hash. */
export const hue = (s: string): string => `hsl(${parseInt(s.slice(0, 4), 16) % 360} 75% var(--hl))`;

/** Tách tên + version trình duyệt từ User-Agent. */
export const parseBrowser = (ua: string): string | null => {
  const m = ua.match(/(Edg|Firefox|Chrome|Safari)\/(\d+)/);
  return m ? `${m[1] === 'Edg' ? 'Edge' : m[1]} ${m[2]}` : null;
};

export const utcOffset = (timezoneOffset?: number): string =>
  timezoneOffset != null ? `UTC${-timezoneOffset / 60 >= 0 ? '+' : ''}${-timezoneOffset / 60}` : '';