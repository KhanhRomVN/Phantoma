/**
 * CDP + browser-control routes — mounted at /runtime.
 */

import { Router } from 'express';
import { cdpController } from '../../controllers/cdp.controller';

export function createCdpRoutes(): Router {
  const router = Router();

  router.post('/cdp/connect', cdpController.connect);
  router.post('/cdp/disconnect', cdpController.disconnect);
  router.post('/cdp/reload', cdpController.reload);
  router.post('/cdp/navigate', cdpController.navigate);
  router.post('/cdp/inject-border', cdpController.injectBorder);
  router.get('/cdp/state', cdpController.state);

  router.post('/browser/:tool', cdpController.executeTool);

  return router;
}
