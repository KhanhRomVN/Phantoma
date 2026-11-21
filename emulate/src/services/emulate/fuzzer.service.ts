/**
 * ------------------------------------------------------------------
 * Fuzzer Service
 * ------------------------------------------------------------------
 * Replaces repeater.service.ts. Works on JSON files (FuzzerFileStorage)
 * and converts to/from the wire shape (JSON strings) the frontend uses.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Local
import type {
  Fuzzer,
  CreateFuzzerInput,
  UpdateFuzzerInput,
  FuzzerPayload,
  UpsertFuzzerPayloadInput,
  FuzzerHistory,
  CreateFuzzerHistoryInput,
  FuzzerHistoryRun,
  CreateFuzzerHistoryRunInput,
} from '../../domain';
import {
  FuzzerFileStorage,
  type StoredFuzzer,
  type StoredPayload,
  type StoredHistory,
  type StoredRun,
} from '../../storage/fuzzer-file.storage';
import { generateID } from '../../utils/id.util';

// ─── Helpers ───────────────────────────────────────────────────────────

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

// Empty/missing -> fallback; invalid JSON is kept as the raw string so no data is lost.
function parseJson(text: string | null | undefined, fallback: unknown): unknown {
  if (text === undefined || text === null || text.trim() === '') return fallback;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function parseObject<T extends object>(text: string | null | undefined): T {
  const value = parseJson(text, {});
  return (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as T;
}

function parseStrings(text: string | null | undefined): string[] {
  const value = parseJson(text, []);
  return Array.isArray(value) ? value.map(String) : [];
}

function toPrettyText(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function fuzzerToWire(targetId: string, f: StoredFuzzer): Fuzzer {
  return {
    id: f.id,
    target_id: targetId,
    method: f.method,
    url: f.url,
    body: f.body,
    params: toPrettyText(f.params),
    headers: toPrettyText(f.headers),
    created_at: f.created_at,
    updated_at: f.updated_at,
  };
}

function payloadToWire(fuzzerId: string, p: StoredPayload): FuzzerPayload {
  return {
    id: p.id,
    fuzzer_id: fuzzerId,
    name: p.name,
    payload_values: JSON.stringify(p.payload_values),
    enabled: p.enabled ? 1 : 0,
    created_at: p.created_at,
  };
}

function historyToWire(h: StoredHistory): FuzzerHistory {
  return {
    id: h.id,
    fuzzer_id: h.fuzzer_id,
    method: h.method,
    url: h.url,
    status: h.status,
    statuses: JSON.stringify(h.statuses),
    timestamp: h.timestamp,
    end_time: h.end_time,
    duration: h.duration,
    payload_count: h.payload_count,
    payload_summary: h.payload_summary,
    request_headers: JSON.stringify(h.request_headers),
    request_body: h.request_body,
    created_at: h.created_at,
  };
}

function runToWire(historyId: string, r: StoredRun): FuzzerHistoryRun {
  return {
    id: r.id,
    history_id: historyId,
    payload_name: r.payload_name,
    payload_value: r.payload_value,
    status: r.status,
    duration: r.duration,
    method: r.method,
    url: r.url,
    params: JSON.stringify(r.params),
    request_headers: JSON.stringify(r.request_headers),
    request_body: r.request_body,
    response_headers: JSON.stringify(r.response_headers),
    response_body: r.response_body,
    created_at: r.created_at,
  };
}

// ─── Service ────────────────────────────────────────────────────────────

export class FuzzerService {
  constructor(private storage: FuzzerFileStorage) {}

  // ===========================================================================
  // Fuzzers (requests)
  // ===========================================================================

  async listFuzzers(targetID: string): Promise<Fuzzer[]> {
    return this.storage
      .listFuzzers(targetID)
      .sort((a, b) => b.updated_at - a.updated_at)
      .map((f) => fuzzerToWire(targetID, f));
  }

  async getFuzzer(targetID: string, id: string): Promise<Fuzzer | null> {
    const fuzzer = this.storage.readFuzzer(targetID, id);
    return fuzzer ? fuzzerToWire(targetID, fuzzer) : null;
  }

  async createFuzzer(input: CreateFuzzerInput): Promise<Fuzzer> {
    const now = nowSeconds();
    const fuzzer: StoredFuzzer = {
      id: generateID(),
      method: input.method,
      url: input.url,
      body: input.body ?? '',
      params: parseJson(input.params, []),
      headers: parseJson(input.headers, []),
      payloads: [],
      created_at: now,
      updated_at: now,
    };
    this.storage.writeFuzzer(input.target_id, fuzzer);
    return fuzzerToWire(input.target_id, fuzzer);
  }

  async updateFuzzer(targetID: string, id: string, input: UpdateFuzzerInput): Promise<Fuzzer | null> {
    const fuzzer = this.storage.readFuzzer(targetID, id);
    if (!fuzzer) return null;

    if (input.method !== undefined && input.method !== null) fuzzer.method = input.method;
    if (input.url !== undefined && input.url !== null) fuzzer.url = input.url;
    if (input.body !== undefined && input.body !== null) fuzzer.body = input.body;
    if (input.params !== undefined && input.params !== null) {
      fuzzer.params = parseJson(input.params, []);
    }
    if (input.headers !== undefined && input.headers !== null) {
      fuzzer.headers = parseJson(input.headers, []);
    }
    fuzzer.updated_at = nowSeconds();

    this.storage.writeFuzzer(targetID, fuzzer);
    return fuzzerToWire(targetID, fuzzer);
  }

  async deleteFuzzer(targetID: string, id: string): Promise<boolean> {
    return this.storage.deleteFuzzer(targetID, id);
  }

  // ===========================================================================
  // Payloads
  // ===========================================================================

  async listPayloads(targetID: string, fuzzerID: string): Promise<FuzzerPayload[]> {
    const fuzzer = this.storage.readFuzzer(targetID, fuzzerID);
    if (!fuzzer) return [];
    return [...fuzzer.payloads]
      .sort((a, b) => a.created_at - b.created_at)
      .map((p) => payloadToWire(fuzzerID, p));
  }

  // One payload per (fuzzer, name): update when it exists, otherwise create.
  async upsertPayload(
    targetID: string,
    fuzzerID: string,
    input: UpsertFuzzerPayloadInput,
  ): Promise<FuzzerPayload | null> {
    const fuzzer = this.storage.readFuzzer(targetID, fuzzerID);
    if (!fuzzer) return null;

    let payload = fuzzer.payloads.find((p) => p.name === input.name);
    if (payload) {
      if (input.payload_values !== undefined) payload.payload_values = parseStrings(input.payload_values);
      if (input.enabled !== undefined) payload.enabled = input.enabled !== 0;
    } else {
      payload = {
        id: generateID(),
        name: input.name,
        payload_values: parseStrings(input.payload_values),
        enabled: (input.enabled ?? 1) !== 0,
        created_at: nowSeconds(),
      };
      fuzzer.payloads.push(payload);
    }

    this.storage.writeFuzzer(targetID, fuzzer);
    return payloadToWire(fuzzerID, payload);
  }

  async deletePayload(targetID: string, fuzzerID: string, payloadID: string): Promise<boolean> {
    const fuzzer = this.storage.readFuzzer(targetID, fuzzerID);
    if (!fuzzer) return false;

    const before = fuzzer.payloads.length;
    fuzzer.payloads = fuzzer.payloads.filter((p) => p.id !== payloadID);
    if (fuzzer.payloads.length === before) return false;

    this.storage.writeFuzzer(targetID, fuzzer);
    return true;
  }

  // ===========================================================================
  // History
  // ===========================================================================

  async getHistoryByTarget(targetID: string): Promise<FuzzerHistory[]> {
    return this.storage.listHistoryByTarget(targetID).map(historyToWire);
  }

  async getHistoryByFuzzer(targetID: string, fuzzerID: string): Promise<FuzzerHistory[]> {
    return this.storage.listHistory(targetID, fuzzerID).map(historyToWire);
  }

  // Creates one history entry plus all its runs; null when the fuzzer does not exist.
  async saveHistory(
    targetID: string,
    fuzzerID: string,
    historyInput: CreateFuzzerHistoryInput,
    runsInput: CreateFuzzerHistoryRunInput[],
  ): Promise<FuzzerHistory | null> {
    if (!this.storage.readFuzzer(targetID, fuzzerID)) return null;

    const now = nowSeconds();
    const history: StoredHistory = {
      id: generateID(),
      fuzzer_id: fuzzerID,
      method: historyInput.method,
      url: historyInput.url,
      status: historyInput.status ?? null,
      statuses: parseObject<Record<string, number>>(historyInput.statuses),
      timestamp: historyInput.timestamp,
      end_time: historyInput.end_time ?? null,
      duration: historyInput.duration ?? 0,
      payload_count: historyInput.payload_count ?? 0,
      payload_summary: historyInput.payload_summary ?? '',
      request_headers: parseObject<Record<string, string>>(historyInput.request_headers),
      request_body: historyInput.request_body ?? '',
      created_at: now,
    };
    const runs: StoredRun[] = runsInput.map((r) => ({
      id: generateID(),
      payload_name: r.payload_name,
      payload_value: r.payload_value,
      status: r.status ?? null,
      duration: r.duration ?? null,
      method: r.method ?? '',
      url: r.url ?? '',
      params: parseObject<Record<string, string>>(r.params),
      request_headers: parseObject<Record<string, string>>(r.request_headers),
      request_body: r.request_body ?? '',
      response_headers: parseObject<Record<string, string>>(r.response_headers),
      response_body: r.response_body ?? '',
      created_at: now,
    }));

    this.storage.writeHistory(targetID, fuzzerID, history, runs);
    return historyToWire(history);
  }

  async deleteHistory(targetID: string, historyID: string): Promise<boolean> {
    return this.storage.deleteHistory(targetID, historyID);
  }

  async getRunsByHistory(targetID: string, historyID: string): Promise<FuzzerHistoryRun[]> {
    const runs = this.storage.readRuns(targetID, historyID);
    return runs ? runs.map((r) => runToWire(historyID, r)) : [];
  }
}