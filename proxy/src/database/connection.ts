import fs from 'fs';
import path from 'path';
import BetterSqlite3 from 'better-sqlite3';

const SCHEMA_VERSION = 7; // v7 adds sources.website_url, v6 adds sources.ephemeral, v2 adds vpn_accounts, v3 adds accounts, v4 drops proxy_checks (proxies.last_message) and moves account secrets into accounts.credential JSON, v5 drops vpn_accounts and slims sources to id/name/type/created_at/updated_at

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'normal',
  ephemeral INTEGER NOT NULL DEFAULT 0,
  website_url TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS proxies (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL,
  protocol TEXT NOT NULL DEFAULT 'http',
  username TEXT NOT NULL DEFAULT '',
  password TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'datacenter',
  ownership TEXT NOT NULL DEFAULT 'private',
  status TEXT NOT NULL DEFAULT 'unchecked',
  provider TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  isp TEXT NOT NULL DEFAULT '',
  exit_ip TEXT NOT NULL DEFAULT '',
  latency_ms INTEGER,
  success_rate INTEGER NOT NULL DEFAULT 0,
  latency_history TEXT NOT NULL DEFAULT '[]',
  last_message TEXT NOT NULL DEFAULT '',
  quota_used_gb REAL NOT NULL DEFAULT 0,
  quota_total_gb REAL,
  sticky_enabled INTEGER NOT NULL DEFAULT 0,
  sticky_ttl_min INTEGER NOT NULL DEFAULT 30,
  rotation_min INTEGER NOT NULL DEFAULT 0,
  max_conns INTEGER NOT NULL DEFAULT 10,
  tags TEXT NOT NULL DEFAULT '[]',
  used_by TEXT NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_checked INTEGER,
  expires_at INTEGER,
  UNIQUE (source_id, host, port, username)
);
CREATE INDEX IF NOT EXISTS idx_proxies_source ON proxies (source_id);
CREATE INDEX IF NOT EXISTS idx_proxies_status ON proxies (status);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  email TEXT NOT NULL DEFAULT '',
  credential TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_accounts_source ON accounts (source_id);
`;

let db: BetterSqlite3.Database | null = null;

function hasColumn(sqlite: BetterSqlite3.Database, table: string, column: string): boolean {
  return (sqlite.pragma(`table_info(${table})`) as { name: string }[]).some(
    (c) => c.name === column,
  );
}

// ASSUMED: v4 drops proxy_checks history (no copy) and rebuilds accounts with the old columns packed into credential JSON; v5 renames the vpn backing sources by provider and drops the provider/description columns
function migrateBeforeSchema(sqlite: BetterSqlite3.Database): void {
  if (hasColumn(sqlite, 'proxies', 'id') && !hasColumn(sqlite, 'proxies', 'last_message')) {
    sqlite.exec("ALTER TABLE proxies ADD COLUMN last_message TEXT NOT NULL DEFAULT ''");
  }
  sqlite.exec('DROP TABLE IF EXISTS proxy_checks');
  if (hasColumn(sqlite, 'accounts', 'uid')) {
    sqlite.exec(
      'DROP INDEX IF EXISTS idx_accounts_source; ALTER TABLE accounts RENAME TO accounts_old;',
    );
  }
  if (hasColumn(sqlite, 'sources', 'provider')) {
    sqlite.transaction(() => {
      sqlite.exec("ALTER TABLE sources ADD COLUMN type TEXT NOT NULL DEFAULT 'normal'");
      sqlite.exec(
        `UPDATE sources SET
           type = CASE WHEN provider IN ('foxhole', 'proton', 'warp') THEN 'vpn' ELSE 'normal' END,
           name = CASE provider WHEN 'foxhole' THEN 'Foxhole VPN' WHEN 'proton' THEN 'ProtonVPN' WHEN 'warp' THEN 'Cloudflare WARP' ELSE name END`,
      );
      sqlite.exec('ALTER TABLE sources DROP COLUMN provider');
      sqlite.exec('ALTER TABLE sources DROP COLUMN description');
    })();
  }
  if (hasColumn(sqlite, 'sources', 'id') && !hasColumn(sqlite, 'sources', 'ephemeral')) {
    sqlite.exec('ALTER TABLE sources ADD COLUMN ephemeral INTEGER NOT NULL DEFAULT 0');
    sqlite.exec("UPDATE sources SET ephemeral = 1 WHERE type = 'vpn' AND name = 'Cloudflare WARP'"); // ASSUMED: WARP is the only ephemeral source
  }
  if (hasColumn(sqlite, 'sources', 'id') && !hasColumn(sqlite, 'sources', 'website_url')) {
    sqlite.exec("ALTER TABLE sources ADD COLUMN website_url TEXT NOT NULL DEFAULT ''");
  }
}

function migrateAfterSchema(sqlite: BetterSqlite3.Database): void {
  if (hasColumn(sqlite, 'accounts_old', 'id')) {
    sqlite.transaction(() => {
      sqlite.exec(
        `INSERT INTO accounts (id, source_id, email, credential, created_at, updated_at)
         SELECT id, source_id, email,
           json_object('uid', uid, 'session_token', session_token, 'profile_id', profile_id, 'user_data_dir', user_data_dir, 'profile_directory', profile_directory),
           created_at, updated_at
         FROM accounts_old;
         DROP TABLE accounts_old;`,
      );
    })();
  }
  if (hasColumn(sqlite, 'vpn_accounts', 'id')) {
    sqlite.transaction(() => {
      sqlite.exec(
        `INSERT INTO accounts (id, source_id, email, credential, created_at, updated_at)
         SELECT lower(hex(randomblob(16))), v.id, '', v.credentials, v.created_at, v.updated_at
         FROM vpn_accounts v WHERE v.provider = 'proton' AND v.credentials <> '{}'`,
      );
      sqlite.exec('DROP TABLE vpn_accounts');
    })();
  }
}

// schema is created on first run; later changes need a SCHEMA_VERSION bump + migration here — upgrade path: versioned migration steps like profile/src/database/connection.ts
export function init(dbPath: string): void {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new BetterSqlite3(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const version = sqlite.pragma('user_version', { simple: true }) as number;
  migrateBeforeSchema(sqlite);
  sqlite.exec(SCHEMA_SQL); // ASSUMED: every statement is IF NOT EXISTS, so running it on each start is safe and heals a db whose user_version is ahead of its tables
  migrateAfterSchema(sqlite);
  if (version !== SCHEMA_VERSION) sqlite.pragma(`user_version = ${SCHEMA_VERSION}`);
  db = sqlite;
}

export function getDb(): BetterSqlite3.Database {
  if (!db) throw new Error('database not initialized — call init() first');
  return db;
}

export function close(): void {
  if (db) {
    db.close();
    db = null;
  }
}
