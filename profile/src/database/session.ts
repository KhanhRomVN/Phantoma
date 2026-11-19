import fs from 'fs';
import path from 'path';
import BetterSqlite3 from 'better-sqlite3';
import { getProfileDir } from '../utils/browser-folder';
import { createLogger } from '../utils/logger';

const logger = createLogger('SessionDb');

// <profile dir>/session.sql holds only the sessions table: one row per browser run (chrome or chromium)
const SESSION_DB = 'session.sql';
const DB_SUFFIXES = ['', '-wal', '-shm', '-journal'];

// started_at / ended_at: unix ms (UTC); ended_at NULL = browser still running
// ip / footprint: JSON objects (see SCHEMA.md)
const SESSIONS_SQL = `CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  browser TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  ip TEXT,
  footprint TEXT
)`;

function openSessionDb(emailId: string, create: boolean): BetterSqlite3.Database | null {
  const dir = getProfileDir(emailId);
  const file = path.join(dir, SESSION_DB);
  if (!create && !fs.existsSync(file)) return null;
  fs.mkdirSync(dir, { recursive: true });
  const db = new BetterSqlite3(file);
  db.exec(SESSIONS_SQL);
  const cols = db.prepare('PRAGMA table_info(sessions)').all() as { name: string }[];
  if (!cols.some((c) => c.name === 'sites')) db.exec('ALTER TABLE sessions ADD COLUMN sites TEXT');
  return db;
}

export function withSessionDb<T>(
  emailId: string,
  create: boolean,
  fallback: T,
  fn: (db: BetterSqlite3.Database) => T,
): T {
  const db = openSessionDb(emailId, create);
  if (!db) return fallback;
  try {
    return fn(db);
  } finally {
    db.close();
  }
}

export function purgeSessionDb(emailId: string): void {
  try {
    const base = path.join(getProfileDir(emailId), SESSION_DB);
    for (const suffix of DB_SUFFIXES) {
      if (fs.existsSync(base + suffix)) fs.unlinkSync(base + suffix);
    }
  } catch (err) {
    logger.warn(`Cannot remove ${SESSION_DB} of email ${emailId}: ${err instanceof Error ? err.message : String(err)}`);
  }
}