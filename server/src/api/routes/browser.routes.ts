import { Router } from 'express';
import type { AppContainer } from '../../bootstrap/container';
import { createBrowserController } from '../controllers/browser.controller';

export function createBrowserRoutes(container: AppContainer): Router {
  const router = Router();
  const ctrl = createBrowserController(container);

  router.get('/forks', ctrl.listForks);
  router.get('/forks/:id/path', ctrl.forkPath);
  router.get('/updates', ctrl.updateStatus);
  router.post('/updates/check', ctrl.checkUpdates);
  router.post('/updates/:id/install', ctrl.installUpdate);

  return router;
}
