/**
 * ------------------------------------------------------------------
 * Timezone Utilities
 * ------------------------------------------------------------------
 */

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
