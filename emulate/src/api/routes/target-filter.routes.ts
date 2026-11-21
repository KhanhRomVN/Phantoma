/**
 * Target filter routes — mounted at /emulate-targets.
 */

import { Router } from 'express';
import type { TargetFilterController } from '../controllers/target-filter.controller';

export function createTargetFilterRoutes(controller: TargetFilterController): Router {
  const router = Router();

  router.get('/:targetId/filter', controller.get);
  router.put('/:targetId/filter', controller.upsert);
  router.delete('/:targetId/filter', controller.remove);

  return router;
}
