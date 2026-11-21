/**
 * Capture-method routes — mounted at /capture-methods.
 */

import { Router } from 'express';
import { captureMethodController } from '../controllers/capture-method.controller';

export function createCaptureMethodRoutes(): Router {
  const router = Router();

  router.get('/:platform', captureMethodController.listByPlatform);

  return router;
}
