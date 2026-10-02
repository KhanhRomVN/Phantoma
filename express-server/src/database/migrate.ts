/**
 * ------------------------------------------------------------------
 * Database Migration Runner
 * ------------------------------------------------------------------
 * Ported from internal/database/migrate.go. Uses PRAGMA user_version to
 * track schema version and applies the embedded migratie.sql once.
 * SQLite's better-sqlite3 driver supports multi-statement exec(), so we
 * run the whole script in one call instead of splitting on ";" like the
 * Go database/sql driver required.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── External ─
import BetterSqlite3 from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// ── Local 
import { createLogger, F } from '../utils/logger';

// ─── Constants ──────────────────────────────────────────────────────────
const logger = createLogger('Migration');
const LATEST_VERSION = 5;

// Resolve the SQL file relative to this compiled module at runtime.
// In dev (tsx) it lives next to source; in prod it must be copied into dist/.
function loadMigrationSQL(): string {
  const candidates = [
    path.join(__dirname, 'migrations', 'migratie.sql'),
    path.join(process.cwd(), 'src', 'database', 'migrations', 'migratie.sql'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  }
  throw new Error(`migration SQL not found — tried: ${candidates.join(', ')}`);
}

// ─── Functions ──────────────────────────────────────────────────────────

export function runMigrations(db: BetterSqlite3.Database): void {
  logger.info('[Migration] Starting auto-migration...');

  const row = db.prepare('PRAGMA user_version').get() as { user_version: number };
  const version = row.user_version ?? 0;
  logger.info('[Migration] Current version', F('version', version));

  if (version >= LATEST_VERSION) {
    logger.info('[Migration] Schema already up to date');
    return;
  }

  logger.info('[Migration] Running migration...');
  try {
    db.exec(loadMigrationSQL());
    db.exec(`PRAGMA user_version = ${LATEST_VERSION}`);
  } catch (err) {
    logger.error('[Migration] Failed to run migration', F('error', String(err)));
    throw err;
  }

  logger.info('[Migration] Auto-migration completed successfully', F('version', LATEST_VERSION));
}