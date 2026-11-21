/**
 * ------------------------------------------------------------------
 * Target Controller
 * ------------------------------------------------------------------
 * HTTP handlers for /emulate-targets. Validates input, delegates to
 * TargetService, returns the standard JSON envelope.
 * ------------------------------------------------------------------
 */

import { asyncHandler } from '../middleware/async-handler.middleware';
import { AppError } from '../../errors/app.error';
import { json } from '../../utils/http-response.util';
import type { CreateTargetInput, UpdateTargetInput } from '../../domain';
import type { TargetService } from '../../services/emulate/target.service';

export class TargetController {
  constructor(private readonly service: TargetService) {}

  list = asyncHandler(async (_req, res) => {
    json(res, 200, await this.service.getAll());
  });

  create = asyncHandler(async (req, res) => {
    const input = req.body as CreateTargetInput;
    if (!input.title) throw new AppError('title is required', 400);

    json(res, 201, await this.service.create(input));
  });

  get = asyncHandler(async (req, res) => {
    const target = await this.service.getByID(req.params.targetId);
    if (!target) throw new AppError('target not found', 404);

    json(res, 200, target);
  });

  update = asyncHandler(async (req, res) => {
    const input = req.body as UpdateTargetInput;
    const target = await this.service.update(req.params.targetId, input);
    if (!target) throw new AppError('target not found', 404);

    json(res, 200, target);
  });

  remove = asyncHandler(async (req, res) => {
    const deleted = await this.service.delete(req.params.targetId);
    if (!deleted) throw new AppError('target not found', 404);

    json(res, 200, { deleted: true });
  });

  markUsed = asyncHandler(async (req, res) => {
    await this.service.updateLastUsed(req.params.targetId);
    json(res, 200, { success: true });
  });
}
