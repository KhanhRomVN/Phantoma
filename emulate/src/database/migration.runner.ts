/**
 * ------------------------------------------------------------------
 * Database Migration Runner
 * ------------------------------------------------------------------
 * Incremental migrations tracked by PRAGMA user_version. Each entry in
 * MIGRATIONS is applied once, in order, inside its own transaction.
 * A fresh DB runs every migration; an existing DB only runs the ones
 * whose version is greater than its current user_version.
 * Before touching an existing DB the file is copied to
 * <db>.bak-v<oldVersion> (WAL checkpointed first).
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── External 
import BetterSqlite3 from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// ── Local
import { getTargetDir } from '../config/paths.config';
import { isSafeId } from '../utils/id.util';
import { createLogger, F } from '../utils/logger.util';

// ─── Constants ──────────────────────────────────────────────────────────
const logger = createLogger('Migration');

interface Migration {
  version: number;
  file: string;
  // Runs before the SQL; the returned callback runs after the transaction commits.
  prepare?: (db: BetterSqlite3.Database) => () => void;
}

// Remove legacy repeaters/ folders and the folders of android targets (deleted by SQL).
function prepareDropRepeater(db: BetterSqlite3.Database): () => void {
  const hasTargets = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'targets'")
    .get();
  if (!hasTargets) return () => {};

  const rows = db.prepare('SELECT id, platform FROM targets').all() as { id: string; platform: string | null }[];
  return () => {
    for (const r of rows) {
      if (!isSafeId(r.id)) continue;
      const dir = getTargetDir(r.id);
      if (r.platform === 'android') {
        fs.rmSync(dir, { recursive: true, force: true });
      } else {
        fs.rmSync(path.join(dir, 'repeaters'), { recursive: true, force: true });
      }
    }
  };
}

// Version 6 = legacy single-script schema (kept so existing DBs skip it).
const MIGRATIONS: Migration[] = [
  { version: 6, file: '0001_initial_schema.sql' },
  { version: 7, file: '0002_rename_targets.sql' },
  { version: 8, file: '0003_drop_repeater_tables.sql', prepare: prepareDropRepeater },
];

// Resolve the SQL file relative to this compiled module at runtime.
// In dev (tsx) it lives next to source; in prod it must be copied into dist/.
function loadMigrationSQL(file: string): string {
  const candidates = [
    path.join(__dirname, 'migrations', file),
    path.join(process.cwd(), 'src', 'database', 'migrations', file),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  }
  throw new Error(`migration SQL not found — tried: ${candidates.join(', ')}`);
}

function backupDatabase(db: BetterSqlite3.Database, fromVersion: number): void {
  const dbPath = db.name;
  if (!dbPath || !fs.existsSync(dbPath)) return;
  db.pragma('wal_checkpoint(TRUNCATE)');
  fs.copyFileSync(dbPath, `${dbPath}.bak-v${fromVersion}`);
}

// ─── Functions ─────────────────────────────────────────────────────────

export function runMigrations(db: BetterSqlite3.Database): void {
  const row = db.pragma('user_version', { simple: true }) as number;
  const current = row ?? 0;

  const pending = MIGRATIONS.filter((m) => m.version > current);
  if (pending.length === 0) return;

  if (current > 0) {
    try {
      backupDatabase(db, current);
    } catch (err) {
      logger.error('[Migration] Failed to back up database', F('error', String(err)));
      throw err;
    }
  }

  for (const m of pending) {
    try {
      const afterCommit = m.prepare ? m.prepare(db) : null;
      db.transaction(() => {
        db.exec(loadMigrationSQL(m.file));
        db.exec(`PRAGMA user_version = ${m.version}`);
      })();
      afterCommit?.();
    } catch (err) {
      logger.error(
        `[Migration] Failed to run ${m.file}`,
        F('error', String(err)),
      );
      throw err;
    }
  }
}