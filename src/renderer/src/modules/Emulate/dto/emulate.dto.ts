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
 * - Fuzzer Requests      : FuzzerRequest, Create/Update inputs
 * - Fuzzer Payloads      : FuzzerPayload, Upsert input
 * - Fuzzer History       : FuzzerHistory, Run, SaveHistoryInput
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

// ── Fuzzer - Requests ──
export interface FuzzerRequest {
  id: string;
  target_id: string;
  method: string;
  url: string;
  body: string;
  params: string;
  headers: string;
  created_at: number;
  updated_at: number;
}

export interface CreateFuzzerRequestInput {
  method: string;
  url: string;
  body?: string;
  params?: string;
  headers?: string;
}

export interface UpdateFuzzerRequestInput {
  method?: string;
  url?: string;
  body?: string;
  params?: string;
  headers?: string;
}

// ── Fuzzer - Payloads ──
export interface FuzzerPayload {
  id: string;
  fuzzer_id: string;
  name: string;
  payload_values: string;
  enabled: number;
  created_at: number;
}

export interface UpsertFuzzerPayloadInput {
  name: string;
  payload_values?: string;
  enabled?: number;
}

// ── Fuzzer - History ──
export interface FuzzerHistory {
  id: string;
  fuzzer_id: string | null;
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

export interface CreateFuzzerHistoryInput {
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

export interface FuzzerHistoryRun {
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

export interface CreateFuzzerHistoryRunInput {
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
  history: CreateFuzzerHistoryInput;
  runs: CreateFuzzerHistoryRunInput[];
}