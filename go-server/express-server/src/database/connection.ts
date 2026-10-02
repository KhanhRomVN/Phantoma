/**
 * ------------------------------------------------------------------
 * Database Connection
 * ------------------------------------------------------------------
 * Ported from internal/database/sqlite.go. Opens a better-sqlite3 handle
 * with WAL journal mode + foreign keys enforced (same PRAGMAs as the Go
 * driver's DSN: ?_journal_mode=WAL&_foreign_keys=on), then wires it into
 * Kysely for typed queries.
 *
 * Exposes init/reinit/close/getCurrentPath so PUT /database/path can swap
 * the backing file at runtime without restarting the process.
 * ------------------------------------------------------------------
 */

// ─── Imports ───────────────────────────────────────────────────────────
// ── External ─
import fs from 'fs';
import path from 'path';
import BetterSqlite3 from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';

// ── Local ─
import type { Database } from './schema';
import { createLogger, F } from '../utils/logger';
import { runMigrations } from './migrate';

// ─── Constants ──────────────────────────────────────────────────────────
const logger = createLogger('Database');

// ─── State ──────────────────────────────────────────────────────────────

let dbInstance: Kysely<Database> | null = null;
let rawDb: BetterSqlite3.Database | null = null;
let currentPath = '';

// ─── Functions ──────────────────────────────────────────────────────────

// init opens the SQLite file at dbPath and applies migrations.
export function init(dbPath: string): void {
  // Ensure parent directory exists (mirrors os.MkdirAll in Go).
  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true, mode: 0o755 });

  const sqlite = new BetterSqlite3(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  const kysely = new Kysely<Database>({
    dialect: new SqliteDialect({ database: sqlite }),
  });

  rawDb = sqlite;
  dbInstance = kysely;
  currentPath = dbPath;
  logger.info('database connected', F('path', dbPath));

  runMigrations(sqlite);
}

// reinit closes the existing connection and opens a new one at newPath.
export function reinit(newPath: string): void {
  if (rawDb) {
    try {
      rawDb.close();
    } catch (err) {
      logger.warn('failed to close old database connection', F('error', String(err)));
    }
    rawDb = null;
    dbInstance = null;
  }
  init(newPath);
  logger.info('database re-initialized', F('new_path', newPath));
}

// getDb returns the live Kysely instance; throws if not initialized yet.
export function getDb(): Kysely<Database> {
  if (!dbInstance) {
    throw new Error('database not initialized — call init() first');
  }
  return dbInstance;
}

// getCurrentPath mirrors database.GetCurrentPath() in Go.
export function getCurrentPath(): string {
  return currentPath;
}

// close shuts down the connection cleanly on process exit.
export function close(): void {
  if (rawDb) {
    rawDb.close();
    rawDb = null;
    dbInstance = null;
    logger.info('database connection closed');
  }
}