import { Router } from 'express';
import type { AppContainer } from '../../../bootstrap/container';
import { config } from '../../../config';
import { createLocalOnlyGuard } from '../../middleware/local-only.middleware';
import { createDiagnosticsRoutes } from './diagnostics.routes';
import { createMonitorRoutes } from './monitor.routes';
import { createRuntimeRoutes } from './runtime.routes';

/** Toàn bộ `/system/*` (trừ device-fingerprint) — mặc định chỉ cho phép loopback. */
export function createSystemRoutes(container: AppContainer): Router {
  const router = Router();
  router.use(createLocalOnlyGuard(config.system.allowRemote));
  router.use(createMonitorRoutes(container));
  router.use(createRuntimeRoutes(container));
  router.use(createDiagnosticsRoutes(container));
  return router;
}
