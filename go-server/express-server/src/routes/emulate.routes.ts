/**
 * ------------------------------------------------------------------
 * Emulate Routes
 * ------------------------------------------------------------------
 * Ported from internal/routes/emulate.go. Mounts all emulate-related
 * endpoints under /emulate-targets with the exact same URL shapes as
 * the Go server so the existing frontend needs no changes.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── External 
import { Router } from 'express';

// ── Local 
import { TargetService } from '../services/emulate/target.service';
import { FilterService } from '../services/emulate/filter.service';
import { RepeaterService } from '../services/emulate/repeater.service';
import { ReportService } from '../services/emulate/report.service';
import { createTargetController } from '../controllers/emulate/target.controller';
import { createFilterController } from '../controllers/emulate/filter.controller';
import { createRepeaterController } from '../controllers/emulate/repeater.controller';
import { createReportController } from '../controllers/emulate/report.controller';

// ─── Factory ────────────────────────────────────────────────────────────

export function registerEmulateRoutes(
  targetSvc: TargetService,
  filterSvc: FilterService,
  repeaterSvc: RepeaterService,
  reportSvc: ReportService,
): Router {
  const router = Router();

  const targetCtrl = createTargetController(targetSvc);
  const filterCtrl = createFilterController(filterSvc);
  const repeaterCtrl = createRepeaterController(repeaterSvc);
  const reportCtrl = createReportController(reportSvc);

  // Target CRUD
  router.get('/emulate-targets', targetCtrl.list);
  router.post('/emulate-targets', targetCtrl.create);
  router.get('/emulate-targets/:id', targetCtrl.getByID);
  router.put('/emulate-targets/:id', targetCtrl.update);
  router.delete('/emulate-targets/:id', targetCtrl.delete);
  router.post('/emulate-targets/:id/use', targetCtrl.updateLastUsed);

  // Filters
  router.get('/emulate-targets/:id/filter', filterCtrl.getByTargetID);
  router.put('/emulate-targets/:id/filter', filterCtrl.createOrUpdate);
  router.delete('/emulate-targets/:id/filter', filterCtrl.delete);

  // Repeater — Requests
  router.get('/emulate-targets/:targetId/repeater/requests', repeaterCtrl.listRequests);
  router.post('/emulate-targets/:targetId/repeater/requests', repeaterCtrl.createRequest);
  router.get('/emulate-targets/:targetId/repeater/requests/:requestId', repeaterCtrl.getRequest);
  router.put('/emulate-targets/:targetId/repeater/requests/:requestId', repeaterCtrl.updateRequest);
  router.delete('/emulate-targets/:targetId/repeater/requests/:requestId', repeaterCtrl.deleteRequest);

  // Repeater — Payloads
  router.get('/emulate-targets/:targetId/repeater/requests/:requestId/payloads', repeaterCtrl.listPayloads);
  router.put('/emulate-targets/:targetId/repeater/requests/:requestId/payloads', repeaterCtrl.upsertPayload);
  router.delete('/emulate-targets/:targetId/repeater/requests/:requestId/payloads/:payloadId', repeaterCtrl.deletePayload);

  // Repeater — History
  router.get('/emulate-targets/:targetId/repeater/history', repeaterCtrl.listHistoryByTarget);
  router.get('/emulate-targets/:targetId/repeater/requests/:requestId/history', repeaterCtrl.listHistoryByRequest);
  router.post('/emulate-targets/:targetId/repeater/requests/:requestId/history', repeaterCtrl.saveHistory);
  router.get('/emulate-targets/:targetId/repeater/history/:historyId/runs', repeaterCtrl.getHistoryRuns);
  router.delete('/emulate-targets/:targetId/repeater/history/:historyId', repeaterCtrl.deleteHistory);

  // Reports
  router.get('/emulate-targets/:targetId/reports', reportCtrl.listReports);
  router.post('/emulate-targets/:targetId/reports', reportCtrl.createReport);
  router.get('/emulate-targets/:targetId/reports/:reportId', reportCtrl.getReport);
  router.put('/emulate-targets/:targetId/reports/:reportId', reportCtrl.updateReport);
  router.delete('/emulate-targets/:targetId/reports/:reportId', reportCtrl.deleteReport);

  return router;
}