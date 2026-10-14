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

// ─── Factory ────────────────────────────────────────────────────────────

export function createApiRouter(): Router {
  const router = Router();

  // Health check lives at the root.
  router.get('/health', healthHandler);

  return router;
}