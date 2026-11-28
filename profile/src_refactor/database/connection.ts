import fs from 'fs';
import path from 'path';
import BetterSqlite3 from 'better-sqlite3';
import { getConfig } from '../config/server.config';

const SCHEMA_VERSION = 7;

const LEGACY_TABLES = [
  'browsing_entries',
  'footprints',
  'script_runs',
  'device_activities',
  'emails',
  'profiles',
  'sources',
];

const SERVICES_SQL = `CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  website_url TEXT NOT NULL DEFAULT '',
  auth_methods TEXT NOT NULL DEFAULT '[]',
  custom_fields TEXT NOT NULL DEFAULT '[]',
  category TEXT
)`;

function hasTable(sqlite: BetterSqlite3.Database, name: string): boolean {
  return !!sqlite.prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?`).get(name);
}

function columnsOf(sqlite: BetterSqlite3.Database, table: string): string[] {
  return (sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name);
}

function parseCodes(text: unknown): unknown[] {
  if (typeof text !== 'string') return [];
  try {
    const value = JSON.parse(text);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

const toIso = (ms: unknown): string => new Date(typeof ms === 'number' && ms > 0 ? ms : Date.now()).toISOString();

// v6: emails leave sqlite and live in <profilesDir>/<id>/email.json; the old email tables are dropped afterwards
function exportEmailsToJson(sqlite: BetterSqlite3.Database): void {
  const table = ['emails', 'profiles'].find((t) => hasTable(sqlite, t));
  if (table) {
    const { profilesDir } = getConfig();
    const rows = sqlite.prepare(`SELECT * FROM ${table}`).all() as Record<string, any>[];
    for (const r of rows) {
      const dir = path.join(profilesDir, String(r.id));
      const file = path.join(dir, 'email.json');
      if (fs.existsSync(file)) continue;
      fs.mkdirSync(dir, { recursive: true });
      const data = {
        email: r.email,
        display_name: r.display_name ?? '',
        avatar_hue: r.avatar_hue ?? 0,
        avatar_url: r.avatar_url ?? null,
        recovery_email: r.recovery_email ?? null,
        phone_number: r.phone ?? null,
        totp: r.totp_secret ?? null,
        backup_codes: parseCodes(r.backup_codes),
        created_at: toIso(r.created_at),
        updated_at: toIso(r.updated_at),
      };
      fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
    }
  }
  for (const t of LEGACY_TABLES) sqlite.exec(`DROP TABLE IF EXISTS ${t}`);
}

// v6: services keeps only id, name, website_url, auth_methods, custom_fields
function reshapeServices(sqlite: BetterSqlite3.Database): void {
  if (!hasTable(sqlite, 'services') || !columnsOf(sqlite, 'services').includes('url')) return;
  sqlite.exec(`ALTER TABLE services RENAME TO services_old;
${SERVICES_SQL};
INSERT INTO services (id, name, website_url, auth_methods, custom_fields)
  SELECT id, name, url, auth_methods, fields FROM services_old;
DROP TABLE services_old;`);
}

const SOURCES_SQL = `CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL
)`;

let db: BetterSqlite3.Database | null = null;
let currentPath: string | null = null;

export function init(dbPath: string): void {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  currentPath = dbPath;
  const sqlite = new BetterSqlite3(dbPath);
  sqlite.pragma('journal_mode = DELETE'); // ASSUMED: DELETE thay WAL để dữ liệu nằm thẳng trong profile.sql, không nằm ở -wal — upgrade path: quay lại WAL nếu cần hiệu năng ghi

  const row = sqlite.pragma('user_version', { simple: true }) as number;
  if (row > 0 && row < SCHEMA_VERSION) {
    sqlite.pragma('foreign_keys = OFF');
    try {
      sqlite.transaction(() => {
        exportEmailsToJson(sqlite);
        reshapeServices(sqlite);
      })();
    } finally {
      sqlite.pragma('foreign_keys = ON');
    }
  }
  if (row < SCHEMA_VERSION) {
    sqlite.exec(SERVICES_SQL);
    if (!columnsOf(sqlite, 'services').includes('category')) sqlite.exec('ALTER TABLE services ADD COLUMN category TEXT');
    sqlite.pragma(`user_version = ${SCHEMA_VERSION}`);
  }
  sqlite.pragma('foreign_keys = ON');
  sqlite.exec(SOURCES_SQL);
  sqlite.exec(`CREATE TABLE IF NOT EXISTS queries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'all',
  kind TEXT NOT NULL DEFAULT 'visual',
  conditions TEXT NOT NULL DEFAULT '[]',
  sql TEXT,
  text TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)`);
  db = sqlite;
}

export function getDb(): BetterSqlite3.Database {
  if (db && currentPath && !fs.existsSync(currentPath)) {
    try {
      db.close();
    } catch {}
    db = null;
    init(currentPath);
  }
  if (!db) throw new Error('database not initialized — call init() first');
  return db;
}

export function close(): void {
  if (db) {
    db.close();
    db = null;
  }
}