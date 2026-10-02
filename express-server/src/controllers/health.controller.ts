/**
 * ------------------------------------------------------------------
 * Health Controller
 * ------------------------------------------------------------------
 * Ported from internal/handler/health/health.go. Simple liveness probe.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── External 
import { Request, Response } from 'express';

// ── Local 
import { json } from '../utils/response';

// ─── Controller ───────────────────────────────────────────────────────

export const handler = (_req: Request, res: Response) => {
  json(res, 200, { status: 'ok', service: 'phantoma-server' });
};