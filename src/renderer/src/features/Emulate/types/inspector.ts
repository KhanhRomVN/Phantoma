// Re-export and extend global types for Emulate feature
import { SecurityIssue } from '../../Tool/utils/securityScanner';
import type {
  NetworkRequest as GlobalNetworkRequest,
  NetworkAnalysis,
} from '../../../types/inspector';

export interface NetworkRequest extends GlobalNetworkRequest {
  protocol: string;
  type: string;
  securityDetails?: any;
  timing?: any;
  serverIPAddress?: string;
  connection?: string;
  isIntercepted?: boolean;
  analysis?: NetworkAnalysis & {
    securityIssues?: SecurityIssue[];
  };
}

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
