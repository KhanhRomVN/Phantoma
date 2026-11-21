/**
 * ------------------------------------------------------------------
 * Target Filter Controller
 * ------------------------------------------------------------------
 * HTTP handlers for /emulate-targets/:targetId/filter (one filter per target).
 * ------------------------------------------------------------------
 */

import { asyncHandler } from '../middleware/async-handler.middleware';
import { AppError } from '../../errors/app.error';
import { json } from '../../utils/http-response.util';
import type { CreateTargetFilterInput } from '../../domain';
import type { TargetFilterService } from '../../services/emulate/target-filter.service';

export class TargetFilterController {
  constructor(private readonly service: TargetFilterService) {}

  get = asyncHandler(async (req, res) => {
    const filter = await this.service.getByTargetID(req.params.targetId);
    if (!filter) throw new AppError('filter not found', 404);

    json(res, 200, filter);
  });

  upsert = asyncHandler(async (req, res) => {
    const { targetId } = req.params;
    const input = req.body as CreateTargetFilterInput;
    input.target_id = targetId;

    json(res, 200, await this.service.createOrUpdate(targetId, input));
  });

  remove = asyncHandler(async (req, res) => {
    const filter = await this.service.getByTargetID(req.params.targetId);
    if (!filter) throw new AppError('filter not found', 404);

    const deleted = await this.service.delete(filter.id);
    if (!deleted) throw new AppError('filter not found', 404);

    json(res, 200, { deleted: true });
  });
}
