/** Id màu dùng chung cho các UI Recon. Trong file .recon chỉ cần ghi id, vd. {color=orange}. */
export type ColorId =
  | 'blue'
  | 'purple'
  | 'green'
  | 'orange'
  | 'yellow'
  | 'pink'
  | 'cyan'
  | 'red'
  | 'gray';

export const COLOR_MAP: Record<ColorId, string> = {
  blue: '#3686ff',
  purple: '#a855f7',
  green: '#22c55e',
  orange: '#f97316',
  yellow: '#eab308',
  pink: '#ec4899',
  cyan: '#06b6d4',
  red: '#f87171',
  gray: '#9ca3af',
};

/** Trả về mã hex theo id màu; id không hợp lệ hoặc rỗng trả về undefined. */
export function resolveColor(id?: string): string | undefined {
  if (!id) return undefined;
  return COLOR_MAP[id.toLowerCase() as ColorId];
}