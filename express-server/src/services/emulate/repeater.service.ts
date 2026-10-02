/**
 * ------------------------------------------------------------------
 * Repeater Service
 * ------------------------------------------------------------------
 * Ported from internal/service/emulate/repeater.go. Coordinates requests,
 * payloads, history and runs — stamps `now` once per operation and passes
 * it down to the repository so created_at/updated_at stay consistent.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Local 
import type {
  RepeaterRequest,
  CreateRepeaterRequestInput,
  UpdateRepeaterRequestInput,
  RepeaterPayload,
  CreateRepeaterPayloadInput,
  RepeaterHistory,
  CreateRepeaterHistoryInput,
  RepeaterHistoryRun,
  CreateRepeaterHistoryRunInput,
} from '../../domain/emulate';
import { RepeaterRepository } from '../../repositories/emulate/repeater.repository';

// ─── Service ────────────────────────────────────────────────────────────

export class RepeaterService {
  constructor(private repo: RepeaterRepository) {}

  // ===========================================================================
  // Requests
  // ===========================================================================

  async getRequestsByTarget(targetID: string): Promise<RepeaterRequest[]> {
    return this.repo.getRequestsByTargetID(targetID);
  }

  async getRequestByID(id: string): Promise<RepeaterRequest | null> {
    return this.repo.getRequestByID(id);
  }

  async createRequest(input: CreateRepeaterRequestInput): Promise<RepeaterRequest> {
    const now = Math.floor(Date.now() / 1000);
    return this.repo.createRequest(input, now);
  }

  async updateRequest(id: string, input: UpdateRepeaterRequestInput): Promise<RepeaterRequest | null> {
    const now = Math.floor(Date.now() / 1000);
    return this.repo.updateRequest(id, input, now);
  }

  async deleteRequest(id: string): Promise<boolean> {
    return this.repo.deleteRequest(id);
  }

  // ===========================================================================
  // Payloads
  // ===========================================================================

  async getPayloadsByRequest(requestID: string): Promise<RepeaterPayload[]> {
    return this.repo.getPayloadsByRequestID(requestID);
  }

  async createOrUpdatePayload(requestID: string, input: CreateRepeaterPayloadInput): Promise<RepeaterPayload> {
    const now = Math.floor(Date.now() / 1000);
    input.emulate_repeater_request_id = requestID;
    return this.repo.upsertPayload(requestID, input, now);
  }

  async deletePayload(id: string): Promise<boolean> {
    return this.repo.deletePayload(id);
  }

  // ===========================================================================
  // History
  // ===========================================================================

  async getHistoryByTarget(targetID: string): Promise<RepeaterHistory[]> {
    return this.repo.getHistoryByTargetID(targetID);
  }

  async getHistoryByRequest(requestID: string): Promise<RepeaterHistory[]> {
    return this.repo.getHistoryByRequestID(requestID);
  }

  // saveHistory creates one history entry plus all its runs atomically-ish
  // (same transaction-less behavior as the Go implementation).
  async saveHistory(
    historyInput: CreateRepeaterHistoryInput,
    runsInput: CreateRepeaterHistoryRunInput[],
  ): Promise<RepeaterHistory> {
    const now = Math.floor(Date.now() / 1000);
    const history = await this.repo.createHistory(historyInput, now);
    for (const runInput of runsInput) {
      runInput.history_id = history.id;
      await this.repo.createRun(runInput, now);
    }
    return history;
  }

  async deleteHistory(id: string): Promise<boolean> {
    return this.repo.deleteHistory(id);
  }

  async getRunsByHistory(historyID: string): Promise<RepeaterHistoryRun[]> {
    return this.repo.getRunsByHistoryID(historyID);
  }
}