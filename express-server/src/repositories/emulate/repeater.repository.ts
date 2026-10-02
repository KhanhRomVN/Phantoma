/**
 * ------------------------------------------------------------------
 * Repeater Repository
 * ------------------------------------------------------------------
 * Ported from internal/repository/emulate/repeater.go. Hybrid storage:
 *   - Metadata (id, method, url, timestamps) → SQLite via Kysely
 *   - Content (params, headers, body JSON)   → filesystem via RepeaterFileStorage
 * This mirrors the Go implementation exactly so existing data on disk
 * remains readable without migration.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Local 
import { getDb } from '../../database/connection';
import type {
  RepeaterRequest,
  CreateRepeaterRequestInput,
  UpdateRepeaterRequestInput,
  RepeaterPayload,
  CreateRepeaterPayloadInput,
  UpdateRepeaterPayloadInput,
  RepeaterHistory,
  CreateRepeaterHistoryInput,
  RepeaterHistoryRun,
  CreateRepeaterHistoryRunInput,
} from '../../domain/emulate';
import { RepeaterFileStorage } from './repeater-file-storage';
import { createLogger, F } from '../../utils/logger';

// ─── Constants ─────────────────────────────────────────────────────────
const logger = createLogger('RepeaterRepository');

function generateID(): string {
  return Date.now().toString(16) + Math.random().toString(16).slice(2);
}

// ─── Repository ─────────────────────────────────────────────────────────

export class RepeaterRepository {
  private fileStorage = new RepeaterFileStorage();

  // ===========================================================================
  // Requests
  // ===========================================================================

  async getRequestsByTargetID(targetID: string): Promise<RepeaterRequest[]> {
    const db = getDb();
    const rows = await db
      .selectFrom('emulate_repeater_requests')
      .selectAll()
      .where('emulate_target_id', '=', targetID)
      .orderBy('updated_at', 'desc')
      .execute();

    const requests: RepeaterRequest[] = [];
    for (const row of rows) {
      const params = this.fileStorage.readParams(row.emulate_target_id, row.id);
      const headers = this.fileStorage.readHeaders(row.emulate_target_id, row.id);
      const body = this.fileStorage.readBody(row.emulate_target_id, row.id);

      requests.push({
        id: row.id,
        emulate_target_id: row.emulate_target_id,
        method: row.method,
        url: row.url,
        created_at: row.created_at,
        updated_at: row.updated_at,
        params,
        headers,
        body,
      });
    }
    return requests;
  }

  async getRequestByID(id: string): Promise<RepeaterRequest | null> {
    const db = getDb();
    const row = await db
      .selectFrom('emulate_repeater_requests')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!row) return null;

    const params = this.fileStorage.readParams(row.emulate_target_id, row.id);
    const headers = this.fileStorage.readHeaders(row.emulate_target_id, row.id);
    const body = this.fileStorage.readBody(row.emulate_target_id, row.id);

    return {
      id: row.id,
      emulate_target_id: row.emulate_target_id,
      method: row.method,
      url: row.url,
      created_at: row.created_at,
      updated_at: row.updated_at,
      params,
      headers,
      body,
    };
  }

  async createRequest(input: CreateRepeaterRequestInput, now: number): Promise<RepeaterRequest> {
    const db = getDb();
    const id = generateID();

    // Write content files first (matches Go order: files then DB insert)
    this.fileStorage.writeParams(input.emulate_target_id, id, input.params ?? '');
    this.fileStorage.writeHeaders(input.emulate_target_id, id, input.headers ?? '');
    this.fileStorage.writeBody(input.emulate_target_id, id, input.body ?? '');

    await db
      .insertInto('emulate_repeater_requests')
      .values({
        id,
        emulate_target_id: input.emulate_target_id,
        method: input.method,
        url: input.url,
        created_at: now,
        updated_at: now,
      })
      .execute();

    const created = await this.getRequestByID(id);
    if (!created) throw new Error(`request not found after insert: ${id}`);
    return created;
  }

  async updateRequest(id: string, input: UpdateRepeaterRequestInput, now: number): Promise<RepeaterRequest | null> {
    const current = await this.getRequestByID(id);
    if (!current) return null;

    // Update files if content changed
    if (input.params !== undefined && input.params !== null) {
      this.fileStorage.writeParams(current.emulate_target_id, id, input.params);
    }
    if (input.headers !== undefined && input.headers !== null) {
      this.fileStorage.writeHeaders(current.emulate_target_id, id, input.headers);
    }
    if (input.body !== undefined && input.body !== null) {
      this.fileStorage.writeBody(current.emulate_target_id, id, input.body);
    }

    // Update metadata in DB
    const patch: Record<string, unknown> = { updated_at: now };
    if (input.method !== undefined) patch.method = input.method;
    if (input.url !== undefined) patch.url = input.url;

    const db = getDb();
    const res = await db
      .updateTable('emulate_repeater_requests')
      .set(patch as any)
      .where('id', '=', id)
      .executeTakeFirst();

    if (Number(res.numUpdatedRows || 0) === 0) return null;
    return this.getRequestByID(id);
  }

  async deleteRequest(id: string): Promise<boolean> {
    const req = await this.getRequestByID(id);
    if (!req) return false;

    // Delete files (log warning but continue with DB deletion, matching Go)
    try {
      this.fileStorage.deleteAll(req.emulate_target_id, id);
    } catch (err) {
      logger.warn(`failed to delete files for repeater ${id}`, F('error', String(err)));
    }

    const db = getDb();
    const res = await db
      .deleteFrom('emulate_repeater_requests')
      .where('id', '=', id)
      .executeTakeFirst();
    return Number(res.numDeletedRows || 0) > 0;
  }

  // ===========================================================================
  // Payloads
  // ===========================================================================

  async getPayloadsByRequestID(requestID: string): Promise<RepeaterPayload[]> {
    const db = getDb();
    const rows = await db
      .selectFrom('emulate_repeater_payloads')
      .selectAll()
      .where('emulate_repeater_request_id', '=', requestID)
      .orderBy('created_at', 'asc')
      .execute();
    return rows as unknown as RepeaterPayload[];
  }

  async createPayload(input: CreateRepeaterPayloadInput, now: number): Promise<RepeaterPayload> {
    const db = getDb();
    const id = generateID();
    const enabled = input.enabled ?? 1;
    const payloadValues = input.payload_values || '[]';

    await db
      .insertInto('emulate_repeater_payloads')
      .values({
        id,
        emulate_repeater_request_id: input.emulate_repeater_request_id,
        name: input.name,
        payload_values: payloadValues,
        enabled,
        created_at: now,
      })
      .execute();

    const created = await this.getPayloadByID(id);
    if (!created) throw new Error(`payload not found after insert: ${id}`);
    return created;
  }

  async updatePayload(id: string, input: UpdateRepeaterPayloadInput, now: number): Promise<RepeaterPayload | null> {
    const db = getDb();
    const patch: Record<string, unknown> = {};
    if (input.payload_values !== undefined) patch.payload_values = input.payload_values;
    if (input.enabled !== undefined) patch.enabled = input.enabled;

    if (Object.keys(patch).length === 0) {
      return this.getPayloadByID(id);
    }

    await db
      .updateTable('emulate_repeater_payloads')
      .set(patch as any)
      .where('id', '=', id)
      .execute();

    return this.getPayloadByID(id);
  }

  async deletePayload(id: string): Promise<boolean> {
    const db = getDb();
    const res = await db
      .deleteFrom('emulate_repeater_payloads')
      .where('id', '=', id)
      .executeTakeFirst();
    return Number(res.numDeletedRows || 0) > 0;
  }

  // upsertPayload mirrors Go UpsertPayload(): one payload per (request_id, name).
  async upsertPayload(requestID: string, input: CreateRepeaterPayloadInput, now: number): Promise<RepeaterPayload> {
    const db = getDb();
    const existing = await db
      .selectFrom('emulate_repeater_payloads')
      .select('id')
      .where('emulate_repeater_request_id', '=', requestID)
      .where('name', '=', input.name)
      .executeTakeFirst();

    if (existing) {
      const updated = await this.updatePayload(existing.id, {
        payload_values: input.payload_values,
        enabled: input.enabled,
      }, now);
      if (!updated) throw new Error(`payload vanished during upsert: ${existing.id}`);
      return updated;
    }

    input.emulate_repeater_request_id = requestID;
    return this.createPayload(input, now);
  }

  private async getPayloadByID(id: string): Promise<RepeaterPayload | null> {
    const db = getDb();
    const row = await db
      .selectFrom('emulate_repeater_payloads')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return (row as unknown as RepeaterPayload) ?? null;
  }

  // ===========================================================================
  // History
  // ===========================================================================

  async getHistoryByTargetID(targetID: string): Promise<RepeaterHistory[]> {
    const db = getDb();
    const rows = await db
      .selectFrom('emulate_repeater_history as h')
      .innerJoin('emulate_repeater_requests as req', 'h.emulate_repeater_request_id', 'req.id')
      .select([
        'h.id',
        'h.emulate_repeater_request_id',
        'h.method',
        'h.url',
        'h.status',
        'h.statuses',
        'h.timestamp',
        'h.end_time',
        'h.duration',
        'h.payload_count',
        'h.payload_summary',
        'h.request_headers',
        'h.request_body',
        'h.created_at',
      ])
      .where('req.emulate_target_id', '=', targetID)
      .orderBy('h.timestamp', 'desc')
      .execute();
    return rows as unknown as RepeaterHistory[];
  }

  async getHistoryByRequestID(requestID: string): Promise<RepeaterHistory[]> {
    const db = getDb();
    const rows = await db
      .selectFrom('emulate_repeater_history')
      .selectAll()
      .where('emulate_repeater_request_id', '=', requestID)
      .orderBy('timestamp', 'desc')
      .execute();
    return rows as unknown as RepeaterHistory[];
  }

  async createHistory(input: CreateRepeaterHistoryInput, now: number): Promise<RepeaterHistory> {
    const db = getDb();
    const id = generateID();
    const statuses = input.statuses || '{}';
    const requestHeaders = input.request_headers || '{}';

    await db
      .insertInto('emulate_repeater_history')
      .values({
        id,
        emulate_repeater_request_id: input.emulate_repeater_request_id ?? null,
        method: input.method,
        url: input.url,
        status: input.status ?? null,
        statuses,
        timestamp: input.timestamp,
        end_time: input.end_time ?? null,
        duration: input.duration ?? 0,
        payload_count: input.payload_count ?? 0,
        payload_summary: input.payload_summary ?? '',
        request_headers: requestHeaders,
        request_body: input.request_body ?? '',
        created_at: now,
      })
      .execute();

    const created = await this.getHistoryByID(id);
    if (!created) throw new Error(`history not found after insert: ${id}`);
    return created;
  }

  async deleteHistory(id: string): Promise<boolean> {
    const db = getDb();
    const res = await db
      .deleteFrom('emulate_repeater_history')
      .where('id', '=', id)
      .executeTakeFirst();
    return Number(res.numDeletedRows || 0) > 0;
  }

  private async getHistoryByID(id: string): Promise<RepeaterHistory | null> {
    const db = getDb();
    const row = await db
      .selectFrom('emulate_repeater_history')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return (row as unknown as RepeaterHistory) ?? null;
  }

  // ===========================================================================
  // History Runs
  // ===========================================================================

  async getRunsByHistoryID(historyID: string): Promise<RepeaterHistoryRun[]> {
    const db = getDb();
    const rows = await db
      .selectFrom('emulate_repeater_history_runs')
      .selectAll()
      .where('history_id', '=', historyID)
      .orderBy('created_at', 'asc')
      .execute();
    return rows as unknown as RepeaterHistoryRun[];
  }

  async createRun(input: CreateRepeaterHistoryRunInput, now: number): Promise<RepeaterHistoryRun> {
    const db = getDb();
    const id = generateID();
    const params = input.params || '{}';
    const requestHeaders = input.request_headers || '{}';
    const responseHeaders = input.response_headers || '{}';

    await db
      .insertInto('emulate_repeater_history_runs')
      .values({
        id,
        history_id: input.history_id,
        payload_name: input.payload_name,
        payload_value: input.payload_value,
        status: input.status ?? null,
        duration: input.duration ?? null,
        method: input.method ?? '',
        url: input.url ?? '',
        params,
        request_headers: requestHeaders,
        request_body: input.request_body ?? '',
        response_headers: responseHeaders,
        response_body: input.response_body ?? '',
        created_at: now,
      })
      .execute();

    const created = await this.getRunByID(id);
    if (!created) throw new Error(`run not found after insert: ${id}`);
    return created;
  }

  private async getRunByID(id: string): Promise<RepeaterHistoryRun | null> {
    const db = getDb();
    const row = await db
      .selectFrom('emulate_repeater_history_runs')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return (row as unknown as RepeaterHistoryRun) ?? null;
  }
}