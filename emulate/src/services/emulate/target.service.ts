/**
 * ------------------------------------------------------------------
 * Target Service
 * ------------------------------------------------------------------
 * Ported from internal/service/emulate/emulate_target.go. Thin business
 * logic layer between controllers and repositories — stamps timestamps,
 * delegates persistence. Deleting a target also removes its data folder
 * (~/.phantoma/emulate/{id}).
 * ------------------------------------------------------------------
 */

// ─── Imports ───────────────────────────────────────────────────────────
// ── External
import fs from 'fs';

// ── Local
import { getTargetDir } from '../../config/paths.config';
import type { Target, CreateTargetInput, UpdateTargetInput } from '../../domain';
import { TargetRepository } from '../../repositories/target.repository';
import { isSafeId } from '../../utils/id.util';

// ─── Service ────────────────────────────────────────────────────────────

export class TargetService {
  constructor(private repo: TargetRepository) {}

  async getAll(): Promise<Target[]> {
    return this.repo.getAll();
  }

  async getByID(id: string): Promise<Target | null> {
    return this.repo.getByID(id);
  }

  async create(input: CreateTargetInput): Promise<Target> {
    const now = Math.floor(Date.now() / 1000);
    return this.repo.create(input, now);
  }

  async update(id: string, input: UpdateTargetInput): Promise<Target | null> {
    const now = Math.floor(Date.now() / 1000);
    return this.repo.update(id, input, now);
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.repo.delete(id);
    if (deleted && isSafeId(id)) {
      fs.rmSync(getTargetDir(id), { recursive: true, force: true });
    }
    return deleted;
  }

  async updateLastUsed(id: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await this.repo.updateLastUsed(id, now);
  }
}