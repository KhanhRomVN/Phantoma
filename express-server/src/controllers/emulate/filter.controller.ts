/**
 * ------------------------------------------------------------------
 * Filter Controller
 * ------------------------------------------------------------------
 * Ported from internal/handler/emulate/emulate_target_filter.go.
 * Note: the Go version had debug println() calls — those are intentionally
 * omitted here since proper structured logging replaces them.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── External 
import { Request, Response, NextFunction } from 'express';

// ── Local 
import type { CreateTargetFilterInput } from '../../domain/emulate';
import { json, fail } from '../../utils/response';
import { AppError } from '../../utils/api-error';
import { FilterService } from '../../services/emulate/filter.service';

// ─── Helpers ───────────────────────────────────────────────────────────

function extractFilterTargetID(path: string): string {
  let id = path.replace('/emulate-targets/', '');
  id = id.replace(/\/filter$/, '');
  id = id.replace(/\/$/, '');
  return id;
}

// ─── Controller factory ────────────────────────────────────────────────

export function createFilterController(service: FilterService) {
  return {
    async getByTargetID(req: Request, res: Response, next: NextFunction) {
      try {
        const targetID = extractFilterTargetID(req.path);
        if (!targetID) throw new AppError('missing target id', 400);

        const filter = await service.getByTargetID(targetID);
        if (!filter) throw new AppError('filter not found', 404);

        json(res, 200, filter);
      } catch (err) { next(err); }
    },

    async createOrUpdate(req: Request, res: Response, next: NextFunction) {
      try {
        const targetID = extractFilterTargetID(req.path);
        if (!targetID) throw new AppError('missing target id', 400);

        const input = req.body as CreateTargetFilterInput;
        input.emulate_target_id = targetID;

        const filter = await service.createOrUpdate(targetID, input);
        json(res, 200, filter);
      } catch (err) { next(err); }
    },

    async delete(req: Request, res: Response, next: NextFunction) {
      try {
        const targetID = extractFilterTargetID(req.path);
        if (!targetID) throw new AppError('missing target id', 400);

        const filter = await service.getByTargetID(targetID);
        if (!filter) throw new AppError('filter not found', 404);

        const deleted = await service.delete(filter.id);
        if (!deleted) throw new AppError('filter not found', 404);

        json(res, 200, { deleted: true });
      } catch (err) { next(err); }
    },
  };
}