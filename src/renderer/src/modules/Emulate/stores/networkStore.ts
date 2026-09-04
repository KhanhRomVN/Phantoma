/**
 * ------------------------------------------------------------------
 * Network Store
 * ------------------------------------------------------------------
 * Zustand store quản lý danh sách network requests và unpacked scripts
 * trong module Emulate. Giới hạn số lượng requests lưu trong memory.
 *
 * Các actions chính:
 * - addRequest()          : Thêm request mới (bỏ qua nếu trùng id)
 * - updateRequest()       : Cập nhật một phần request theo id
 * - clearRequests()       : Xóa toàn bộ requests và scripts
 * - setUnpackedScript()   : Lưu unpacked script cho một request
 * - getRequests()         : Lấy danh sách requests hiện tại
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
  unpackedScripts: Map<string, CdpScriptUnpackedData>;
  maxMemory: number;

  // Actions
  addRequest: (request: NetworkRequest) => void;
  updateRequest: (id: string, updates: Partial<NetworkRequest>) => void;
  clearRequests: () => void;
  setUnpackedScript: (requestId: string, data: CdpScriptUnpackedData) => void;
  getRequests: () => NetworkRequest[];
}

// ─── Store ──────────────────────────────────────────────────────────────
export const useNetworkStore = create<NetworkStore>((set, get) => ({
  requests: [],
  unpackedScripts: new Map(),
  maxMemory: 1000,

  addRequest: (request) =>
    set((state) => {
      if (state.requests.some((r) => r.id === request.id)) {
        return state;
      }
      const newRequests = [request, ...state.requests];
      if (newRequests.length > state.maxMemory) {
        return { requests: newRequests.slice(0, state.maxMemory) };
      }
      return { requests: newRequests };
    }),

  updateRequest: (id, updates) =>
    set((state) => ({
      requests: state.requests.map((r) =>
        r.id === id ? { ...r, ...updates } : r,
      ),
    })),

  clearRequests: () => set({ requests: [], unpackedScripts: new Map() }),

  setUnpackedScript: (requestId, data) =>
    set((state) => {
      const newMap = new Map(state.unpackedScripts);
      newMap.set(requestId, data);
      return { unpackedScripts: newMap };
    }),

  getRequests: () => get().requests,
}));