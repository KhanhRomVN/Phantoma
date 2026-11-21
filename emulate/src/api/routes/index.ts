/**
 * ------------------------------------------------------------------
 * Route Registry
 * ------------------------------------------------------------------
 * Single place that shows the whole HTTP surface of the service:
 *
 *   /health                         liveness probe
 *   /sessions, /breakpoints, ...    MITM proxy control (root level)
 *   /api/v1/targets/...             Target, filter, report, fuzzer CRUD
 *   /api/v1/capture-methods/...     Capture-method catalogue
 *   /api/v1/runtime/...             Runtime: launch, CDP, eBPF, mobile
 *   /api/v1/events                  SSE stream of runtime events
 * ------------------------------------------------------------------
 */

import { Router, type Application } from 'express';
import { API_V1_PREFIX } from '../../constants';
import type { Container } from '../../bootstrap/container';
import { runtimeEventsController } from '../controllers/runtime-events.controller';
import { TargetController } from '../controllers/target.controller';
import { TargetFilterController } from '../controllers/target-filter.controller';
import { FuzzerController } from '../controllers/fuzzer.controller';
import { ReportController } from '../controllers/report.controller';
import { createHealthRoutes } from './health.routes';
import { createProxyRoutes } from './proxy.routes';
import { createTargetRoutes } from './target.routes';
import { createTargetFilterRoutes } from './target-filter.routes';
import { createFuzzerRoutes } from './fuzzer.routes';
import { createReportRoutes } from './report.routes';
import { createCaptureMethodRoutes } from './capture-method.routes';
import { createRuntimeRoutes } from './runtime';

function createApiV1Router(container: Container): Router {
  const router = Router();

  const targetController = new TargetController(container.targetService);
  const targetFilterController = new TargetFilterController(container.targetFilterService);
  const fuzzerController = new FuzzerController(container.fuzzerService);
  const reportController = new ReportController(container.reportService);

  // /targets/*
  const targets = Router();
  targets.use(createTargetRoutes(targetController));
  targets.use(createTargetFilterRoutes(targetFilterController));
  targets.use(createFuzzerRoutes(fuzzerController));
  targets.use(createReportRoutes(reportController));
  router.use('/targets', targets);

  router.use('/capture-methods', createCaptureMethodRoutes());
  router.use('/runtime', createRuntimeRoutes());
  router.get('/events', runtimeEventsController.stream);

  return router;
}

export function registerRoutes(app: Application, container: Container): void {
  app.use(createHealthRoutes());
  app.use(createProxyRoutes());
  app.use(API_V1_PREFIX, createApiV1Router(container));
}