/**
 * ------------------------------------------------------------------
 * Time Block Utility (Phantoma)
 * ------------------------------------------------------------------
 * Kiểm tra giờ UTC có nằm trong khung giờ bị cấm DeepSeek không.
 *
 * Ranges KHÔNG hardcode nữa — lấy từ provider config trả về qua
 * `/v1/providers` (field `blocked_time_ranges`). Khi đổi
 * deepseek.constant.ts phía AIWeb2API, Phantoma tự sync không cần sửa thêm.
 *
 * Fallback: nếu chưa load được provider, dùng DEFAULT_BLOCKED_RANGES
 * để tránh bỏ sót chặn khi app vừa khởi động.
 * ------------------------------------------------------------------
 */

export type BlockedTimeRange = { startTime: number; endTime: number };

const DEFAULT_BLOCKED_RANGES: BlockedTimeRange[] = [
  { startTime: 3, endTime: 4 },
  { startTime: 19, endTime: 21 },
];

export function getCurrentUTCHour(): number {
  return new Date().getUTCHours();
}

function utcHourToLocalDate(utcHour: number): Date {
  const now = new Date();
  const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(base + utcHour * 3_600_000);
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function fmtDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

function buildRangeLabel(range: BlockedTimeRange): string {
  const startDate = utcHourToLocalDate(range.startTime);
  const endDate = utcHourToLocalDate(range.endTime);

  const startTime = fmtTime(startDate);
  const endTime = fmtTime(endDate);

  const startDay =
    startDate.getFullYear() * 10000 + startDate.getMonth() * 100 + startDate.getDate();
  const endDay = endDate.getFullYear() * 10000 + endDate.getMonth() * 100 + endDate.getDate();

  if (startDay === endDay) {
    return `${startTime}–${endTime}`;
  }

  const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000);
  if (diffDays === 1) {
    return `${startTime}–${endTime} (next day)`;
  }

  return `${startTime} ${fmtDate(startDate)}–${endTime} ${fmtDate(endDate)}`;
}

export function isBlockedNow(ranges: BlockedTimeRange[] | null | undefined): boolean {
  const r = ranges ?? DEFAULT_BLOCKED_RANGES;
  const hour = getCurrentUTCHour();
  return r.some((range) => hour >= range.startTime && hour < range.endTime);
}

export function getBlockedRangeLabel(
  ranges: BlockedTimeRange[] | null | undefined,
): string | null {
  const r = ranges ?? DEFAULT_BLOCKED_RANGES;
  const hour = getCurrentUTCHour();
  const range = r.find((range) => hour >= range.startTime && hour < range.endTime);
  return range ? buildRangeLabel(range) : null;
}

export function getBlockedHoursDescription(
  ranges: BlockedTimeRange[] | null | undefined,
): string {
  const r = ranges ?? DEFAULT_BLOCKED_RANGES;
  return r.map(buildRangeLabel).join(' and ');
}

export function isDeepSeekProvider(providerId: string | undefined | null): boolean {
  if (!providerId) return false;
  return providerId.toLowerCase().includes('deepseek');
}