/**
 * ------------------------------------------------------------------
 * Target Service
 * ------------------------------------------------------------------
 * Ported from internal/service/emulate/emulate_target.go. Thin business
 * logic layer between controllers and repositories — stamps timestamps,
 * delegates persistence.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Local 
import type { Target, CreateTargetInput, UpdateTargetInput } from '../../domain/emulate';
import { TargetRepository } from '../../repositories/emulate/target.repository';

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
    return this.repo.delete(id);
  }

  async updateLastUsed(id: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await this.repo.updateLastUsed(id, now);
  }
}