/**
 * ------------------------------------------------------------------
 * Emulate Domain Types
 * ------------------------------------------------------------------
 * Ported from internal/domain/emulate/*.go — Target, Filter, Report,
 * RepeaterRequest/Payload/History/HistoryRun and their Create/Update inputs.
 * Nullable Go pointer fields (*string, *int64, *int) become optional
 * (`?:`) in TS; JSON snake_case keys are preserved to stay wire-compatible
 * with the existing frontend.
 * ------------------------------------------------------------------
 */

// ─── Target ──────────────────────────────────────────────────────────────

export interface Target {
  id: string;
  title: string;
  url?: string | null;
  icon?: string | null;
  platform?: string | null;
  last_used_at?: number | null;
  executable_path?: string | null;
  startup_args?: string | null;
  environment?: string | null;
  created_at: number;
  updated_at: number;
}

export interface CreateTargetInput {
  id?: string;
  title: string;
  url?: string | null;
  icon?: string | null;
  platform?: string | null;
  executable_path?: string | null;
  startup_args?: string | null;
  environment?: string | null;
}

export interface UpdateTargetInput {
  title?: string | null;
  url?: string | null;
  icon?: string | null;
  platform?: string | null;
  last_used_at?: number | null;
  executable_path?: string | null;
  startup_args?: string | null;
  environment?: string | null;
}

// ─── TargetFilter ────────────────────────────────────────────────────────

export interface TargetFilter {
  id: string;
  emulate_target_id: string;
  method: string;
  host: string;
  status: string;
  type: string;
}

export interface CreateTargetFilterInput {
  emulate_target_id: string;
  method: string;
  host: string;
  status: string;
  type: string;
}

export interface UpdateTargetFilterInput {
  method?: string | null;
  host?: string | null;
  status?: string | null;
  type?: string | null;
}

// ─── Report ──────────────────────────────────────────────────────────────

export interface Report {
  id: string;
  emulate_target_id: string;
  title: string;
  content: string;
  file_path: string;
  created_at: number;
  updated_at: number;
}

export interface CreateReportInput {
  emulate_target_id: string;
  title: string;
  content: string;
  file_path: string;
}

export interface UpdateReportInput {
  title: string;
  content: string;
  file_path: string;
}

// ─── Repeater Request ────────────────────────────────────────────────────

export interface RepeaterRequest {
  id: string;
  emulate_target_id: string;
  method: string;
  url: string;
  body: string;
  params: string;  // JSON array of ParamItem
  headers: string; // JSON array of HeaderItem
  created_at: number;
  updated_at: number;
}

export interface CreateRepeaterRequestInput {
  emulate_target_id: string;
  method: string;
  url: string;
  body?: string;
  params?: string;
  headers?: string;
}

export interface UpdateRepeaterRequestInput {
  method?: string | null;
  url?: string | null;
  body?: string | null;
  params?: string | null;
  headers?: string | null;
}

// ─── Repeater Payload ────────────────────────────────────────────────────

export interface RepeaterPayload {
  id: string;
  emulate_repeater_request_id: string;
  name: string;
  payload_values: string;
  enabled: number;
  created_at: number;
}

export interface CreateRepeaterPayloadInput {
  emulate_repeater_request_id: string;
  name: string;
  payload_values?: string;
  enabled?: number;
}

export interface UpdateRepeaterPayloadInput {
  payload_values?: string | null;
  enabled?: number | null;
}

// ─── Repeater History ────────────────────────────────────────────────────

export interface RepeaterHistory {
  id: string;
  emulate_repeater_request_id?: string | null;
  method: string;
  url: string;
  status?: number | null;
  statuses: string; // JSON object
  timestamp: number;
  end_time?: number | null;
  duration: number;
  payload_count: number;
  payload_summary: string;
  request_headers: string; // JSON object
  request_body: string;
  created_at: number;
}

export interface CreateRepeaterHistoryInput {
  emulate_repeater_request_id?: string | null;
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

// ─── Repeater History Run ────────────────────────────────────────────────

export interface RepeaterHistoryRun {
  id: string;
  history_id: string;
  payload_name: string;
  payload_value: string;
  status?: number | null;
  duration?: number | null;
  method: string;
  url: string;
  params: string;          // JSON object
  request_headers: string; // JSON object
  request_body: string;
  response_headers: string; // JSON object
  response_body: string;
  created_at: number;
}

export interface CreateRepeaterHistoryRunInput {
  history_id: string;
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