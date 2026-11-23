/**
 * ------------------------------------------------------------------
 * Root API Router
 * ------------------------------------------------------------------
 *   GET  /health
 *   /api/v1/browser/*   quản lý browser fork
 *   /api/v1/system/*    device fingerprint + System Monitor
 * ------------------------------------------------------------------
 */

import { Router } from 'express';
import type { AppContainer } from '../../bootstrap/container';
import { API_PREFIX, HEALTH_PATH } from '../../constants';
import { createBrowserRoutes } from './browser.routes';
import { createDeviceRoutes } from './device.routes';
import { createHealthRoutes } from './health.routes';
import { createSystemRoutes } from './system';

export function createApiRouter(container: AppContainer): Router {
  const router = Router();

  router.use(HEALTH_PATH, createHealthRoutes());
  router.use(`${API_PREFIX}/browser`, createBrowserRoutes(container));
  // device-fingerprint đứng trước để không bị local-only guard của /system/* chặn
  router.use(`${API_PREFIX}/system`, createDeviceRoutes(container));
  router.use(`${API_PREFIX}/system`, createSystemRoutes(container));

  return router;
}
