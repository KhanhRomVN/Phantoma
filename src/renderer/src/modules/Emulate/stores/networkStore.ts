/**
 * ------------------------------------------------------------------
 * Network Store
 * ------------------------------------------------------------------
 * Zustand store quản lý danh sách network requests và unpacked scripts
 * trong module Emulate. Dùng Map index để đạt O(1) khi add/update.
 *
 * Sau khi migrate sang Network Worker:
 * - requests: window hiển thị (tối đa maxMemory items, append-only khi live)
 * - totalWorkerCount: tổng số requests thực trong Worker (dùng cho FooterBar)
 * - filteredWorkerCount: tổng sau filter trong Worker
 *
 * Các actions chính:
 * - addRequests()        : Thêm hàng loạt request (bỏ qua nếu trùng id)
 * - prependRequest()     : Thêm 1 request vào đầu danh sách (từ Worker live)
 * - updateRequests()     : Cập nhật hàng loạt request theo id (O(1) lookup)
 * - clearRequests()      : Xóa toàn bộ requests và scripts
 * - setUnpackedScript()  : Lưu unpacked script cho một request
 * - getRequests()        : Lấy danh sách requests hiện tại
 * - setWindow()          : Thay toàn bộ window (dùng khi filter/clear)
 * - appendWindow()       : Append thêm items vào cuối (infinite scroll)
 * - setWorkerCounts()    : Cập nhật tổng đếm từ Worker
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Store ──
import { create } from 'zustand';

// ── Types ──
import type { NetworkRequest, CdpScriptUnpackedData } from '@renderer/shared/types/network';

export type { NetworkRequest, CdpScriptUnpackedData };

// ─── Interfaces ─────────────────────────────────────────────────────────
interface NetworkStore {
  requests: NetworkRequest[];
  requestIndex: Map<string, number>;
  unpackedScripts: Map<string, CdpScriptUnpackedData>;
  maxMemory: number;
  /** Tổng số requests thực trong Worker (không bị giới hạn bởi maxMemory) */
  totalWorkerCount: number;
  /** Tổng sau filter trong Worker (null = không filter) */
  filteredWorkerCount: number | null;

  // Actions
  addRequests: (newRequests: NetworkRequest[]) => void;
  /** Prepend 1 request mới vào đầu danh sách (live từ Worker) */
  prependRequest: (request: NetworkRequest) => void;
  updateRequests: (updates: Array<{ id: string; updates: Partial<NetworkRequest> }>) => void;
  clearRequests: () => void;
  setUnpackedScript: (requestId: string, data: CdpScriptUnpackedData) => void;
  getRequests: () => NetworkRequest[];
  /** Thay thế toàn bộ window hiện tại (dùng khi filter hoặc clear) */
  setWindow: (window: NetworkRequest[]) => void;
  /** Append thêm items vào cuối window (dùng cho infinite scroll) */
  appendWindow: (items: NetworkRequest[]) => void;
  /** Cập nhật tổng đếm từ Worker */
  setWorkerCounts: (totalCount: number, filteredCount: number | null) => void;
}

// ─── Store ──────────────────────────────────────────────────────────────
export const useNetworkStore = create<NetworkStore>((set, get) => ({
  requests: [],
  requestIndex: new Map(),
  unpackedScripts: new Map(),
  maxMemory: 1000,
  totalWorkerCount: 0,
  filteredWorkerCount: null,

  addRequests: (newRequests) =>
    set((state) => {
      if (newRequests.length === 0) return state;

      const added: NetworkRequest[] = [];
      for (const req of newRequests) {
        if (!state.requestIndex.has(req.id)) {
          added.push(req);
        }
      }
      if (added.length === 0) return state;

      const requests = [...added, ...state.requests];
      const sliced =
        requests.length > state.maxMemory ? requests.slice(0, state.maxMemory) : requests;

      const requestIndex = new Map<string, number>();
      sliced.forEach((r, i) => requestIndex.set(r.id, i));

      return { requests: sliced, requestIndex };
    }),

  prependRequest: (request) =>
    set((state) => {
      // Bỏ qua nếu đã có
      if (state.requestIndex.has(request.id)) return state;

      const requests = [request, ...state.requests];
      // Giữ tối đa maxMemory items trong store (window hiển thị)
      const sliced =
        requests.length > state.maxMemory ? requests.slice(0, state.maxMemory) : requests;

      const requestIndex = new Map<string, number>();
      sliced.forEach((r, i) => requestIndex.set(r.id, i));

      return { requests: sliced, requestIndex };
    }),

  updateRequests: (updates) =>
    set((state) => {
      if (updates.length === 0) return state;

      const requests = [...state.requests];
      let changed = false;

      for (const { id, updates: partial } of updates) {
        const idx = state.requestIndex.get(id);
        if (idx !== undefined && idx < requests.length) {
          requests[idx] = { ...requests[idx], ...partial };
          changed = true;
        }
      }

      return changed ? { requests } : state;
    }),

  clearRequests: () =>
    set({
      requests: [],
      requestIndex: new Map(),
      unpackedScripts: new Map(),
      totalWorkerCount: 0,
      filteredWorkerCount: null,
    }),

  setUnpackedScript: (requestId, data) =>
    set((state) => {
      const newMap = new Map(state.unpackedScripts);
      newMap.set(requestId, data);
      return { unpackedScripts: newMap };
    }),

  getRequests: () => get().requests,

  setWindow: (window) =>
    set(() => {
      const requestIndex = new Map<string, number>();
      window.forEach((r, i) => requestIndex.set(r.id, i));
      return { requests: window, requestIndex };
    }),

  appendWindow: (items) =>
    set((state) => {
      const combined = [...state.requests, ...items];
      const requestIndex = new Map<string, number>();
      combined.forEach((r, i) => requestIndex.set(r.id, i));
      return { requests: combined, requestIndex };
    }),

  setWorkerCounts: (totalCount, filteredCount) =>
    set({ totalWorkerCount: totalCount, filteredWorkerCount: filteredCount }),
}));
