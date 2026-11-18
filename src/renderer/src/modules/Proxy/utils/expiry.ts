export interface ExpiryParts {
  date: string;
  hour: number;
  minute: number;
}

export const pad2 = (n: number): string => String(n).padStart(2, '0');

export function splitExpiry(iso: string | null): ExpiryParts | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    hour: d.getHours(),
    minute: d.getMinutes(),
  };
}

export function joinExpiry(date: string, hour: number, minute: number): string {
  return new Date(`${date}T${pad2(hour)}:${pad2(minute)}:00`).toISOString();
}