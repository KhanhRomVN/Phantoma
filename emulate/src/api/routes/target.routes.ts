/**
 * Target routes — mounted at /emulate-targets.
 */

import { Router } from 'express';
import type { TargetController } from '../controllers/target.controller';

export function createTargetRoutes(controller: TargetController): Router {
  const router = Router();

  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:targetId', controller.get);
  router.put('/:targetId', controller.update);
  router.delete('/:targetId', controller.remove);
  router.post('/:targetId/use', controller.markUsed);

  return router;
}
