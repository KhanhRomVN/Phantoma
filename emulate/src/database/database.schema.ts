/**
 * ------------------------------------------------------------------
 * Database Schema Types
 * ------------------------------------------------------------------
 * Kysely table definitions matching database/migrations/*.sql.
 * Column names stay snake_case to mirror the SQLite schema exactly.
 * ------------------------------------------------------------------
 */

// ─── Imports ──────────────────────────────────────────────────────────
// ── External 
import type { Generated } from 'kysely';

// ─── Tables ────────────────────────────────────────────────────────────

export interface TargetsTable {
  id: string;
  title: string;
  url: string | null;
  icon: string | null;
  platform: string | null;
  last_used_at: number | null;
  executable_path: string | null;
  startup_args: string | null;
  environment: string | null;
  created_at: Generated<number>;
  updated_at: Generated<number>;
}

export interface TargetHttpFiltersTable {
  id: string;
  target_id: string;
  method: string;
  host: string;
  status: string;
  type: string;
}


// ─── Root DB interface ──────────────────────────────────────────────────

export interface Database {
  targets: TargetsTable;
  target_http_filters: TargetHttpFiltersTable;
}