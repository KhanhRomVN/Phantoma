/**
 * ------------------------------------------------------------------
 * Repeater Controller
 * ------------------------------------------------------------------
 * Ported from internal/handler/emulate/repeater.go. Handles requests,
 * payloads, history and runs sub-resources under /emulate-targets/{id}/repeater/.
 * Path extraction helpers mirror the Go versions exactly so URL shapes
 * stay wire-compatible with the existing frontend.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── External 
import { Request, Response, NextFunction } from 'express';

// ── Local 
import type {
  CreateRepeaterRequestInput,
  UpdateRepeaterRequestInput,
  CreateRepeaterPayloadInput,
  CreateRepeaterHistoryInput,
  CreateRepeaterHistoryRunInput,
} from '../../domain/emulate';
import { json, fail } from '../../utils/response';
import { AppError } from '../../utils/api-error';
import { RepeaterService } from '../../services/emulate/repeater.service';

// ─── Path extraction helpers ────────────────────────────────────────────

function extractRepeaterTargetID(path: string): string {
  const trimmed = path.replace('/emulate-targets/', '');
  const parts = trimmed.split('/');
  return parts[0] || '';
}

function extractRepeaterRequestID(path: string): string {
  const idx = path.indexOf('/repeater/requests/');
  if (idx === -1) return '';
  const rest = path.slice(idx + '/repeater/requests/'.length);
  const parts = rest.split('/');
  return parts[0] || '';
}

function extractRepeaterHistoryID(path: string): string {
  const idx = path.indexOf('/repeater/history/');
  if (idx === -1) return '';
  const rest = path.slice(idx + '/repeater/history/'.length);
  const parts = rest.split('/');
  return parts[0] || '';
}

function extractLastPathSegment(path: string): string {
  const trimmed = path.replace(/\/$/, '');
  const parts = trimmed.split('/');
  return parts[parts.length - 1] || '';
}

// ─── Controller factory ────────────────────────────────────────────────

export function createRepeaterController(service: RepeaterService) {
  return {
    // =========================================================================
    // Requests
    // =========================================================================

    async listRequests(req: Request, res: Response, next: NextFunction) {
      try {
        const targetID = extractRepeaterTargetID(req.path);
        if (!targetID) throw new AppError('missing target id', 400);
        const requests = await service.getRequestsByTarget(targetID);
        json(res, 200, requests);
      } catch (err) { next(err); }
    },

    async getRequest(req: Request, res: Response, next: NextFunction) {
      try {
        const requestID = extractRepeaterRequestID(req.path);
        if (!requestID) throw new AppError('missing request id', 400);
        const reqObj = await service.getRequestByID(requestID);
        if (!reqObj) throw new AppError('request not found', 404);
        json(res, 200, reqObj);
      } catch (err) { next(err); }
    },

    async createRequest(req: Request, res: Response, next: NextFunction) {
      try {
        const targetID = extractRepeaterTargetID(req.path);
        if (!targetID) throw new AppError('missing target id', 400);

        const input = req.body as CreateRepeaterRequestInput;
        input.emulate_target_id = targetID;
        if (!input.method) input.method = 'GET';
        if (!input.url) throw new AppError('url is required', 400);

        const created = await service.createRequest(input);
        json(res, 201, created);
      } catch (err) { next(err); }
    },

    async updateRequest(req: Request, res: Response, next: NextFunction) {
      try {
        const requestID = extractRepeaterRequestID(req.path);
        if (!requestID) throw new AppError('missing request id', 400);

        const input = req.body as UpdateRepeaterRequestInput;
        const updated = await service.updateRequest(requestID, input);
        if (!updated) throw new AppError('request not found', 404);

        json(res, 200, updated);
      } catch (err) { next(err); }
    },

    async deleteRequest(req: Request, res: Response, next: NextFunction) {
      try {
        const requestID = extractRepeaterRequestID(req.path);
        if (!requestID) throw new AppError('missing request id', 400);

        const deleted = await service.deleteRequest(requestID);
        if (!deleted) throw new AppError('request not found', 404);

        json(res, 200, { deleted: true });
      } catch (err) { next(err); }
    },

    // =========================================================================
    // Payloads
    // =========================================================================

    async listPayloads(req: Request, res: Response, next: NextFunction) {
      try {
        const requestID = extractRepeaterRequestID(req.path);
        if (!requestID) throw new AppError('missing request id', 400);
        const payloads = await service.getPayloadsByRequest(requestID);
        json(res, 200, payloads);
      } catch (err) { next(err); }
    },

    async upsertPayload(req: Request, res: Response, next: NextFunction) {
      try {
        const requestID = extractRepeaterRequestID(req.path);
        if (!requestID) throw new AppError('missing request id', 400);

        const input = req.body as CreateRepeaterPayloadInput;
        if (!input.name) throw new AppError('name is required', 400);

        const payload = await service.createOrUpdatePayload(requestID, input);
        json(res, 200, payload);
      } catch (err) { next(err); }
    },

    async deletePayload(req: Request, res: Response, next: NextFunction) {
      try {
        const payloadID = extractLastPathSegment(req.path);
        if (!payloadID) throw new AppError('missing payload id', 400);

        const deleted = await service.deletePayload(payloadID);
        if (!deleted) throw new AppError('payload not found', 404);

        json(res, 200, { deleted: true });
      } catch (err) { next(err); }
    },

    // =========================================================================
    // History
    // =========================================================================

    async listHistoryByTarget(req: Request, res: Response, next: NextFunction) {
      try {
        const targetID = extractRepeaterTargetID(req.path);
        if (!targetID) throw new AppError('missing target id', 400);
        const history = await service.getHistoryByTarget(targetID);
        json(res, 200, history);
      } catch (err) { next(err); }
    },

    async listHistoryByRequest(req: Request, res: Response, next: NextFunction) {
      try {
        const requestID = extractRepeaterRequestID(req.path);
        if (!requestID) throw new AppError('missing request id', 400);
        const history = await service.getHistoryByRequest(requestID);
        json(res, 200, history);
      } catch (err) { next(err); }
    },

    async saveHistory(req: Request, res: Response, next: NextFunction) {
      try {
        const requestID = extractRepeaterRequestID(req.path);
        if (!requestID) throw new AppError('missing request id', 400);

        const body = req.body as {
          history: CreateRepeaterHistoryInput;
          runs: CreateRepeaterHistoryRunInput[];
        };
        body.history.emulate_repeater_request_id = requestID;

        const history = await service.saveHistory(body.history, body.runs ?? []);
        json(res, 201, history);
      } catch (err) { next(err); }
    },

    async getHistoryRuns(req: Request, res: Response, next: NextFunction) {
      try {
        const historyID = extractRepeaterHistoryID(req.path);
        if (!historyID) throw new AppError('missing history id', 400);
        const runs = await service.getRunsByHistory(historyID);
        json(res, 200, runs);
      } catch (err) { next(err); }
    },

    async deleteHistory(req: Request, res: Response, next: NextFunction) {
      try {
        const historyID = extractRepeaterHistoryID(req.path);
        if (!historyID) throw new AppError('missing history id', 400);

        const deleted = await service.deleteHistory(historyID);
        if (!deleted) throw new AppError('history not found', 404);

        json(res, 200, { deleted: true });
      } catch (err) { next(err); }
    },
  };
}