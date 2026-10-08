/**
 * ------------------------------------------------------------------
 * Database Schema Types
 * ------------------------------------------------------------------
 * Kysely table definitions matching internal/database/migrations/migratie.sql.
 * Column names stay snake_case to mirror the SQLite schema exactly.
 * ------------------------------------------------------------------
 */

// ─── Imports ───────────────────────────────────────────────────────────
// ── External ─
import type { Generated } from 'kysely';

// ─── Tables ─────────────────────────────────────────────────────────────

export interface EmulateTargetsTable {
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

export interface EmulateTargetFiltersTable {
  id: string;
  emulate_target_id: string;
  method: string;
  host: string;
  status: string;
  type: string;
}

export interface EmulateRepeaterRequestsTable {
  id: string;
  emulate_target_id: string;
  method: string;
  url: string;
  created_at: Generated<number>;
  updated_at: Generated<number>;
}

export interface EmulateRepeaterPayloadsTable {
  id: string;
  emulate_repeater_request_id: string;
  name: string;
  payload_values: string;
  enabled: number;
  created_at: Generated<number>;
}

export interface EmulateRepeaterHistoryTable {
  id: string;
  emulate_repeater_request_id: string | null;
  method: string;
  url: string;
  status: number | null;
  statuses: string;
  timestamp: number;
  end_time: number | null;
  duration: number;
  payload_count: number;
  payload_summary: string;
  request_headers: string;
  request_body: string;
  created_at: Generated<number>;
}

export interface EmulateRepeaterHistoryRunsTable {
  id: string;
  history_id: string;
  payload_name: string;
  payload_value: string;
  status: number | null;
  duration: number | null;
  method: string;
  url: string;
  params: string;
  request_headers: string;
  request_body: string;
  response_headers: string;
  response_body: string;
  created_at: Generated<number>;
}

// ─── Root DB interface ──────────────────────────────────────────────────

export interface Database {
  emulate_targets: EmulateTargetsTable;
  emulate_target_filters: EmulateTargetFiltersTable;
  emulate_repeater_requests: EmulateRepeaterRequestsTable;
  emulate_repeater_payloads: EmulateRepeaterPayloadsTable;
  emulate_repeater_history: EmulateRepeaterHistoryTable;
  emulate_repeater_history_runs: EmulateRepeaterHistoryRunsTable;
}