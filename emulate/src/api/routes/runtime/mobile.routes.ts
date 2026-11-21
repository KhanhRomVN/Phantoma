/**
 * Mobile device routes — mounted at /runtime/mobile.
 */

import { Router } from 'express';
import { mobileController } from '../../controllers/mobile.controller';

export function createMobileRoutes(): Router {
  const router = Router();

  router.get('/devices', mobileController.listDevices);
  router.post('/apps/list', mobileController.listApps);
  router.post('/provision', mobileController.provision);

  router.post('/logcat/start', mobileController.startLogcat);
  router.post('/logcat/stop', mobileController.stopLogcat);

  router.post('/ssl-bypass/start', mobileController.startSslBypass);
  router.post('/ssl-bypass/stop', mobileController.stopSslBypass);

  router.post('/transparent-proxy/start', mobileController.startTransparentProxy);
  router.post('/transparent-proxy/stop', mobileController.stopTransparentProxy);
  router.get('/transparent-proxy/:sessionId', mobileController.transparentProxyStatus);

  return router;
}
