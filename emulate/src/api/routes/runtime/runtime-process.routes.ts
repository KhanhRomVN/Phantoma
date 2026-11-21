/**
 * Runtime process routes — mounted at /runtime.
 */

import { Router } from 'express';
import { runtimeProcessController } from '../../controllers/runtime-process.controller';

export function createRuntimeProcessRoutes(): Router {
  const router = Router();

  router.post('/launch', runtimeProcessController.launch);
  router.post('/terminate', runtimeProcessController.terminate);
  router.get('/health', runtimeProcessController.health);
  router.post('/targets/register', runtimeProcessController.registerTarget);

  return router;
}
