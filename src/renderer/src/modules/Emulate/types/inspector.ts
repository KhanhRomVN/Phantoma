// Re-export global types for Emulate feature
import type { NetworkRequest } from '@renderer/shared/types/network';

export type { NetworkRequest };

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
