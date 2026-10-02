/**
 * ------------------------------------------------------------------
 * Filter Repository
 * ------------------------------------------------------------------
 * Ported from internal/repository/emulate/emulate_target_filter.go.
 * One filter per target — Upsert() either updates the existing row or
 * inserts a new one, matching the Go behavior exactly.
 * ------------------------------------------------------------------
 */

// ─── Imports ───────────────────────────────────────────────────────────
// ── Local ─
import { getDb } from '../../database/connection';
import type {
  TargetFilter,
  CreateTargetFilterInput,
  UpdateTargetFilterInput,
} from '../../domain/emulate';

function generateID(): string {
  return Date.now().toString(16) + Math.random().toString(16).slice(2);
}

// ─── Repository ─────────────────────────────────────────────────────────

export class FilterRepository {
  async getByTargetID(targetID: string): Promise<TargetFilter | null> {
    const db = getDb();
    const row = await db
      .selectFrom('emulate_target_filters')
      .selectAll()
      .where('emulate_target_id', '=', targetID)
      .executeTakeFirst();
    return (row as unknown as TargetFilter) ?? null;
  }

  async getByID(id: string): Promise<TargetFilter | null> {
    const db = getDb();
    const row = await db
      .selectFrom('emulate_target_filters')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return (row as unknown as TargetFilter) ?? null;
  }

  async create(input: CreateTargetFilterInput): Promise<TargetFilter> {
    const db = getDb();
    const id = generateID();

    await db
      .insertInto('emulate_target_filters')
      .values({
        id,
        emulate_target_id: input.emulate_target_id,
        method: input.method,
        host: input.host,
        status: input.status,
        type: input.type,
      })
      .execute();

    const created = await this.getByID(id);
    if (!created) throw new Error(`filter not found after insert: ${id}`);
    return created;
  }

  async update(id: string, input: UpdateTargetFilterInput): Promise<TargetFilter | null> {
    const db = getDb();

    const patch: Record<string, unknown> = {};
    if (input.method !== undefined) patch.method = input.method;
    if (input.host !== undefined) patch.host = input.host;
    if (input.status !== undefined) patch.status = input.status;
    if (input.type !== undefined) patch.type = input.type;

    if (Object.keys(patch).length === 0) {
      return this.getByID(id);
    }

    await db
      .updateTable('emulate_target_filters')
      .set(patch as any)
      .where('id', '=', id)
      .execute();

    return this.getByID(id);
  }

  async delete(id: string): Promise<boolean> {
    const db = getDb();
    const res = await db
      .deleteFrom('emulate_target_filters')
      .where('id', '=', id)
      .executeTakeFirst();
    return Number(res.numDeletedRows || 0) > 0;
  }

  // upsert mirrors the Go Upsert(): one filter per target.
  async upsert(targetID: string, input: CreateTargetFilterInput): Promise<TargetFilter> {
    const existing = await this.getByTargetID(targetID);
    if (existing) {
      const updated = await this.update(existing.id, {
        method: input.method,
        host: input.host,
        status: input.status,
        type: input.type,
      });
      if (!updated) throw new Error(`filter vanished during upsert: ${targetID}`);
      return updated;
    }
    return this.create(input);
  }
}