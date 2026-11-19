import fs from 'fs';
import path from 'path';
import BetterSqlite3 from 'better-sqlite3';
import { AppError } from '../utils/http';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IGNORED_FOLDERS = new Set(['Guest Profile', 'System Profile']);
const MAX_ROWS = 2000;
const MAX_TEXT_BYTES = 10 * 1024 * 1024;

type SyncStatus = 'synced' | 'unsynced' | 'error';

export interface ImportFolderRow {
  folder: string;
  email: string | null;
  sync: SyncStatus;
}

export interface ImportFolderPreview {
  valid: boolean;
  reason?: string;
  container: boolean;
  rows: ImportFolderRow[];
}

export interface ImportBackupRow {
  email: string;
  displayName: string | null;
  recoveryEmail: string | null;
  phone: string | null;
  totp: string | null;
  backupCodes: string[];
  services: number;
}

export type ImportFileResult = { kind: 'text'; text: string } | { kind: 'backup'; rows: ImportBackupRow[] };

function readJson(file: string): any {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function readEmail(prefs: any): string | null {
  const candidates = [
    prefs?.account_info?.[0]?.email,
    prefs?.signin?.allowed_username,
    prefs?.google?.services?.last_signed_in_username,
    prefs?.google?.services?.last_signed_in,
    prefs?.google?.services?.last_gaia_account?.email,
  ];
  const hit = candidates.find((v) => typeof v === 'string' && v.includes('@'));
  return hit ? String(hit).trim().toLowerCase() : null;
}

// ASSUMED: same rule as browser-folder.readSyncState, applied to the Preferences file of an arbitrary folder
function readSync(prefs: any): SyncStatus {
  const services = prefs?.google?.services;
  const signedIn = Boolean(services?.last_signed_in_username || prefs?.sync?.gaia_id);
  const enabled = services?.consented_to_sync === true && prefs?.sync?.has_setup_completed === true;
  if (!signedIn || !enabled) return 'unsynced';
  return prefs?.sync?.cached_persistent_auth_error === true ? 'error' : 'synced';
}

function findPrefs(dir: string): string | null {
  const candidates = [
    path.join(dir, 'Preferences'),
    path.join(dir, 'Default', 'Preferences'),
    path.join(dir, 'chrome', 'Default', 'Preferences'),
    path.join(dir, 'chromium', 'Default', 'Preferences'),
  ];
  return candidates.find((f) => fs.existsSync(f)) ?? null;
}

function toRow(dir: string, name: string): ImportFolderRow | null {
  const file = findPrefs(dir);
  const prefs = file ? readJson(file) : null;
  const fromName = EMAIL_RE.test(name) ? name.toLowerCase() : null;
  if (!prefs && !fromName) return null;
  return { folder: name, email: (prefs && readEmail(prefs)) || fromName, sync: prefs ? readSync(prefs) : 'unsynced' };
}

// Accepts a folder that contains profile folders, or a profile folder itself
export function previewImportFolder(root: string): ImportFolderPreview {
  const empty = { container: false, rows: [] };
  if (!root || !path.isAbsolute(root) || !fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    return { valid: false, reason: 'Folder does not exist', ...empty };
  }
  const isUserDataDir = fs.existsSync(path.join(root, 'Local State'));
  if (!isUserDataDir && fs.existsSync(path.join(root, 'Preferences'))) {
    const row = toRow(root, path.basename(root));
    return { valid: true, container: false, rows: row ? [row] : [] };
  }
  const rows: ImportFolderRow[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || IGNORED_FOLDERS.has(entry.name)) continue;
    const row = toRow(path.join(root, entry.name), entry.name);
    if (row) rows.push(row);
    if (rows.length >= MAX_ROWS) break;
  }
  if (rows.length === 0 && findPrefs(root)) {
    const row = toRow(root, path.basename(root));
    return { valid: true, container: false, rows: row ? [row] : [] };
  }
  if (rows.length === 0) return { valid: false, reason: 'No profile folders found in this folder', ...empty };
  rows.sort((a, b) => a.folder.localeCompare(b.folder, undefined, { numeric: true }));
  return { valid: true, container: true, rows };
}

function parseCodes(raw: unknown): string[] {
  try {
    const list = JSON.parse(String(raw ?? '[]'));
    if (!Array.isArray(list)) return [];
    return list
      .map((c) => (typeof c === 'string' ? c : typeof c?.code === 'string' ? c.code : ''))
      .filter(Boolean);
  } catch {
    return [];
  }
}

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);

// Source backup (<dataDir>/backup/<source>.sql, see SCHEMA.md): SQLite file with emails + service_emails; any other file is returned as text
export function readImportFile(filePath: string): ImportFileResult {
  if (!filePath || !path.isAbsolute(filePath) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new AppError('File does not exist', 400);
  }
  const fd = fs.openSync(filePath, 'r');
  const head = Buffer.alloc(15);
  try {
    fs.readSync(fd, head, 0, 15, 0);
  } finally {
    fs.closeSync(fd);
  }
  if (head.toString('latin1') !== 'SQLite format 3') {
    if (fs.statSync(filePath).size > MAX_TEXT_BYTES) throw new AppError('File is too large', 400);
    return { kind: 'text', text: fs.readFileSync(filePath, 'utf8') };
  }
  let db: BetterSqlite3.Database;
  try {
    db = new BetterSqlite3(filePath, { readonly: true, fileMustExist: true });
  } catch {
    throw new AppError('Cannot open this backup file', 400);
  }
  try {
    const tables = new Set(
      (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((r) => r.name),
    );
    if (!tables.has('emails')) throw new AppError('Not a source backup: missing the emails table', 400);
    const counts = new Map<string, number>();
    if (tables.has('service_emails')) {
      const grouped = db
        .prepare('SELECT email_id, COUNT(*) AS n FROM service_emails GROUP BY email_id')
        .all() as { email_id: string; n: number }[];
      grouped.forEach((r) => counts.set(r.email_id, r.n));
    }
    const rows = (db.prepare('SELECT * FROM emails ORDER BY email LIMIT ?').all(MAX_ROWS) as any[]).map(
      (r): ImportBackupRow => ({
        email: String(r.email ?? ''),
        displayName: text(r.display_name),
        recoveryEmail: text(r.recovery_email),
        phone: text(r.phone_number),
        totp: text(r.totp),
        backupCodes: parseCodes(r.backup_codes),
        services: counts.get(String(r.id)) ?? 0,
      }),
    );
    return { kind: 'backup', rows };
  } finally {
    db.close();
  }
}