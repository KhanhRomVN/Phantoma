/**
 * ------------------------------------------------------------------
 * Root API Router
 * ------------------------------------------------------------------
 * Simplified to serve only the Health Check endpoint. All business logic
 * for Emulate has been moved to Phantoma/emulate service.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── External 
import { Router } from 'express';

// ── Controllers 
import { handler as healthHandler } from '../controllers/health.controller';

// ── Routes 
import { registerBrowserRoutes } from './browser.routes';
import { registerSystemRoutes } from './system.routes';

// ─── Factory ────────────────────────────────────────────────────────────

export function createApiRouter(): Router {
  const router = Router();

  // Health check lives at the root.
  router.get('/health', healthHandler);
  router.use('/api/v1', registerBrowserRoutes());
  router.use('/api/v1', registerSystemRoutes());

  return router;
}