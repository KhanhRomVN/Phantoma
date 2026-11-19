import fs from 'fs';
import path from 'path';
import BetterSqlite3 from 'better-sqlite3';
import { getProfileDir } from '../utils/browser-folder';
import { createLogger } from '../utils/logger';

const logger = createLogger('Vault');

// <profile dir>/service_email.sql holds only the service_emails table (email data lives in email.json)
const VAULT_DB = 'service_email.sql';
const LEGACY_VAULT_DBS = ['vault.sql', 'services.db'];
const DB_SUFFIXES = ['', '-wal', '-shm', '-journal'];

const SERVICE_EMAILS_SQL = `CREATE TABLE IF NOT EXISTS service_emails (
  id TEXT PRIMARY KEY,
  service_id TEXT,
  totps TEXT,
  backup_codes TEXT,
  auth_methods TEXT NOT NULL DEFAULT '[]',
  custom_fields TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  status_note TEXT
)`;

function hasTable(db: BetterSqlite3.Database, name: string): boolean {
  return !!db.prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?`).get(name);
}

function columnsOf(db: BetterSqlite3.Database, table: string): string[] {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name);
}

function adoptLegacyVault(dir: string): void {
  const next = path.join(dir, VAULT_DB);
  if (fs.existsSync(next)) return;
  const legacy = LEGACY_VAULT_DBS.map((n) => path.join(dir, n)).find((p) => fs.existsSync(p));
  if (!legacy) return;
  for (const suffix of DB_SUFFIXES) {
    if (fs.existsSync(legacy + suffix)) fs.renameSync(legacy + suffix, next + suffix);
  }
}

// Old vaults: drop the emails/profile mirror table, rename service_email -> service_emails, rebuild old columns
function migrateVault(db: BetterSqlite3.Database): void {
  for (const t of ['profile', 'emails']) {
    if (hasTable(db, t)) db.exec(`DROP TABLE ${t}`);
  }
  if (hasTable(db, 'service_email')) {
    if (hasTable(db, 'service_emails')) db.exec('DROP TABLE service_email');
    else db.exec('ALTER TABLE service_email RENAME TO service_emails');
  }
  if (hasTable(db, 'service_emails') && columnsOf(db, 'service_emails').includes('name')) {
    db.exec(`ALTER TABLE service_emails RENAME TO service_emails_old;
${SERVICE_EMAILS_SQL};
INSERT INTO service_emails (id, service_id, custom_fields)
  SELECT id, service_id, custom_fields FROM service_emails_old;
DROP TABLE service_emails_old;`);
  }
}

function ensureStatusColumns(db: BetterSqlite3.Database): void {
  const cols = columnsOf(db, 'service_emails');
  if (!cols.includes('status')) db.exec(`ALTER TABLE service_emails ADD COLUMN status TEXT NOT NULL DEFAULT 'active'`);
  if (!cols.includes('status_note')) db.exec('ALTER TABLE service_emails ADD COLUMN status_note TEXT');
}

function openVault(emailId: string, create: boolean): BetterSqlite3.Database | null {
  const dir = getProfileDir(emailId);
  adoptLegacyVault(dir);
  const file = path.join(dir, VAULT_DB);
  if (!create && !fs.existsSync(file)) return null;
  fs.mkdirSync(dir, { recursive: true });
  const db = new BetterSqlite3(file);
  migrateVault(db);
  db.exec(SERVICE_EMAILS_SQL);
  ensureStatusColumns(db);
  return db;
}

export function withVault<T>(
  emailId: string,
  create: boolean,
  fallback: T,
  fn: (db: BetterSqlite3.Database) => T,
): T {
  const db = openVault(emailId, create);
  if (!db) return fallback;
  try {
    return fn(db);
  } finally {
    db.close();
  }
}

export function purgeVault(emailId: string): void {
  try {
    for (const name of [VAULT_DB, ...LEGACY_VAULT_DBS]) {
      const base = path.join(getProfileDir(emailId), name);
      for (const suffix of DB_SUFFIXES) {
        if (fs.existsSync(base + suffix)) fs.unlinkSync(base + suffix);
      }
    }
  } catch (err) {
    logger.warn(`Cannot remove ${VAULT_DB} of email ${emailId}: ${err instanceof Error ? err.message : String(err)}`);
  }
}