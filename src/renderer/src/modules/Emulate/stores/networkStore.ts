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
 * - assetMap: kho lưu giữ request dạng resource/source (JS, CSS, HTML, image,
 *   font...) — KHÔNG bị xóa khi user clear bảng Requests, chỉ xóa khi đổi target
 *
 * Các actions chính:
 * - addRequests()        : Thêm hàng loạt request (bỏ qua nếu trùng id)
 * - prependRequest()     : Thêm 1 request vào đầu danh sách (từ Worker live)
 * - updateRequests()     : Cập nhật hàng loạt request theo id (O(1) lookup)
 * - clearRequests()      : Xóa requests và scripts (giữ nguyên assets)
 * - clearAssets()        : Xóa kho assets (dùng khi đổi target)
 * - setUnpackedScript()  : Lưu unpacked script cho một request
 * - getRequests()        : Lấy danh sách requests hiện tại
 * - setWindow()          : Thay toàn bộ window (dùng khi filter/clear)
 * - appendWindow()       : Append thêm items vào cuối (infinite scroll)
 * - setWorkerCounts()    : Cập nhật tổng đếm từ Worker
 * ------------------------------------------------------------------
 */

// ─── Imports ───────────────────────────────────────────────────────────
// ── Store ──
import { create } from 'zustand';

// ── Constants ──
import { detectResourceType } from '../constants/resource';

// ── Types ─
import type { NetworkRequest, CdpScriptUnpackedData } from '@renderer/shared/types/network';

export type { NetworkRequest, CdpScriptUnpackedData };

// [DEBUG] Expose store to window for diagnostic testing
declare global {
  interface Window {
    __PHANTOMA_NETWORK_STORE__?: any;
  }
}
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
  /** Kho request dạng resource/source, tồn tại độc lập với bảng Requests */
  assetMap: Map<string, NetworkRequest>;
  /** Tăng mỗi khi assetMap thay đổi để component biết cần tính lại */
  assetsVersion: number;

  // Actions
  addRequests: (newRequests: NetworkRequest[]) => void;
  /** Prepend 1 request mới vào đầu danh sách (live từ Worker) */
  prependRequest: (request: NetworkRequest) => void;
  updateRequests: (updates: Array<{ id: string; updates: Partial<NetworkRequest> }>) => void;
  clearRequests: () => void;
  /** Xóa kho assets (chỉ dùng khi đổi target) */
  clearAssets: () => void;
  setUnpackedScript: (requestId: string, data: CdpScriptUnpackedData) => void;
  getRequests: () => NetworkRequest[];
  /** Thay thế toàn bộ window hiện tại (dùng khi filter hoặc clear) */
  setWindow: (window: NetworkRequest[]) => void;
  /** Append thêm items vào cuối window (dùng cho infinite scroll) */
  appendWindow: (items: NetworkRequest[]) => void;
  /** Cập nhật tổng đếm từ Worker */
  setWorkerCounts: (totalCount: number, filteredCount: number | null) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────
/** Request có phải resource/source cần giữ lại cho tab Resource/Source không. */
const isAssetCandidate = (req: NetworkRequest): boolean => {
  const t = req.type?.toUpperCase();
  if (t === 'JS' || t === 'CSS' || t === 'HTML') return true;
  const ct = req.responseHeaders?.['content-type'] || req.responseHeaders?.['Content-Type'] || '';
  return detectResourceType(ct, req.path || '') !== 'other';
};

// ─── Store ──────────────────────────────────────────────────────────────
export const useNetworkStore = create<NetworkStore>((set, get) => ({
  requests: [],
  requestIndex: new Map(),
  unpackedScripts: new Map(),
  maxMemory: 1000,
  totalWorkerCount: 0,
  filteredWorkerCount: null,
  assetMap: new Map(),
  assetsVersion: 0,

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

      let assetsChanged = false;
      for (const req of added) {
        if (isAssetCandidate(req)) {
          state.assetMap.set(req.id, req);
          assetsChanged = true;
        }
      }

      const requests = [...added, ...state.requests];
      const sliced =
        requests.length > state.maxMemory ? requests.slice(0, state.maxMemory) : requests;

      const requestIndex = new Map<string, number>();
      sliced.forEach((r, i) => requestIndex.set(r.id, i));

      return {
        requests: sliced,
        requestIndex,
        assetsVersion: assetsChanged ? state.assetsVersion + 1 : state.assetsVersion,
      };
    }),

  prependRequest: (request) =>
    set((state) => {
      // Bỏ qua nếu đã có
      if (state.requestIndex.has(request.id)) {
        // [DEBUG] Log khi duplicate bị bỏ qua
        console.warn('[networkStore][DEBUG] DUPLICATE SKIPPED:', request.id);
        return state;
      }

      let assetsVersion = state.assetsVersion;
      if (isAssetCandidate(request)) {
        state.assetMap.set(request.id, request);
        assetsVersion++;
      }

      const requests = [request, ...state.requests];
      // Giữ tối đa maxMemory items trong store (window hiển thị)
      const sliced =
        requests.length > state.maxMemory ? requests.slice(0, state.maxMemory) : requests;
      const requestIndex = new Map<string, number>();
      sliced.forEach((r, i) => requestIndex.set(r.id, i));

      return { requests: sliced, requestIndex, assetsVersion };
    }),

  updateRequests: (updates) =>
    set((state) => {
      if (updates.length === 0) return state;

      const requests = [...state.requests];
      let changed = false;
      let assetsChanged = false;

      for (const { id, updates: partial } of updates) {
        const idx = state.requestIndex.get(id);
        if (idx !== undefined && idx < requests.length) {
          requests[idx] = { ...requests[idx], ...partial };
          changed = true;
          if (isAssetCandidate(requests[idx])) {
            state.assetMap.set(id, requests[idx]);
            assetsChanged = true;
          }
        }
      }

      if (!changed) return state;
      return {
        requests,
        assetsVersion: assetsChanged ? state.assetsVersion + 1 : state.assetsVersion,
      };
    }),

  clearRequests: () =>
    set({
      requests: [],
      requestIndex: new Map(),
      unpackedScripts: new Map(),
      totalWorkerCount: 0,
      filteredWorkerCount: null,
    }),

  clearAssets: () =>
    set((state) => ({
      assetMap: new Map(),
      assetsVersion: state.assetsVersion + 1,
    })),

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

// [DEBUG] Expose store instance to global window for diagnostic runner access
if (typeof window !== 'undefined') {
  window.__PHANTOMA_NETWORK_STORE__ = useNetworkStore;
}