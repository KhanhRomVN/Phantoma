import { Router } from 'express';
import type { AppContainer } from '../../../bootstrap/container';
import { createSystemRuntimeController } from '../../controllers/system-runtime.controller';

export function createRuntimeRoutes(container: AppContainer): Router {
  const router = Router();
  const ctrl = createSystemRuntimeController(container);

  router.get('/processes', ctrl.processes);
  router.get('/services', ctrl.services);
  router.post('/services/:name/:action', ctrl.controlService);
  router.get('/containers', ctrl.containers);
  router.get('/ports', ctrl.ports);

  return router;
}
