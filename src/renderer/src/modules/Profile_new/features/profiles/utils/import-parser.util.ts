import type { ImportBackupRow, ImportFolderRow } from '../../../shared/types';
import { EMAIL_RE, estimateStrength, splitCodes } from '../../../shared/components/FormBits';
import {
  ImportRowDraft,
  RowStatus,
  Column,
  RawRow,
  PreviewRow,
} from '../components/modals/ImportProfilesModal/import-profiles.types';
import { COLUMN_ORDER, ALIASES } from '../components/modals/ImportProfilesModal/import-profiles.constants';

const normalize = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export const baseName = (p: string): string => p.split(/[\\/]/).filter(Boolean).pop() ?? p;

function detectDelimiter(line: string): string {
  const candidates = [',', ';', '\t', '|'];
  return candidates
    .map((d) => ({ d, n: line.split(d).length }))
    .sort((a, b) => b.n - a.n)[0].d;
}

function splitLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = false;
      } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) {
      out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function buildDraft(get: (c: Column) => string): ImportRowDraft {
  const email = get('email');
  const password = get('password');
  return {
    email,
    displayName: get('displayName') || email.split('@')[0],
    password,
    passwordStrength: estimateStrength(password),
    recoveryEmail: get('recoveryEmail'),
    phone: get('phone'),
    totpSecret: get('totpSecret').replace(/\s+/g, '').toUpperCase(),
    backupCodes: splitCodes(get('backupCodes')),
    group: get('group') || 'Imported',
    purpose: 'Imported',
    notes: '',
  };
}

export function parseTable(text: string): RawRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
  if (lines.length === 0) return [];
  const delim = detectDelimiter(lines[0]);
  const first = splitLine(lines[0], delim);
  const headerless = first[0].includes('@');
  const map: (Column | null)[] = headerless
    ? COLUMN_ORDER
    : first.map((h) => {
        const n = normalize(h);
        return (Object.keys(ALIASES) as Column[]).find((c) => ALIASES[c].includes(n)) ?? null;
      });
  const body = headerless ? lines : lines.slice(1);
  return body.map((line, i) => {
    const cells = splitLine(line, delim);
    const draft = buildDraft((c) => {
      const idx = map.indexOf(c);
      return idx >= 0 ? (cells[idx] ?? '') : '';
    });
    return { key: `row-${i}`, draft, detail: draft.totpSecret ? '2FA' : 'No 2FA' };
  });
}

export function folderRaws(items: ImportFolderRow[]): RawRow[] {
  return items.map((r, i) => ({
    key: `dir-${i}`,
    draft: buildDraft((c) => (c === 'email' ? (r.email ?? '') : '')),
    folder: r.folder,
    sync: r.sync,
    invalid: r.email ? null : 'No email found',
  }));
}

export function backupRaws(items: ImportBackupRow[]): RawRow[] {
  return items.map((r, i) => {
    const values: Partial<Record<Column, string>> = {
      email: r.email,
      displayName: r.displayName ?? '',
      recoveryEmail: r.recoveryEmail ?? '',
      phone: r.phone ?? '',
      totpSecret: r.totp ?? '',
      backupCodes: r.backupCodes.join(' '),
    };
    return {
      key: `bk-${i}`,
      draft: buildDraft((c) => values[c] ?? ''),
      detail: `${r.services} service${r.services === 1 ? '' : 's'}${r.totp ? ' - 2FA' : ''}`,
    };
  });
}

export function annotate(raws: RawRow[], existing: string[]): PreviewRow[] {
  const existingSet = new Set(existing.map((e) => e.toLowerCase()));
  const seen = new Set<string>();
  return raws.map((r) => {
    const email = r.draft.email.trim();
    const key = email.toLowerCase();
    let status: RowStatus = 'new';
    let reason: string | null = null;
    if (r.invalid) {
      status = 'invalid';
      reason = r.invalid;
    } else if (!EMAIL_RE.test(email)) {
      status = 'invalid';
      reason = 'Invalid email';
    } else if (existingSet.has(key)) {
      status = 'duplicate';
      reason = 'Already exists';
    } else if (seen.has(key)) {
      status = 'duplicate';
      reason = 'Repeated in this list';
    } else {
      seen.add(key);
    }
    const nextFolder = status !== 'invalid' && r.folder !== undefined ? key : null;
    return { ...r, status, reason, nextFolder };
  });
}
