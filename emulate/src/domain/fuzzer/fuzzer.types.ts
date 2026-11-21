/**
 * Fuzzer — wire types and inputs (replaces domain/repeater/*).
 * Storage keeps real JSON on disk; over HTTP params/headers/payload_values/
 * statuses/request_headers stay JSON strings so the frontend is unchanged.
 */

// ─── Entities ───────────────────────────────────────────────────────────

export interface Fuzzer {
  id: string;
  target_id: string;
  method: string;
  url: string;
  body: string;
  params: string; // JSON array of ParamItem
  headers: string; // JSON array of HeaderItem
  created_at: number;
  updated_at: number;
}

export interface FuzzerPayload {
  id: string;
  fuzzer_id: string;
  name: string;
  payload_values: string; // JSON array of strings
  enabled: number;
  created_at: number;
}

export interface FuzzerHistory {
  id: string;
  fuzzer_id: string | null;
  method: string;
  url: string;
  status: number | null;
  statuses: string; // JSON object
  timestamp: number;
  end_time: number | null;
  duration: number;
  payload_count: number;
  payload_summary: string;
  request_headers: string; // JSON object
  request_body: string;
  created_at: number;
}

export interface FuzzerHistoryRun {
  id: string;
  history_id: string;
  payload_name: string;
  payload_value: string;
  status: number | null;
  duration: number | null;
  method: string;
  url: string;
  params: string; // JSON object
  request_headers: string; // JSON object
  request_body: string;
  response_headers: string; // JSON object
  response_body: string;
  created_at: number;
}

// ─── Inputs ─────────────────────────────────────────────────────────────

export interface CreateFuzzerInput {
  target_id: string;
  method: string;
  url: string;
  body?: string;
  params?: string;
  headers?: string;
}

export interface UpdateFuzzerInput {
  method?: string | null;
  url?: string | null;
  body?: string | null;
  params?: string | null;
  headers?: string | null;
}

export interface UpsertFuzzerPayloadInput {
  name: string;
  payload_values?: string;
  enabled?: number;
}

export interface CreateFuzzerHistoryInput {
  fuzzer_id?: string | null;
  method: string;
  url: string;
  status?: number | null;
  statuses?: string;
  timestamp: number;
  end_time?: number | null;
  duration?: number;
  payload_count?: number;
  payload_summary?: string;
  request_headers?: string;
  request_body?: string;
}

export interface CreateFuzzerHistoryRunInput {
  payload_name: string;
  payload_value: string;
  status?: number | null;
  duration?: number | null;
  method?: string;
  url?: string;
  params?: string;
  request_headers?: string;
  request_body?: string;
  response_headers?: string;
  response_body?: string;
}