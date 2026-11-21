/**
 * Tập trung tất cả HTTP API calls cho module Emulate, gọi đến
 * server endpoints trong server/internal/routes/emulate.go.
 * Bao gồm: CRUD targets, filter, fuzzer requests/payloads/history.
 *
 * Ngoài ra còn chứa DataService — lớp trung gian giữa UI và API,
 * chuyển đổi DTO ↔ TargetTab, cung cấp search/filter/save thông minh.
 */

import ApiService from '@renderer/services/api.service';
import { resolveEmulateBaseUrl } from './emulate-base-url';

import type { TargetTab } from '../types/target.types';
import type { ApiResponse } from '@renderer/types/api';
import type {
  TargetDTO,
  CreateTargetDTO,
  UpdateTargetDTO,
  TargetFilterDTO,
  CreateTargetFilterDTO,
  Fuzzer,
  CreateFuzzerInput,
  UpdateFuzzerInput,
  FuzzerPayload,
  UpsertFuzzerPayloadInput,
  FuzzerHistory,
  CreateFuzzerHistoryInput,
  FuzzerHistoryRun,
  CreateFuzzerHistoryRunInput,
  SaveHistoryInput,
} from '../types/emulate.types';
import { logger } from '../utils/logger.util';

// Report types
export interface ReportDTO {
  id: string;
  emulate_target_id: string;
  title: string;
  file_path: string;
  content: string;
  created_at: number;
  updated_at: number;
}

export interface CreateReportDTO {
  emulate_target_id: string;
  title?: string;
  file_path?: string;
  content: string;
}

export interface UpdateReportDTO {
  title?: string;
  file_path?: string;
  content?: string;
}

// Re-export cho các consumer bên ngoài
export type {
  TargetDTO,
  CreateTargetDTO,
  UpdateTargetDTO,
  TargetFilterDTO,
  CreateTargetFilterDTO,
  Fuzzer,
  CreateFuzzerInput,
  UpdateFuzzerInput,
  FuzzerPayload,
  UpsertFuzzerPayloadInput,
  FuzzerHistory,
  CreateFuzzerHistoryInput,
  FuzzerHistoryRun,
  CreateFuzzerHistoryRunInput,
  SaveHistoryInput,
};

/** Map TargetDTO (snake_case) → TargetTab (camelCase) dùng trong UI. */
function toTargetTab(dto: TargetDTO): TargetTab {
  return {
    id: dto.id,
    title: dto.title,
    url: dto.url ?? undefined,
    icon: dto.icon ?? undefined,
    favicon: dto.icon ?? undefined,
    platform: dto.platform ?? undefined,
    executablePath: dto.executable_path ?? undefined,
    startupArgs: dto.startup_args ?? undefined,
    environment: dto.environment ?? undefined,
  };
}

/** Map TargetTab (camelCase) → CreateTargetDTO (snake_case) để gửi lên API. */
function toCreateDTO(target: TargetTab): CreateTargetDTO {
  return {
    id: target.id,
    title: target.title,
    url: target.url ?? null,
    icon: target.icon ?? null,
    platform: target.platform ?? null,
    executable_path: target.executablePath ?? null,
    startup_args: target.startupArgs ?? null,
    environment: target.environment ?? null,
  };
}

/** Map Partial<TargetTab> → UpdateTargetDTO, chỉ gửi các field có thay đổi. */
function toUpdateDTO(target: Partial<TargetTab>): UpdateTargetDTO {
  const dto: UpdateTargetDTO = {};
  if (target.title !== undefined) dto.title = target.title;
  if (target.url !== undefined) dto.url = target.url ?? null;
  if (target.icon !== undefined) dto.icon = target.icon ?? null;
  if (target.platform !== undefined) dto.platform = target.platform ?? null;
  if (target.executablePath !== undefined) dto.executable_path = target.executablePath ?? null;
  if (target.startupArgs !== undefined) dto.startup_args = target.startupArgs ?? null;
  if (target.environment !== undefined) dto.environment = target.environment ?? null;
  return dto;
}

class EmulateApiService {
  private _client: ApiService;

  constructor() {
    this._client = this.createClient();

    // Listen for URL changes to recreate client if needed (optional optimization)
    window.addEventListener('emulateUrlChanged', () => {
      this._client = this.createClient();
    });
  }

  private createClient(): ApiService {
    const storedUrl = localStorage.getItem('emulate_service_url');
    const baseUrl = storedUrl ? `http://${storedUrl}` : resolveEmulateBaseUrl();
    return new ApiService(baseUrl);
  }

  public get client(): ApiService {
    return this._client;
  }

  /** Build base path cho fuzzer endpoints của một target. */
  private basePath(targetId: string): string {
    return `/api/v1/targets/${targetId}/fuzzers`;
  }

  /** Wrap async API call thành ApiResponse, bắt lỗi và trả về error message. */
  private async wrap<T>(fn: () => Promise<T>): Promise<ApiResponse<T>> {
    try {
      const data = await fn();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ===================================================================
  // Targets
  // ===================================================================

  /** Lấy toàn bộ danh sách emulate target. */
  async getTargets(): Promise<TargetDTO[]> {
    return this._client.request<TargetDTO[]>('/api/v1/targets');
  }

  /** Lấy một target theo id. */
  async getTarget(id: string): Promise<TargetDTO> {
    return this._client.request<TargetDTO>(`/api/v1/targets/${encodeURIComponent(id)}`);
  }

  /** Tạo target mới. */
  async createTarget(input: CreateTargetDTO): Promise<TargetDTO> {
    return this._client.request<TargetDTO>('/api/v1/targets', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  /** Cập nhật target theo id. */
  async updateTarget(id: string, input: UpdateTargetDTO): Promise<TargetDTO> {
    return this._client.request<TargetDTO>(`/api/v1/targets/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  }

  /** Lấy danh sách capture methods hỗ trợ cho một platform. */
  async getCaptureMethods(
    platform: 'website' | 'application' | 'terminal',
  ): Promise<{ platform: string; methods: any[] }> {
    try {
      const res = await this._client.request<{ platform: string; methods: any[] }>(
        `/api/v1/capture-methods/${platform}`,
      );
      return res;
    } catch (err) {
      logger.error(`[EmulateApiService] Failed to call capture-methods API:`, err);
      throw err;
    }
  }

  /** Xóa target theo id, trả về true nếu thành công. */
  async deleteTarget(id: string): Promise<boolean> {
    const result = await this._client.request<{ deleted: boolean }>(
      `/api/v1/targets/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    );
    return result?.deleted ?? false;
  }

  /** Cập nhật timestamp last_used của target (gọi khi user mở target). */
  async updateLastUsed(id: string): Promise<boolean> {
    const result = await this._client.request<{ success: boolean }>(
      `/api/v1/targets/${encodeURIComponent(id)}/use`,
      { method: 'POST' },
    );
    return result?.success ?? false;
  }

  // ===================================================================
  // Filter
  // ===================================================================

  /** Lấy bộ lọc hiện tại của target, trả về null nếu chưa có. */
  async getFilter(targetId: string): Promise<TargetFilterDTO | null> {
    try {
      return await this._client.request<TargetFilterDTO>(
        `/api/v1/targets/${encodeURIComponent(targetId)}/filter`,
      );
    } catch {
      return null;
    }
  }

  /** Lưu hoặc cập nhật bộ lọc cho target. */
  async saveFilter(targetId: string, input: CreateTargetFilterDTO): Promise<TargetFilterDTO> {
    return this._client.request<TargetFilterDTO>(
      `/api/v1/targets/${encodeURIComponent(targetId)}/filter`,
      { method: 'PUT', body: JSON.stringify(input) },
    );
  }

  /** Xóa bộ lọc của target. */
  async deleteFilter(targetId: string): Promise<boolean> {
    const result = await this._client.request<{ deleted: boolean }>(
      `/api/v1/targets/${encodeURIComponent(targetId)}/filter`,
      { method: 'DELETE' },
    );
    return result?.deleted ?? false;
  }

  // ===================================================================
  // Fuzzer - Requests
  // ===================================================================

  /** Lấy danh sách fuzzer request của target. */
  async listRequests(targetId: string): Promise<ApiResponse<Fuzzer[]>> {
    return this.wrap(() =>
      this._client.request<Fuzzer[]>(`${this.basePath(targetId)}/requests`),
    );
  }

  /** Lấy một fuzzer request theo id. */
  async getRequest(targetId: string, requestId: string): Promise<ApiResponse<Fuzzer>> {
    return this.wrap(() =>
      this._client.request<Fuzzer>(`${this.basePath(targetId)}/requests/${requestId}`),
    );
  }

  /** Tạo fuzzer request mới cho target. */
  async createRequest(
    targetId: string,
    input: CreateFuzzerInput,
  ): Promise<ApiResponse<Fuzzer>> {
    return this.wrap(() =>
      this._client.request<Fuzzer>(`${this.basePath(targetId)}/requests`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    );
  }

  /** Cập nhật fuzzer request. */
  async updateRequest(
    targetId: string,
    requestId: string,
    input: UpdateFuzzerInput,
  ): Promise<ApiResponse<Fuzzer>> {
    return this.wrap(() =>
      this._client.request<Fuzzer>(`${this.basePath(targetId)}/requests/${requestId}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    );
  }

  /** Xóa fuzzer request. */
  async deleteRequest(
    targetId: string,
    requestId: string,
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.wrap(() =>
      this._client.request<{ deleted: boolean }>(`${this.basePath(targetId)}/requests/${requestId}`, {
        method: 'DELETE',
      }),
    );
  }

  // ===================================================================
  // Fuzzer - Payloads
  // ===================================================================

  /** Lấy danh sách payload của một fuzzer request. */
  async listPayloads(targetId: string, requestId: string): Promise<ApiResponse<FuzzerPayload[]>> {
    return this.wrap(() =>
      this._client.request<FuzzerPayload[]>(
        `${this.basePath(targetId)}/requests/${requestId}/payloads`,
      ),
    );
  }

  /** Tạo mới hoặc cập nhật payload (upsert theo name). */
  async upsertPayload(
    targetId: string,
    requestId: string,
    input: UpsertFuzzerPayloadInput,
  ): Promise<ApiResponse<FuzzerPayload>> {
    return this.wrap(() =>
      this._client.request<FuzzerPayload>(
        `${this.basePath(targetId)}/requests/${requestId}/payloads`,
        { method: 'PUT', body: JSON.stringify(input) },
      ),
    );
  }

  /** Xóa payload theo id. */
  async deletePayload(
    targetId: string,
    requestId: string,
    payloadId: string,
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.wrap(() =>
      this._client.request<{ deleted: boolean }>(
        `${this.basePath(targetId)}/requests/${requestId}/payloads/${payloadId}`,
        { method: 'DELETE' },
      ),
    );
  }

  // ===================================================================
  // Fuzzer - History
  // ===================================================================

  /** Lấy toàn bộ lịch sử fuzzer/fuzzer của target. */
  async listHistoryByTarget(targetId: string): Promise<ApiResponse<FuzzerHistory[]>> {
    return this.wrap(() =>
      this._client.request<FuzzerHistory[]>(`${this.basePath(targetId)}/history`),
    );
  }

  /** Lấy lịch sử fuzzer/fuzzer của một request cụ thể. */
  async listHistoryByRequest(
    targetId: string,
    requestId: string,
  ): Promise<ApiResponse<FuzzerHistory[]>> {
    return this.wrap(() =>
      this._client.request<FuzzerHistory[]>(
        `${this.basePath(targetId)}/requests/${requestId}/history`,
      ),
    );
  }

  /** Lưu lịch sử chạy fuzzer (gồm history record + danh sách runs). */
  async saveHistory(
    targetId: string,
    requestId: string,
    input: SaveHistoryInput,
  ): Promise<ApiResponse<FuzzerHistory>> {
    return this.wrap(() =>
      this._client.request<FuzzerHistory>(
        `${this.basePath(targetId)}/requests/${requestId}/history`,
        { method: 'POST', body: JSON.stringify(input) },
      ),
    );
  }

  /** Lấy chi tiết từng run của một history record. */
  async getHistoryRuns(
    targetId: string,
    historyId: string,
  ): Promise<ApiResponse<FuzzerHistoryRun[]>> {
    return this.wrap(() =>
      this._client.request<FuzzerHistoryRun[]>(
        `${this.basePath(targetId)}/history/${historyId}/runs`,
      ),
    );
  }

  /** Xóa một history record. */
  async deleteHistory(
    targetId: string,
    historyId: string,
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.wrap(() =>
      this._client.request<{ deleted: boolean }>(`${this.basePath(targetId)}/history/${historyId}`, {
        method: 'DELETE',
      }),
    );
  }

  // ===================================================================
  // Reports
  // ===================================================================

  /** Lấy danh sách report của target. */
  async listReports(targetId: string): Promise<ApiResponse<ReportDTO[]>> {
    return this.wrap(() =>
      this._client.request<ReportDTO[]>(
        `/api/v1/targets/${encodeURIComponent(targetId)}/reports`,
      ),
    );
  }

  /** Lấy một report theo id. */
  async getReport(targetId: string, reportId: string): Promise<ApiResponse<ReportDTO>> {
    return this.wrap(() =>
      this._client.request<ReportDTO>(
        `/api/v1/targets/${encodeURIComponent(targetId)}/reports/${reportId}`,
      ),
    );
  }

  /** Tạo report mới cho target. */
  async createReport(targetId: string, input: CreateReportDTO): Promise<ApiResponse<ReportDTO>> {
    return this.wrap(() =>
      this._client.request<ReportDTO>(
        `/api/v1/targets/${encodeURIComponent(targetId)}/reports`,
        { method: 'POST', body: JSON.stringify(input) },
      ),
    );
  }

  /** Cập nhật report. */
  async updateReport(
    targetId: string,
    reportId: string,
    input: UpdateReportDTO,
  ): Promise<ApiResponse<ReportDTO>> {
    return this.wrap(() =>
      this._client.request<ReportDTO>(
        `/api/v1/targets/${encodeURIComponent(targetId)}/reports/${reportId}`,
        { method: 'PUT', body: JSON.stringify(input) },
      ),
    );
  }

  /** Xóa report. */
  async deleteReport(
    targetId: string,
    reportId: string,
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.wrap(() =>
      this._client.request<{ deleted: boolean }>(
        `/api/v1/targets/${encodeURIComponent(targetId)}/reports/${reportId}`,
        { method: 'DELETE' },
      ),
    );
  }

  // ===================================================================
  // Browser control (CDP chạy ở emulate server)
  // ===================================================================

  /** Chạy một browser tool ở emulate server, trả về text output. */
  async runBrowserTool(
    tool: string,
    targetId: string,
    params: Record<string, unknown> = {},
  ): Promise<string> {
    const res = await this._client.request<{ output: string }>(
      `/api/v1/runtime/browser/${encodeURIComponent(tool)}`,
      { method: 'POST', body: JSON.stringify({ targetId, params }) },
    );
    return res.output;
  }

  /** Mở Chrome (CDP) cho target rồi kết nối CDP. */
  async launchBrowser(
    targetId: string,
    opts: { url?: string; userDataDir?: string } = {},
  ): Promise<string> {
    const launch = await this._client.post<any>('/api/v1/runtime/launch', {
      targetId,
      mode: 'cdp',
      customUrl: opts.url,
      userDataDir: opts.userDataDir,
    });
    if (!launch?.success) throw new Error(launch?.error || 'Failed to launch browser');
    const connect = await this._client.post<any>('/api/v1/runtime/cdp/connect', {
      targetId,
      expectedUrl: opts.url,
    });
    if (!connect?.success) throw new Error(connect?.error || 'Failed to connect CDP');
    return launch.message || 'Browser launched';
  }
}

class DataService {
  private static instance: DataService;

  private constructor() {}

  /** Lấy singleton instance của DataService. */
  static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  // === Target CRUD ===

  /** Lấy toàn bộ target, map DTO → TargetTab. */
  async getTargets(): Promise<TargetTab[]> {
    const dtos = await emulateApi.getTargets();
    return dtos.map(toTargetTab);
  }

  /** Lấy một target theo id (dạng TargetTab), trả về null nếu không tìm thấy. */
  async getTargetById(id: string): Promise<TargetTab | null> {
    try {
      const dto = await emulateApi.getTarget(id);
      return toTargetTab(dto);
    } catch {
      return null;
    }
  }

  /** Lọc target theo platform (web/mobile/...). */
  async getTargetsByPlatform(platform: string): Promise<TargetTab[]> {
    const all = await this.getTargets();
    return all.filter((t) => t.platform === platform);
  }

  /** Tìm kiếm target theo title hoặc url (không phân biệt hoa thường). */
  async searchTargets(query: string): Promise<TargetTab[]> {
    const all = await this.getTargets();
    const q = query.toLowerCase();
    return all.filter((t) => t.title.toLowerCase().includes(q) || t.url?.toLowerCase().includes(q));
  }

  /** Lưu target: tự động gọi create nếu chưa tồn tại, update nếu đã có. */
  async saveTarget(target: TargetTab): Promise<TargetTab> {
    try {
      const existing = await emulateApi.getTarget(target.id);
      if (existing) {
        const dto = await emulateApi.updateTarget(target.id, toUpdateDTO(target));
        return toTargetTab(dto);
      }
    } catch (error: any) {
      const message = error?.message || '';
      const status = error?.status || 0;
      const isNotFound =
        message.includes('missing target id') ||
        message.includes('not found') ||
        status === 400 ||
        status === 404;
      if (!isNotFound) {
        throw error;
      }
    }

    const dto = await emulateApi.createTarget(toCreateDTO(target));
    return toTargetTab(dto);
  }

  /** Lưu danh sách target, trả về danh sách đã lưu thành công. */
  async saveTargets(targets: TargetTab[]): Promise<TargetTab[]> {
    const results: TargetTab[] = [];
    for (const target of targets) {
      results.push(await this.saveTarget(target));
    }
    return results;
  }

  /** Tạo target mới từ input (id tự sinh nếu không cung cấp). */
  async createTarget(input: Omit<TargetTab, 'id'> & { id?: string }): Promise<TargetTab> {
    const dto: CreateTargetDTO = {
      id: input.id,
      title: input.title,
      url: input.url ?? null,
      icon: input.icon ?? input.favicon ?? null,
      platform: input.platform ?? 'website',
      executable_path: input.executablePath ?? null,
      startup_args: input.startupArgs ?? null,
      environment: input.environment ?? null,
    };
    const result = await emulateApi.createTarget(dto);
    return toTargetTab(result);
  }

  /** Xóa một target theo id, trả về true nếu thành công. */
  async deleteTarget(id: string): Promise<boolean> {
    return emulateApi.deleteTarget(id);
  }

  /** Xóa nhiều target, trả về số lượng đã xóa thành công. */
  async deleteTargets(ids: string[]): Promise<number> {
    let count = 0;
    for (const id of ids) {
      const deleted = await emulateApi.deleteTarget(id);
      if (deleted) count++;
    }
    return count;
  }

  /** Xóa toàn bộ target, trả về số lượng đã xóa. */
  async clearAllTargets(): Promise<number> {
    const all = await this.getTargets();
    let count = 0;
    for (const t of all) {
      const deleted = await emulateApi.deleteTarget(t.id);
      if (deleted) count++;
    }
    return count;
  }

  /** Đếm tổng số target hiện có. */
  async countTargets(): Promise<number> {
    const all = await this.getTargets();
    return all.length;
  }

  /** Kiểm tra target có tồn tại không. */
  async targetExists(id: string): Promise<boolean> {
    const target = await this.getTargetById(id);
    return target !== null;
  }

  // === Utility ===

  /** Khởi tạo service (no-op — database do Go backend quản lý). */
  async initialize(): Promise<void> {
    // Không cần làm gì
  }

  /** Kiểm tra service đã được khởi tạo chưa (luôn true). */
  isInitialized(): boolean {
    return true;
  }
}

/** Singleton EmulateApiService — dùng để gọi HTTP API trực tiếp. */
export const emulateApi = new EmulateApiService();

/** Singleton DataService — business layer, map DTO ↔ TargetTab. */
export const dataService = DataService.getInstance();

export default emulateApi;
