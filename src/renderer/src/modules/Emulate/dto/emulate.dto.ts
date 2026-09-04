/**
 * ------------------------------------------------------------------
 * Emulate DTOs
 * ------------------------------------------------------------------
 * Data Transfer Objects cho module Emulate — dùng chung giữa
 * API layer và business layer.
 *
 * Các nhóm DTO chính:
 * - Target                 : TargetDTO, CreateTargetDTO, UpdateTargetDTO
 * - Filter                 : TargetFilterDTO, CreateTargetFilterDTO
 * - Repeater Requests      : RepeaterRequest, Create/Update inputs
 * - Repeater Payloads      : RepeaterPayload, Upsert input
 * - Repeater History       : RepeaterHistory, Run, SaveHistoryInput
 * ------------------------------------------------------------------
 */

// ─── Types ──────────────────────────────────────────────────────────────
// ── Target ──
export interface TargetDTO {
  id: string;
  title: string;
  url: string | null;
  icon: string | null;
  platform: string | null;
  executable_path: string | null;
  startup_args: string | null;
  environment: Record<string, string> | null;
}

export interface CreateTargetDTO {
  id?: string;
  title: string;
  url: string | null;
  icon: string | null;
  platform: string | null;
  executable_path: string | null;
  startup_args: string | null;
  environment: Record<string, string> | null;
}

export interface UpdateTargetDTO {
  title?: string;
  url?: string | null;
  icon?: string | null;
  platform?: string | null;
  executable_path?: string | null;
  startup_args?: string | null;
  environment?: Record<string, string> | null;
}

// ── Filter ──
export interface TargetFilterDTO {
  id: string;
  emulate_target_id: string;
  method: string;
  host: string;
  status: string;
  type: string;
}

export interface CreateTargetFilterDTO {
  emulate_target_id: string;
  method: string;
  host: string;
  status: string;
  type: string;
}

// ── Repeater - Requests ──
export interface RepeaterRequest {
  id: string;
  emulate_target_id: string;
  method: string;
  url: string;
  body: string;
  params: string;
  headers: string;
  created_at: number;
  updated_at: number;
}

export interface CreateRepeaterRequestInput {
  method: string;
  url: string;
  body?: string;
  params?: string;
  headers?: string;
}

export interface UpdateRepeaterRequestInput {
  method?: string;
  url?: string;
  body?: string;
  params?: string;
  headers?: string;
}

// ── Repeater - Payloads ──
export interface RepeaterPayload {
  id: string;
  emulate_repeater_request_id: string;
  name: string;
  payload_values: string;
  enabled: number;
  created_at: number;
}

export interface UpsertRepeaterPayloadInput {
  name: string;
  payload_values?: string;
  enabled?: number;
}

// ── Repeater - History ──
export interface RepeaterHistory {
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
  created_at: number;
}

export interface CreateRepeaterHistoryInput {
  method: string;
  url: string;
  status?: number;
  statuses?: string;
  timestamp: number;
  end_time?: number;
  duration?: number;
  payload_count?: number;
  payload_summary?: string;
  request_headers?: string;
  request_body?: string;
}

export interface RepeaterHistoryRun {
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
  created_at: number;
}

export interface CreateRepeaterHistoryRunInput {
  payload_name: string;
  payload_value: string;
  status?: number;
  duration?: number;
  method?: string;
  url?: string;
  params?: string;
  request_headers?: string;
  request_body?: string;
  response_headers?: string;
  response_body?: string;
}

export interface SaveHistoryInput {
  history: CreateRepeaterHistoryInput;
  runs: CreateRepeaterHistoryRunInput[];
}