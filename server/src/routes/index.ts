/**
 * ------------------------------------------------------------------
 * Root API Router
 * ------------------------------------------------------------------
 * Ported from internal/routes/routes.go. Wires up repositories → services
 * → controllers and mounts every route group under /api/v1, plus the
 * standalone /health endpoint outside the versioned prefix.
 * ------------------------------------------------------------------
 */

// ─── Imports ───────────────────────────────────────────────────────────
// ── External 
import { Router } from 'express';

// ── Repositories ─
import { TargetRepository } from '../repositories/emulate/target.repository';
import { FilterRepository } from '../repositories/emulate/filter.repository';
import { RepeaterRepository } from '../repositories/emulate/repeater.repository';
import { ReportRepository } from '../repositories/emulate/report.repository';

// ── Services 
import { TargetService } from '../services/emulate/target.service';
import { FilterService } from '../services/emulate/filter.service';
import { RepeaterService } from '../services/emulate/repeater.service';
import { ReportService } from '../services/emulate/report.service';

// ── Route groups ─
import { registerEmulateRoutes } from './emulate.routes';
import { registerDatabaseRoutes } from './database.routes';
import { registerRuntimeRoutes } from './runtime.routes';
import { handler as healthHandler } from '../controllers/health.controller';

// ─── Factory ────────────────────────────────────────────────────────────

export function createApiRouter(): Router {
  const router = Router();

  // Health check lives at the root, not under /api/v1 (matches Go server).
  router.get('/health', healthHandler);

  // Initialize repositories
  const targetRepo = new TargetRepository();
  const filterRepo = new FilterRepository();
  const repeaterRepo = new RepeaterRepository();
  const reportRepo = new ReportRepository();

  // Initialize services
  const targetSvc = new TargetService(targetRepo);
  const filterSvc = new FilterService(filterRepo);
  const repeaterSvc = new RepeaterService(repeaterRepo);
  const reportSvc = new ReportService(reportRepo);

  // Versioned API surface
  const v1 = Router();
  v1.use(registerEmulateRoutes(targetSvc, filterSvc, repeaterSvc, reportSvc));
  v1.use(registerRuntimeRoutes());
  v1.use(registerDatabaseRoutes());
  router.use('/api/v1', v1);

  return router;
}