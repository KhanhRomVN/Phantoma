/**
 * ------------------------------------------------------------------
 * Inspector Types
 * ------------------------------------------------------------------
 * Type definitions cho WebSocket inspector trong module Emulate.
 * Bao gồm thông tin connection và messages của WebSocket.
 *
 * Các types chính:
 * - NetworkRequest     : Re-export từ shared types
 * - WebSocketFrame     : Một frame dữ liệu WebSocket
 * - WebSocketConnection: Một phiên kết nối WebSocket
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Types ──
import type { NetworkRequest } from '@renderer/shared/types/network';

export type { NetworkRequest };

// ─── WebSocket Types ────────────────────────────────────────────────────
/** Một frame WebSocket (data/ping/pong/close) trong một connection. */
export interface WebSocketFrame {
  id: string;
  connectionId: string;
  direction: 'send' | 'receive';
  opcode: 'text' | 'binary' | 'ping' | 'pong' | 'close';
  /** Payload dạng string (base64 cho binary, raw cho text). */
  payload: string;
  /** Kích thước payload tính theo byte. */
  size: number;
  timestamp: number;
}

/** Một phiên kết nối WebSocket được capture bởi inspector. */
export interface WebSocketConnection {
  id: string;
  url: string;
  host: string;
  path: string;
  protocol: string;
  status: 'connecting' | 'open' | 'closed' | 'error';
  openedAt: number;
  closedAt?: number;
  closeCode?: number;
  closeReason?: string;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  frames: WebSocketFrame[];
}