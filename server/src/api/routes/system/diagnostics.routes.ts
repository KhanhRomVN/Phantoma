import { Router } from 'express';
import type { AppContainer } from '../../../bootstrap/container';
import { createSystemDiagnosticsController } from '../../controllers/system-diagnostics.controller';

export function createDiagnosticsRoutes(container: AppContainer): Router {
  const router = Router();
  const ctrl = createSystemDiagnosticsController(container);

  router.get('/logs', ctrl.logs);
  router.get('/alerts', ctrl.alerts);
  router.patch('/alerts/rules/:id', ctrl.setAlertRule);
  router.get('/security', ctrl.security);

  return router;
}
