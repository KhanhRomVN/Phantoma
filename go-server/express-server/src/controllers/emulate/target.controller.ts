/**
 * ------------------------------------------------------------------
 * Target Controller
 * ------------------------------------------------------------------
 * Ported from internal/handler/emulate/emulate_target.go.
 * Validates input, delegates to TargetService, returns standardized JSON.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── External 
import { Request, Response, NextFunction } from 'express';

// ── Local 
import type { CreateTargetInput, UpdateTargetInput } from '../../domain/emulate';
import { json, fail } from '../../utils/response';
import { AppError } from '../../utils/api-error';
import { TargetService } from '../../services/emulate/target.service';

// ─── Helpers ────────────────────────────────────────────────────────────

function extractID(path: string, prefix: string): string {
  const trimmed = path.replace(prefix, '').replace(/\/$/, '');
  if (trimmed.includes('/')) return '';
  return trimmed;
}

// ─── Controller factory ────────────────────────────────────────────────

export function createTargetController(service: TargetService) {
  return {
    async list(req: Request, res: Response, next: NextFunction) {
      try {
        const targets = await service.getAll();
        json(res, 200, targets);
      } catch (err) { next(err); }
    },

    async getByID(req: Request, res: Response, next: NextFunction) {
      try {
        const id = extractID(req.path, '/emulate-targets/');
        if (!id) throw new AppError('missing target id', 400);

        const target = await service.getByID(id);
        if (!target) throw new AppError('target not found', 404);

        json(res, 200, target);
      } catch (err) { next(err); }
    },

    async create(req: Request, res: Response, next: NextFunction) {
      try {
        const input = req.body as CreateTargetInput;
        if (!input.title) throw new AppError('title is required', 400);

        const target = await service.create(input);
        json(res, 201, target);
      } catch (err) { next(err); }
    },

    async update(req: Request, res: Response, next: NextFunction) {
      try {
        const id = extractID(req.path, '/emulate-targets/');
        if (!id) throw new AppError('missing target id', 400);

        const input = req.body as UpdateTargetInput;
        const target = await service.update(id, input);
        if (!target) throw new AppError('target not found', 404);

        json(res, 200, target);
      } catch (err) { next(err); }
    },

    async delete(req: Request, res: Response, next: NextFunction) {
      try {
        const id = extractID(req.path, '/emulate-targets/');
        if (!id) throw new AppError('missing target id', 400);

        const deleted = await service.delete(id);
        if (!deleted) throw new AppError('target not found', 404);

        json(res, 200, { deleted: true });
      } catch (err) { next(err); }
    },

    async updateLastUsed(req: Request, res: Response, next: NextFunction) {
      try {
        // Path: /emulate-targets/{id}/use
        const parts = req.path.replace('/emulate-targets/', '').split('/');
        const id = parts[0];
        if (!id || parts.length < 2) throw new AppError('missing target id', 400);

        await service.updateLastUsed(id);
        json(res, 200, { success: true });
      } catch (err) { next(err); }
    },
  };
}