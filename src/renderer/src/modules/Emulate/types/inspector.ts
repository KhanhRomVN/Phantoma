/**
 * ------------------------------------------------------------------
 * Inspector Types
 * ------------------------------------------------------------------
 * Type definitions cho WebSocket inspector trong module Emulate.
 * Bao gồm thông tin connection và messages của WebSocket.
 *
 * Các types chính:
 * - NetworkRequest     : Re-export từ shared types
 * - WebSocketConnection : Thông tin một WebSocket connection
 * - WebSocketMessage    : Message trong WebSocket connection
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Types ──
import type { NetworkRequest } from '@renderer/shared/types/network';

export type { NetworkRequest };

// ─── Types ──────────────────────────────────────────────────────────────
export interface WebSocketConnection {
  id: string;
  url: string;
  host: string;
  path: string;
  status: 'connecting' | 'connected' | 'closed';
  clientCloseCode?: number;
  serverCloseCode?: number;
  clientCloseReason?: string;
  serverCloseReason?: string;
  startTime: number;
  endTime?: number;
  messages: WebSocketMessage[];
  totalMessages: number;
  clientBytesSent: number;
  serverBytesSent: number;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
}

export interface WebSocketMessage {
  id: string;
  connectionId: string;
  direction: 'client' | 'server';
  data: string; // text or base64 for binary
  dataType: 'text' | 'binary';
  size: number;
  timestamp: number;
}