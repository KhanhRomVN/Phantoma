/**
 * ------------------------------------------------------------------
 * Target Repository
 * ------------------------------------------------------------------
 * Ported from internal/repository/emulate/emulate_target.go. Uses Kysely
 * for typed SQLite queries against emulate_targets.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Local ─
import { getDb } from '../../database/connection';
import type {
  Target,
  CreateTargetInput,
  UpdateTargetInput,
} from '../../domain/emulate';
import { createLogger, F } from '../../utils/logger';

// ─── Constants ─────────────────────────────────────────────────────────
const logger = createLogger('TargetRepository');

function generateID(): string {
  return Date.now().toString(16) + Math.random().toString(16).slice(2);
}

// ─── Repository ─────────────────────────────────────────────────────────

export class TargetRepository {
  async getAll(): Promise<Target[]> {
    const db = getDb();
    const rows = await db
      .selectFrom('emulate_targets')
      .selectAll()
      .orderBy('updated_at', 'desc')
      .execute();
    return rows as unknown as Target[];
  }

  async getByID(id: string): Promise<Target | null> {
    const db = getDb();
    const row = await db
      .selectFrom('emulate_targets')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return (row as unknown as Target) ?? null;
  }

  async create(input: CreateTargetInput, now: number): Promise<Target> {
    const db = getDb();
    const id = input.id && input.id !== '' ? input.id : generateID();

    logger.info('[Repository] Creating target', F('id', id), F('title', input.title));

    await db
      .insertInto('emulate_targets')
      .values({
        id,
        title: input.title,
        url: input.url ?? null,
        icon: input.icon ?? null,
        platform: input.platform ?? null,
        executable_path: input.executable_path ?? null,
        startup_args: input.startup_args ?? null,
        environment: input.environment ?? null,
        created_at: now,
        updated_at: now,
      })
      .execute();

    const created = await this.getByID(id);
    if (!created) throw new Error(`target not found after insert: ${id}`);
    return created;
  }

  async update(id: string, input: UpdateTargetInput, now: number): Promise<Target | null> {
    const db = getDb();

    const patch: Record<string, unknown> = { updated_at: now };
    if (input.title !== undefined) patch.title = input.title;
    if (input.url !== undefined) patch.url = input.url;
    if (input.icon !== undefined) patch.icon = input.icon;
    if (input.platform !== undefined) patch.platform = input.platform;
    if (input.last_used_at !== undefined) patch.last_used_at = input.last_used_at;
    if (input.executable_path !== undefined) patch.executable_path = input.executable_path;
    if (input.startup_args !== undefined) patch.startup_args = input.startup_args;
    if (input.environment !== undefined) patch.environment = input.environment;

    const res = await db
      .updateTable('emulate_targets')
      .set(patch as any)
      .where('id', '=', id)
      .executeTakeFirst();

    if (Number(res.numUpdatedRows || 0) === 0) return null;
    return this.getByID(id);
  }

  async delete(id: string): Promise<boolean> {
    const db = getDb();
    const res = await db
      .deleteFrom('emulate_targets')
      .where('id', '=', id)
      .executeTakeFirst();
    return Number(res.numDeletedRows || 0) > 0;
  }

  async updateLastUsed(id: string, timestamp: number): Promise<void> {
    const db = getDb();
    const res = await db
      .updateTable('emulate_targets')
      .set({ last_used_at: timestamp, updated_at: timestamp })
      .where('id', '=', id)
      .executeTakeFirst();
    if (Number(res.numUpdatedRows || 0) === 0) {
      throw new Error(`target not found: ${id}`);
    }
  }
}