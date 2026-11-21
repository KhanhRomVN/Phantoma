/**
 * ------------------------------------------------------------------
 * Fuzzer Controller
 * ------------------------------------------------------------------
 * HTTP handlers for /targets/:targetId/fuzzers/*:
 * requests, payloads and run history.
 * ------------------------------------------------------------------
 */

import { asyncHandler } from '../middleware/async-handler.middleware';
import { AppError } from '../../errors/app.error';
import { json } from '../../utils/http-response.util';
import type {
  CreateFuzzerHistoryInput,
  CreateFuzzerHistoryRunInput,
  CreateFuzzerInput,
  UpdateFuzzerInput,
  UpsertFuzzerPayloadInput,
} from '../../domain';
import type { FuzzerService } from '../../services/emulate/fuzzer.service';

export class FuzzerController {
  constructor(private readonly service: FuzzerService) {}

  // ─── Requests ────────────────────────────────────────────────────────

  listRequests = asyncHandler(async (req, res) => {
    json(res, 200, await this.service.listFuzzers(req.params.targetId));
  });

  createRequest = asyncHandler(async (req, res) => {
    const input = req.body as CreateFuzzerInput;
    input.target_id = req.params.targetId;
    if (!input.method) input.method = 'GET';
    if (!input.url) throw new AppError('url is required', 400);

    json(res, 201, await this.service.createFuzzer(input));
  });

  getRequest = asyncHandler(async (req, res) => {
    const request = await this.service.getFuzzer(req.params.targetId, req.params.requestId);
    if (!request) throw new AppError('request not found', 404);

    json(res, 200, request);
  });

  updateRequest = asyncHandler(async (req, res) => {
    const input = req.body as UpdateFuzzerInput;
    const updated = await this.service.updateFuzzer(req.params.targetId, req.params.requestId, input);
    if (!updated) throw new AppError('request not found', 404);

    json(res, 200, updated);
  });

  removeRequest = asyncHandler(async (req, res) => {
    const deleted = await this.service.deleteFuzzer(req.params.targetId, req.params.requestId);
    if (!deleted) throw new AppError('request not found', 404);

    json(res, 200, { deleted: true });
  });

  // ─── Payloads ────────────────────────────────────────────────────────

  listPayloads = asyncHandler(async (req, res) => {
    json(res, 200, await this.service.listPayloads(req.params.targetId, req.params.requestId));
  });

  upsertPayload = asyncHandler(async (req, res) => {
    const input = req.body as UpsertFuzzerPayloadInput;
    if (!input.name) throw new AppError('name is required', 400);

    const payload = await this.service.upsertPayload(req.params.targetId, req.params.requestId, input);
    if (!payload) throw new AppError('request not found', 404);

    json(res, 200, payload);
  });

  removePayload = asyncHandler(async (req, res) => {
    const deleted = await this.service.deletePayload(
      req.params.targetId,
      req.params.requestId,
      req.params.payloadId,
    );
    if (!deleted) throw new AppError('payload not found', 404);

    json(res, 200, { deleted: true });
  });

  // ─── History ─────────────────────────────────────────────────────────

  listHistoryByTarget = asyncHandler(async (req, res) => {
    json(res, 200, await this.service.getHistoryByTarget(req.params.targetId));
  });

  listHistoryByRequest = asyncHandler(async (req, res) => {
    json(res, 200, await this.service.getHistoryByFuzzer(req.params.targetId, req.params.requestId));
  });

  saveHistory = asyncHandler(async (req, res) => {
    const body = req.body as {
      history: CreateFuzzerHistoryInput;
      runs: CreateFuzzerHistoryRunInput[];
    };
    body.history.fuzzer_id = req.params.requestId;

    const saved = await this.service.saveHistory(
      req.params.targetId,
      req.params.requestId,
      body.history,
      body.runs ?? [],
    );
    if (!saved) throw new AppError('request not found', 404);

    json(res, 201, saved);
  });

  listHistoryRuns = asyncHandler(async (req, res) => {
    json(res, 200, await this.service.getRunsByHistory(req.params.targetId, req.params.historyId));
  });

  removeHistory = asyncHandler(async (req, res) => {
    const deleted = await this.service.deleteHistory(req.params.targetId, req.params.historyId);
    if (!deleted) throw new AppError('history not found', 404);

    json(res, 200, { deleted: true });
  });
}