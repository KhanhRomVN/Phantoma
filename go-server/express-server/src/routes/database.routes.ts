/**
 * ------------------------------------------------------------------
 * Database Routes
 * ------------------------------------------------------------------
 * Ported from internal/routes/database.go. Two endpoints for reading and
 * hot-swapping the active SQLite path.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── External 
import { Router } from 'express';

// ── Local 
import { getPath, updatePath } from '../controllers/database.controller';

// ─── Registration ──────────────────────────────────────────────────────

export function registerDatabaseRoutes(): Router {
  const router = Router();
  router.get('/database/path', getPath);
  router.put('/database/path', updatePath);
  return router;
}