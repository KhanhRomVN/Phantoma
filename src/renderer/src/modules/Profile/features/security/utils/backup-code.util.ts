import type { Tone } from '../../../shared/types/ui.types';
import { splitBackup } from './secret.util';

export interface BackupItem {
  code: string;
  used: boolean;
}

export const BACKUP_TONES: Tone[] = ['primary', 'info', 'success', 'warn', 'error'];

export function backupTone(left: number): Tone {
  return left >= 5 ? 'success' : left >= 3 ? 'warn' : 'error';
}

// ASSUMED: backup codes are stored as one string; a leading "~" marks a code as used
export function parseBackup(value: string): BackupItem[] {
  return splitBackup(value).map((raw) =>
    raw.startsWith('~') ? { code: raw.slice(1), used: true } : { code: raw, used: false },
  );
}

export function serializeBackup(items: BackupItem[]): string {
  return items.map((i) => (i.used ? '~' : '') + i.code).join('\n');
}

const NUMBERED_MARK = /(?:^|\s)(\d{1,3})[.)]\s+/g;

// ASSUMED: numbered lists ("1. 8083 7422", possibly several columns per line) are sorted by their index and inner spaces are dropped, because stored codes are whitespace-separated
export function parseCodeText(text: string): string[] {
  const marks = Array.from(text.matchAll(NUMBERED_MARK));
  if (marks.length >= 2) {
    const rows = marks
      .map((m, i) => {
        const start = (m.index ?? 0) + m[0].length;
        const end = i + 1 < marks.length ? (marks[i + 1].index ?? text.length) : text.length;
        return { n: Number(m[1]), code: text.slice(start, end).replace(/\s+/g, '') };
      })
      .filter((r) => r.code);
    if (rows.length >= 2) return rows.sort((a, b) => a.n - b.n).map((r) => r.code);
  }
  return text.split(/[\s,;]+/).filter(Boolean);
}

export async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
