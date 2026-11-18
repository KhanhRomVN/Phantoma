import fs from 'fs';
import path from 'path';
import BetterSqlite3 from 'better-sqlite3';
import { getConfig } from '../config/server.config';
import type { EmailFile, Row } from '../domain/mappers';
import { createLogger } from '../utils/logger';

const logger = createLogger('Backup');

// <dataDir>/backup/<sourceName>.sql: write-only mirror of emails + service_emails of every email in that source (reads still use email.json / service_email.sql)
const BACKUP_DIR = 'backup';
const DB_SUFFIXES = ['', '-wal', '-shm', '-journal'];

const SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS emails (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_hue INTEGER,
  avatar_url TEXT,
  recovery_email TEXT,
  phone_number TEXT,
  totp TEXT,
  backup_codes TEXT NOT NULL DEFAULT '[]',
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS service_emails (
  id TEXT PRIMARY KEY,
  email_id TEXT NOT NULL,
  service_id TEXT,
  totps TEXT,
  backup_codes TEXT,
  auth_methods TEXT NOT NULL DEFAULT '[]',
  custom_fields TEXT
);
CREATE INDEX IF NOT EXISTS idx_service_emails_email_id ON service_emails (email_id)`;

function fileOf(sourceName: string): string {
  const safe = sourceName.trim().replace(/[\\/:*?"<>|]/g, '-') || 'source';
  return path.join(getConfig().dataDir, BACKUP_DIR, `${safe}.sql`);
}

// A failed backup must never break the main write, so every entry point only logs
function guarded(action: string, fn: () => void): void {
  try {
    fn();
  } catch (err) {
    logger.warn(`Backup ${action} failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function withBackup(sourceName: string, create: boolean, fn: (db: BetterSqlite3.Database) => void): void {
  const file = fileOf(sourceName);
  if (!create && !fs.existsSync(file)) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new BetterSqlite3(file);
  try {
    db.exec(SCHEMA_SQL);
    fn(db);
  } finally {
    db.close();
  }
}

export function writeEmailBackup(sourceName: string, emailId: string, data: EmailFile, services: Row[]): void {
  guarded(`write ${emailId}`, () =>
    withBackup(sourceName, true, (db) => {
      db.transaction(() => {
        db.prepare(
          `INSERT OR REPLACE INTO emails (id, email, display_name, avatar_hue, avatar_url, recovery_email, phone_number, totp, backup_codes, created_at, updated_at)
           VALUES (@id, @email, @display_name, @avatar_hue, @avatar_url, @recovery_email, @phone_number, @totp, @backup_codes, @created_at, @updated_at)`,
        ).run({
          id: emailId,
          email: data.email,
          display_name: data.display_name ?? null,
          avatar_hue: data.avatar_hue ?? null,
          avatar_url: data.avatar_url ?? null,
          recovery_email: data.recovery_email ?? null,
          phone_number: data.phone_number ?? null,
          totp: data.totp ?? null,
          backup_codes: JSON.stringify(data.backup_codes ?? []),
          created_at: data.created_at ?? null,
          updated_at: data.updated_at ?? null,
        });
        db.prepare('DELETE FROM service_emails WHERE email_id = ?').run(emailId);
        const insert = db.prepare(
          `INSERT OR REPLACE INTO service_emails (id, email_id, service_id, totps, backup_codes, auth_methods, custom_fields)
           VALUES (@id, @email_id, @service_id, @totps, @backup_codes, @auth_methods, @custom_fields)`,
        );
        for (const r of services) {
          insert.run({
            id: r.id,
            email_id: emailId,
            service_id: r.service_id ?? null,
            totps: r.totps ?? null,
            backup_codes: r.backup_codes ?? null,
            auth_methods: r.auth_methods ?? '[]',
            custom_fields: r.custom_fields ?? null,
          });
        }
      })();
    }),
  );
}

export function deleteEmailBackup(sourceName: string, emailId: string): void {
  guarded(`delete ${emailId}`, () =>
    withBackup(sourceName, false, (db) => {
      db.transaction(() => {
        db.prepare('DELETE FROM service_emails WHERE email_id = ?').run(emailId);
        db.prepare('DELETE FROM emails WHERE id = ?').run(emailId);
      })();
    }),
  );
}

export function renameSourceBackup(oldName: string, newName: string): void {
  guarded(`rename ${oldName} -> ${newName}`, () => {
    const from = fileOf(oldName);
    const to = fileOf(newName);
    if (from === to || !fs.existsSync(from)) return;
    fs.mkdirSync(path.dirname(to), { recursive: true });
    for (const suffix of DB_SUFFIXES) fs.rmSync(to + suffix, { force: true });
    for (const suffix of DB_SUFFIXES) {
      if (fs.existsSync(from + suffix)) fs.renameSync(from + suffix, to + suffix);
    }
  });
}

export function pruneSourceBackup(sourceName: string, keepIds: string[]): void {
  guarded(`prune ${sourceName}`, () =>
    withBackup(sourceName, false, (db) => {
      const keep = new Set(keepIds);
      const stale = (db.prepare('SELECT id FROM emails').all() as { id: string }[]).map((r) => r.id).filter((id) => !keep.has(id));
      db.transaction(() => {
        for (const id of stale) {
          db.prepare('DELETE FROM service_emails WHERE email_id = ?').run(id);
          db.prepare('DELETE FROM emails WHERE id = ?').run(id);
        }
      })();
    }),
  );
}

export function deleteSourceBackup(sourceName: string): void {
  guarded(`delete source ${sourceName}`, () => {
    const base = fileOf(sourceName);
    for (const suffix of DB_SUFFIXES) fs.rmSync(base + suffix, { force: true });
  });
}