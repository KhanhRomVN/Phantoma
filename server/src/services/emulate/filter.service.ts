/**
 * ------------------------------------------------------------------
 * Filter Service
 * ------------------------------------------------------------------
 * Ported from internal/service/emulate/emulate_target_filter.go.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Local 
import type { TargetFilter, CreateTargetFilterInput } from '../../domain/emulate';
import { FilterRepository } from '../../repositories/emulate/filter.repository';

// ─── Service ────────────────────────────────────────────────────────────

export class FilterService {
  constructor(private repo: FilterRepository) {}

  async getByTargetID(targetID: string): Promise<TargetFilter | null> {
    return this.repo.getByTargetID(targetID);
  }

  async createOrUpdate(targetID: string, input: CreateTargetFilterInput): Promise<TargetFilter> {
    return this.repo.upsert(targetID, input);
  }

  async delete(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }
}