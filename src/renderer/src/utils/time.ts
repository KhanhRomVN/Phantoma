/**
 * ------------------------------------------------------------------
 * Time Utilities
 * ------------------------------------------------------------------
 * Tiện ích thời gian dùng chung: thời gian tương đối và xử lý múi giờ.
 *
 * Main functions:
 * - formatRelativeTime()  : "5 minutes ago" từ timestamp
 * - getUserTimezone()     : Lấy timezone của người dùng
 * - formatInUserTimezone(): Format Date theo timezone người dùng
 * - parseIsoSafe()        : Parse chuỗi ISO/SQL datetime an toàn
 * - computeNextResetVN()  : Thời điểm reset quota kế tiếp (UTC+7)
 * ------------------------------------------------------------------
 */

export function formatRelativeTime(
  ts: number | null | undefined,
  now: number = Date.now(),
): string | null {
  if (ts == null || !Number.isFinite(ts)) return null;
  const diff = now - ts;
  if (diff < 0) return 'just now';

  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min !== 1 ? 's' : ''} ago`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr !== 1 ? 's' : ''} ago`;

  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} day${day !== 1 ? 's' : ''} ago`;

  const mon = Math.floor(day / 30);
  if (mon < 12) return `${mon} month${mon !== 1 ? 's' : ''} ago`;

  const yr = Math.floor(mon / 12);
  return `${yr} year${yr !== 1 ? 's' : ''} ago`;
}
export function getUserTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) return tz;
  } catch {
    // Fallback
  }
  const offsetMin = -new Date().getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  const h = String(Math.floor(abs / 60)).padStart(2, '0');
  const m = String(abs % 60).padStart(2, '0');
  return `UTC${sign}${h}:${m}`;
}

export function formatInUserTimezone(date: Date, fallback?: string): string {
  if (isNaN(date.getTime())) return fallback ?? 'Invalid date';
  try {
    const tz = getUserTimezone();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
    return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
  } catch {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  }
}

export function parseIsoSafe(raw: string): Date {
  if (!raw) return new Date(NaN);
  if (raw.includes('T')) return new Date(raw);
  return new Date(raw.replace(' ', 'T') + 'Z');
}

export function computeNextResetVN(period: 'day' | 'week' | 'month' = 'day'): Date {
  const TZ_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7
  const now = new Date();
  const localDate = new Date(now.getTime() + TZ_OFFSET_MS);

  if (period === 'day') {
    return new Date(
      Date.UTC(
        localDate.getUTCFullYear(),
        localDate.getUTCMonth(),
        localDate.getUTCDate() + 1,
        0, 0, 0, 0,
      ) - TZ_OFFSET_MS,
    );
  }
  if (period === 'week') {
    const dow = localDate.getUTCDay(); // 0=Sun
    const daysUntilMonday = dow === 0 ? 1 : 8 - dow;
    return new Date(
      Date.UTC(
        localDate.getUTCFullYear(),
        localDate.getUTCMonth(),
        localDate.getUTCDate() + daysUntilMonday,
        0, 0, 0, 0,
      ) - TZ_OFFSET_MS,
    );
  }
  return new Date(
    Date.UTC(
      localDate.getUTCFullYear(),
      localDate.getUTCMonth() + 1,
      1, 0, 0, 0, 0,
    ) - TZ_OFFSET_MS,
  );
}
