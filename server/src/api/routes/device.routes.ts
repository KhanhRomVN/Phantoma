import { Router } from 'express';
import type { AppContainer } from '../../bootstrap/container';
import { createDeviceController } from '../controllers/device.controller';

export function createDeviceRoutes(container: AppContainer): Router {
  const router = Router();
  router.get('/device-fingerprint', createDeviceController(container).fingerprint);
  return router;
}
