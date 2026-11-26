/**
 * ------------------------------------------------------------------
 * WebSocket Store
 * ------------------------------------------------------------------
 * Zustand store quản lý WebSocket connections và frames trong module
 * Emulate. Tách riêng khỏi networkStore vì WebSocket có luồng dữ liệu
 * khác HTTP (không có status code, có frames/messages).
 *
 * Dùng Map index để đạt O(1) khi tra cứu connection theo id.
 *
 * Các actions chính:
 * - addConnection()         : Thêm connection mới (bỏ qua nếu trùng id)
 * - updateConnection()      : Cập nhật connection theo id
 * - removeConnection()      : Xóa connection theo id
 * - clearConnections()      : Xóa toàn bộ connections
 * - addFrame()              : Thêm frame vào connection (giới hạn maxFramesPerConnection)
 * - clearFrames()           : Xóa toàn bộ frames của một connection
 * - setSelectedConnection() : Chọn connection đang xem
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Store ──
import { create } from 'zustand';

// ── Types ──
import type { WebSocketConnection, WebSocketFrame } from '../types/inspector';

export type { WebSocketConnection, WebSocketFrame };

// ─── Interfaces ─────────────────────────────────────────────────────────
interface WebSocketStore {
  connections: WebSocketConnection[];
  connectionIndex: Map<string, number>;
  selectedConnectionId: string | null;
  maxFramesPerConnection: number;

  addConnection: (connection: WebSocketConnection) => void;
  updateConnection: (id: string, updates: Partial<WebSocketConnection>) => void;
  removeConnection: (id: string) => void;
  clearConnections: () => void;
  addFrame: (connectionId: string, frame: WebSocketFrame) => void;
  clearFrames: (connectionId: string) => void;
  setSelectedConnection: (id: string | null) => void;
}

// ─── Store ──────────────────────────────────────────────────────────────
export const useWebSocketStore = create<WebSocketStore>((set) => ({
  connections: [],
  connectionIndex: new Map(),
  selectedConnectionId: null,
  maxFramesPerConnection: 5000,

  addConnection: (connection) =>
    set((state) => {
      if (state.connectionIndex.has(connection.id)) return state;
      const connections = [connection, ...state.connections];
      const connectionIndex = new Map<string, number>();
      connections.forEach((c, i) => connectionIndex.set(c.id, i));
      return { connections, connectionIndex };
    }),

  updateConnection: (id, updates) =>
    set((state) => {
      const idx = state.connectionIndex.get(id);
      if (idx === undefined || idx >= state.connections.length) return state;
      const connections = [...state.connections];
      connections[idx] = { ...connections[idx], ...updates };
      return { connections };
    }),

  removeConnection: (id) =>
    set((state) => {
      const idx = state.connectionIndex.get(id);
      if (idx === undefined) return state;
      const connections = state.connections.filter((c) => c.id !== id);
      const connectionIndex = new Map<string, number>();
      connections.forEach((c, i) => connectionIndex.set(c.id, i));
      return {
        connections,
        connectionIndex,
        selectedConnectionId:
          state.selectedConnectionId === id ? null : state.selectedConnectionId,
      };
    }),

  clearConnections: () =>
    set({ connections: [], connectionIndex: new Map(), selectedConnectionId: null }),

  addFrame: (connectionId, frame) =>
    set((state) => {
      const idx = state.connectionIndex.get(connectionId);
      if (idx === undefined || idx >= state.connections.length) return state;
      const connections = [...state.connections];
      const conn = connections[idx];
      const frames = [...conn.frames, frame];
      const trimmed =
        frames.length > state.maxFramesPerConnection
          ? frames.slice(frames.length - state.maxFramesPerConnection)
          : frames;
      connections[idx] = { ...conn, frames: trimmed };
      return { connections };
    }),

  clearFrames: (connectionId) =>
    set((state) => {
      const idx = state.connectionIndex.get(connectionId);
      if (idx === undefined || idx >= state.connections.length) return state;
      const connections = [...state.connections];
      connections[idx] = { ...connections[idx], frames: [] };
      return { connections };
    }),

  setSelectedConnection: (id) => set({ selectedConnectionId: id }),
}));