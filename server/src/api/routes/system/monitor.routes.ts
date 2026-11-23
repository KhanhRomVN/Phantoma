import { Router } from 'express';
import type { AppContainer } from '../../../bootstrap/container';
import { createSystemMonitorController } from '../../controllers/system-monitor.controller';

export function createMonitorRoutes(container: AppContainer): Router {
  const router = Router();
  const ctrl = createSystemMonitorController(container);

  router.get('/overview', ctrl.overview);
  router.get('/metrics', ctrl.metrics);
  router.get('/metrics/history', ctrl.history);
  router.get('/stream', ctrl.stream);
  router.get('/cpu', ctrl.cpu);
  router.get('/memory', ctrl.memory);
  router.get('/gpu', ctrl.gpu);
  router.get('/storage', ctrl.storage);
  router.get('/network', ctrl.network);
  router.get('/sensors', ctrl.sensors);

  return router;
}
