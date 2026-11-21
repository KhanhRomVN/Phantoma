/**
 * Fuzzer routes — mounted at /targets.
 *
 *   /:targetId/fuzzers/requests[/:requestId][/payloads[/:payloadId]]
 *   /:targetId/fuzzers/requests/:requestId/history
 *   /:targetId/fuzzers/history[/:historyId[/runs]]
 */

import { Router } from 'express';
import type { FuzzerController } from '../controllers/fuzzer.controller';

export function createFuzzerRoutes(controller: FuzzerController): Router {
  const router = Router();
  const base = '/:targetId/fuzzers';

  // Requests
  router.get(`${base}/requests`, controller.listRequests);
  router.post(`${base}/requests`, controller.createRequest);
  router.get(`${base}/requests/:requestId`, controller.getRequest);
  router.put(`${base}/requests/:requestId`, controller.updateRequest);
  router.delete(`${base}/requests/:requestId`, controller.removeRequest);

  // Payloads
  router.get(`${base}/requests/:requestId/payloads`, controller.listPayloads);
  router.put(`${base}/requests/:requestId/payloads`, controller.upsertPayload);
  router.delete(`${base}/requests/:requestId/payloads/:payloadId`, controller.removePayload);

  // History
  router.get(`${base}/history`, controller.listHistoryByTarget);
  router.get(`${base}/requests/:requestId/history`, controller.listHistoryByRequest);
  router.post(`${base}/requests/:requestId/history`, controller.saveHistory);
  router.get(`${base}/history/:historyId/runs`, controller.listHistoryRuns);
  router.delete(`${base}/history/:historyId`, controller.removeHistory);

  return router;
}