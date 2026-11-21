/**
 * Report routes — mounted at /emulate-targets.
 */

import { Router } from 'express';
import type { ReportController } from '../controllers/report.controller';

export function createReportRoutes(controller: ReportController): Router {
  const router = Router();

  router.get('/:targetId/reports', controller.list);
  router.post('/:targetId/reports', controller.create);
  router.get('/:targetId/reports/:reportId', controller.get);
  router.put('/:targetId/reports/:reportId', controller.update);
  router.delete('/:targetId/reports/:reportId', controller.remove);

  return router;
}
