/**
 * ------------------------------------------------------------------
 * Network Store
 * ------------------------------------------------------------------
 * Zustand store quản lý danh sách network requests và unpacked scripts
 * trong module Emulate. Dùng Map index để đạt O(1) khi add/update.
 *
 * Các actions chính:
 * - addRequests()        : Thêm hàng loạt request (bỏ qua nếu trùng id)
 * - updateRequests()     : Cập nhật hàng loạt request theo id (O(1) lookup)
 * - clearRequests()      : Xóa toàn bộ requests và scripts
 * - setUnpackedScript()  : Lưu unpacked script cho một request
 * - getRequests()        : Lấy danh sách requests hiện tại
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

  // Actions
  addRequests: (newRequests: NetworkRequest[]) => void;
  updateRequests: (updates: Array<{ id: string; updates: Partial<NetworkRequest> }>) => void;
  clearRequests: () => void;
  setUnpackedScript: (requestId: string, data: CdpScriptUnpackedData) => void;
  getRequests: () => NetworkRequest[];
}

// ─── Store ──────────────────────────────────────────────────────────────
export const useNetworkStore = create<NetworkStore>((set, get) => ({
  requests: [],
  requestIndex: new Map(),
  unpackedScripts: new Map(),
  maxMemory: 1000,

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
    set({ requests: [], requestIndex: new Map(), unpackedScripts: new Map() }),

  setUnpackedScript: (requestId, data) =>
    set((state) => {
      const newMap = new Map(state.unpackedScripts);
      newMap.set(requestId, data);
      return { unpackedScripts: newMap };
    }),

  getRequests: () => get().requests,
}));