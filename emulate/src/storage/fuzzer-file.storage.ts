/**
 * ------------------------------------------------------------------
 * Fuzzer File Storage
 * ------------------------------------------------------------------
 * Replaces the repeater SQL tables. Layout on disk:
 *   ~/.phantoma/emulate/{targetId}/fuzzers/{fuzzerId}/fuzzer.json
 *   ~/.phantoma/emulate/{targetId}/fuzzers/{fuzzerId}/history/{historyId}/history.json
 *   ~/.phantoma/emulate/{targetId}/fuzzers/{fuzzerId}/history/{historyId}/runs.json
 * All operations are synchronous, so a read-modify-write cannot interleave
 * with another request. Writes go to a temp file first, then rename.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── External
import fs from 'fs';
import path from 'path';

// ── Local
import { getFuzzersDir } from '../config/paths.config';
import { AppError } from '../errors/app.error';
import { isSafeId } from '../utils/id.util';

// ─── Types ──────────────────────────────────────────────────────────────

export interface StoredPayload {
  id: string;
  name: string;
  payload_values: string[];
  enabled: boolean;
  created_at: number;
}

export interface StoredFuzzer {
  id: string;
  method: string;
  url: string;
  body: string;
  params: unknown;
  headers: unknown;
  payloads: StoredPayload[];
  created_at: number;
  updated_at: number;
}

export interface StoredHistory {
  id: string;
  fuzzer_id: string;
  method: string;
  url: string;
  status: number | null;
  statuses: Record<string, number>;
  timestamp: number;
  end_time: number | null;
  duration: number;
  payload_count: number;
  payload_summary: string;
  request_headers: Record<string, string>;
  request_body: string;
  created_at: number;
}

export interface StoredRun {
  id: string;
  payload_name: string;
  payload_value: string;
  status: number | null;
  duration: number | null;
  method: string;
  url: string;
  params: Record<string, string>;
  request_headers: Record<string, string>;
  request_body: string;
  response_headers: Record<string, string>;
  response_body: string;
  created_at: number;
}

// ─── Constants ──────────────────────────────────────────────────────────
const MAX_HISTORY_PER_FUZZER = 30;

// ─── Helpers ───────────────────────────────────────────────────────────

function assertSafe(id: string, label: string): void {
  if (!isSafeId(id)) throw new AppError(`invalid ${label}`, 400);
}

function fuzzersRoot(targetId: string): string {
  assertSafe(targetId, 'targetId');
  return getFuzzersDir(targetId);
}

function fuzzerDir(targetId: string, fuzzerId: string): string {
  assertSafe(fuzzerId, 'fuzzerId');
  return path.join(fuzzersRoot(targetId), fuzzerId);
}

function historyDir(targetId: string, fuzzerId: string, historyId: string): string {
  assertSafe(historyId, 'historyId');
  return path.join(fuzzerDir(targetId, fuzzerId), 'history', historyId);
}

function readJson<T>(file: string): T | null {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch {
    return null;
  }
}

function writeJson(file: string, data: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, file);
}

function subDirs(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

// ─── Storage ────────────────────────────────────────────────────────────

export class FuzzerFileStorage {
  // ── Fuzzers ──

  listFuzzers(targetId: string): StoredFuzzer[] {
    const root = fuzzersRoot(targetId);
    const result: StoredFuzzer[] = [];
    for (const name of subDirs(root)) {
      const fuzzer = readJson<StoredFuzzer>(path.join(root, name, 'fuzzer.json'));
      if (fuzzer) result.push(fuzzer);
    }
    return result;
  }

  readFuzzer(targetId: string, fuzzerId: string): StoredFuzzer | null {
    return readJson<StoredFuzzer>(path.join(fuzzerDir(targetId, fuzzerId), 'fuzzer.json'));
  }

  writeFuzzer(targetId: string, fuzzer: StoredFuzzer): void {
    writeJson(path.join(fuzzerDir(targetId, fuzzer.id), 'fuzzer.json'), fuzzer);
  }

  deleteFuzzer(targetId: string, fuzzerId: string): boolean {
    const dir = fuzzerDir(targetId, fuzzerId);
    if (!fs.existsSync(dir)) return false;
    fs.rmSync(dir, { recursive: true, force: true });
    return true;
  }

  // ── History ──

  listHistory(targetId: string, fuzzerId: string): StoredHistory[] {
    const root = path.join(fuzzerDir(targetId, fuzzerId), 'history');
    const result: StoredHistory[] = [];
    for (const name of subDirs(root)) {
      const history = readJson<StoredHistory>(path.join(root, name, 'history.json'));
      if (history) result.push(history);
    }
    return result.sort((a, b) => b.timestamp - a.timestamp);
  }

  listHistoryByTarget(targetId: string): StoredHistory[] {
    const result: StoredHistory[] = [];
    for (const name of subDirs(fuzzersRoot(targetId))) {
      result.push(...this.listHistory(targetId, name));
    }
    return result.sort((a, b) => b.timestamp - a.timestamp);
  }

  private findHistoryDir(targetId: string, historyId: string): string | null {
    assertSafe(historyId, 'historyId');
    const root = fuzzersRoot(targetId);
    for (const name of subDirs(root)) {
      const dir = path.join(root, name, 'history', historyId);
      if (fs.existsSync(dir)) return dir;
    }
    return null;
  }

  readRuns(targetId: string, historyId: string): StoredRun[] | null {
    const dir = this.findHistoryDir(targetId, historyId);
    if (!dir) return null;
    return readJson<StoredRun[]>(path.join(dir, 'runs.json')) ?? [];
  }

  writeHistory(
    targetId: string,
    fuzzerId: string,
    history: StoredHistory,
    runs: StoredRun[],
  ): void {
    const dir = historyDir(targetId, fuzzerId, history.id);
    writeJson(path.join(dir, 'history.json'), history);
    writeJson(path.join(dir, 'runs.json'), runs);

    for (const old of this.listHistory(targetId, fuzzerId).slice(MAX_HISTORY_PER_FUZZER)) {
      fs.rmSync(historyDir(targetId, fuzzerId, old.id), { recursive: true, force: true });
    }
  }

  deleteHistory(targetId: string, historyId: string): boolean {
    const dir = this.findHistoryDir(targetId, historyId);
    if (!dir) return false;
    fs.rmSync(dir, { recursive: true, force: true });
    return true;
  }
}