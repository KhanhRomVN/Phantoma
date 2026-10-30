/**
 * ------------------------------------------------------------------
 * useNetworkEvents
 * ------------------------------------------------------------------
 * Hook lắng nghe network events từ CDP và Proxy qua IPC.
 * Xử lý request/response/body/script events và cập nhật store.
 *
 * Các chức năng chính:
 * - Lắng nghe CDP request/response/body events
 * - Lắng nghe Proxy request/response/body events
 * - Quản lý refs cho pending requests và unpacked scripts
 * - Auto-cleanup stale requests sau 10s
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useEffect, useRef, useCallback } from 'react';

// ── Utils ──

import {
  buildCdpRequest,
  parseProxyRequest,
  decodeBinaryBody,
  formatElapsedTime,
  formatResponseSize,
  buildPlaceholderRequest,
} from '../utils/network-event-parser.util';

// ── Hooks ─
import { useNetworkWorker } from './useNetworkWorker';

// ── Services ──
import { wsBus } from '../services/runtime-ws-bridge'; // <--- NEW IMPORT

// ── Stores ──
import { useNetworkStore } from '../stores/networkStore';
import { useWebSocketStore } from '../stores/websocketStore';

// ── Types ─
import { NetworkRequest } from '../types/inspector';

// ─── Types ──────────────────────────────────────────────────────────────
export interface CdpRequestData {
  id: string;
  url: string;
  method: string;
  resourceType: string;
  headers: Record<string, string>;
  requestBody?: string;
  timestamp: number;
  initiator?: {
    type: string;
    url?: string;
    lineNumber?: number;
    columnNumber?: number;
    functionName?: string;
    stack?: Array<{
      functionName: string;
      url: string;
      lineNumber: number;
      columnNumber: number;
    }>;
  };
}

export interface CdpResponseData {
  id: string;
  url?: string;
  statusCode: number;
  headers: Record<string, string>;
  timestamp: number;
}

export interface CdpResponseBodyData {
  id: string;
  body: string;
  size: number;
  timestamp: number;
  isUnpacked?: boolean;
}

export interface CdpScriptUnpackedData {
  requestId: string;
  url: string;
  scriptId: string;
  staticSource: string | null;
  unpackedSource: string;
  isDifferent: boolean;
  compressionRatio: string;
  timestamp: number;
}

export interface CdpScriptSourceData {
  scriptId: string;
  url: string;
  source: string;
  size: number;
  timestamp: number;
  hasSourceURL?: boolean;
  sourceMapURL?: string;
}

interface UseNetworkEventsOptions {
  targetId?: string;
  onRequest?: (request: NetworkRequest) => void;
  onResponse?: (requestId: string, status: number, headers: Record<string, string>) => void;
  onResponseBody?: (requestId: string, body: string, size: number) => void;
  onScriptUnpacked?: (data: CdpScriptUnpackedData) => void;
  onScriptSource?: (data: CdpScriptSourceData) => void;
  onError?: (error: any) => void;
  onRequestsChange?: (requests: NetworkRequest[]) => void;
}

export function useNetworkEvents(options: UseNetworkEventsOptions = {}) {
  const {
    targetId = '',
    onRequest,
    onResponse,
    onResponseBody,
    onScriptUnpacked,
    onScriptSource,
    onError,
    onRequestsChange,
  } = options;

  // Use network worker hook (background thread, no Main Thread blocking)
  const { addRequest, updateRequest, clearRequests, loadMore, hasMore, loading, totalCount } =
    useNetworkWorker({
      targetId,
      onRequestsChange,
    });

  const requestMapRef = useRef<Map<string, NetworkRequest>>(new Map());
  const timestampMapRef = useRef<Map<string, number>>(new Map());
  const unpackedScriptsRef = useRef<Map<string, CdpScriptUnpackedData>>(new Map());
  const pendingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reset refs when targetId changes to prevent memory leak
  useEffect(() => {
    requestMapRef.current = new Map();
    timestampMapRef.current = new Map();
    unpackedScriptsRef.current = new Map();
    // Clear all pending timeouts
    pendingTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    pendingTimeoutsRef.current = new Map();
    // Clear cleanup interval
    if (cleanupIntervalRef.current) {
      clearInterval(cleanupIntervalRef.current);
      cleanupIntervalRef.current = null;
    }
  }, [targetId]);

  // Build request object from CDP data — delegates to pure parser
  const buildRequest = useCallback((data: CdpRequestData): Partial<NetworkRequest> => {
    const { request, generatedId, timestamp } = buildCdpRequest(data);
    timestampMapRef.current.set(generatedId, timestamp);
    return request;
  }, []);

  // Handle CDP request event
  let _debugCdpReqCount = 0;
  const handleCdpRequest = useCallback(
    (data: CdpRequestData) => {
      _debugCdpReqCount++;
      const req = buildRequest(data);
      const fullReq = req as NetworkRequest;

      // Skip non-network protocols (data:, blob:, etc.)
      if (fullReq.protocol === 'data' || fullReq.protocol === 'blob') {
        if (_debugCdpReqCount <= 5) {
          console.warn('[useNetworkEvents][DEBUG] SKIPPED data/blob URI:', fullReq.url);
        }
        return;
      }
      // Skip OPTIONS preflight requests to reduce noise (they often don't complete properly in CDP)
      if (fullReq.method === 'OPTIONS') {
        if (_debugCdpReqCount <= 5) {
          console.warn('[useNetworkEvents][DEBUG] SKIPPED OPTIONS preflight:', fullReq.url);
        }
        return;
      }

      requestMapRef.current.set(fullReq.id, fullReq);

      addRequest(fullReq);
      onRequest?.(fullReq);
    },
    [buildRequest, addRequest, onRequest],
  );

  // Handle CDP response event
  const handleCdpResponse = useCallback(
    (data: CdpResponseData) => {
      const existing = requestMapRef.current.get(data.id);

      // Clear timeout if exists
      const timeout = pendingTimeoutsRef.current.get(data.id);
      if (timeout) {
        clearTimeout(timeout);
        pendingTimeoutsRef.current.delete(data.id);
      }

      // Only log errors or issues
      if (!existing) {
        // Skip responses for data/blob URIs — these are not real network requests
        if (data.url && (data.url.startsWith('data:') || data.url.startsWith('blob:'))) {
          return;
        }
        // Skip responses without URL — placeholder sẽ không có thông tin hữu ích
        if (!data.url) {
          return;
        }
        const placeholder = buildPlaceholderRequest(
          data.id,
          data.statusCode,
          data.headers,
          data.timestamp || Date.now(),
        );
        requestMapRef.current.set(data.id, placeholder);
        addRequest(placeholder);
        onRequest?.(placeholder);
        onResponse?.(data.id, data.statusCode, data.headers);
      } else {
        // Only log if status code indicates error (4xx, 5xx)
        if (data.statusCode >= 400) {
          console.warn('[DEBUG|NetworkEvents] CDP Response error', {
            id: data.id,
            statusCode: data.statusCode,
            url: existing.url,
            method: existing.method,
          });
        }

        const updates: Partial<NetworkRequest> = {
          status: data.statusCode ?? 200,
          responseHeaders: data.headers || {},
        };
        const updated = { ...existing, ...updates };
        requestMapRef.current.set(data.id, updated);
        updateRequest(data.id, updates);
        onResponse?.(data.id, data.statusCode, data.headers);
      }
    },
    [updateRequest, onResponse, addRequest, onRequest],
  );

  // Handle CDP response body event
  const handleCdpResponseBody = useCallback(
    (data: CdpResponseBodyData) => {
      const requestTimestamp = timestampMapRef.current.get(data.id);
      let timeStr = '0ms';

      if (requestTimestamp) {
        const { timeStr: elapsed } = formatElapsedTime(
          requestTimestamp,
          data.timestamp || Date.now(),
        );
        timeStr = elapsed;
        timestampMapRef.current.delete(data.id);
      }

      const { sizeStr } = formatResponseSize(data.size);

      const updates: Partial<NetworkRequest> = {
        responseBody: data.body || '',
        size: sizeStr,
        time: timeStr,
      };

      if (data.isUnpacked) {
        updates.responseBody = `/* UNPACKED SOURCE FROM DEBUGGER API */\n${data.body || ''}`;
      }

      updateRequest(data.id, updates);
      onResponseBody?.(data.id, data.body || '', data.size);
    },
    [updateRequest, onResponseBody],
  );

  // Handle script unpacked event
  const handleScriptUnpacked = useCallback(
    (data: CdpScriptUnpackedData) => {
      unpackedScriptsRef.current.set(data.requestId, data);
      onScriptUnpacked?.(data);
    },
    [onScriptUnpacked],
  );

  // Handle script source event
  const handleScriptSource = useCallback(
    (data: CdpScriptSourceData) => {
      onScriptSource?.(data);
    },
    [onScriptSource],
  );

  // Proxy event handlers
  const handleProxyRequest = useCallback(
    (data: any) => {
      try {
        const { request, generatedId, timestamp } = parseProxyRequest(data);
        // Skip non-network protocols (data:, blob:, etc.)
        if (request.protocol === 'data' || request.protocol === 'blob') return;
        // Skip OPTIONS preflight requests
        if (request.method === 'OPTIONS') {
          return;
        }

        timestampMapRef.current.set(generatedId, timestamp);
        requestMapRef.current.set(generatedId, request);
        addRequest(request);
        onRequest?.(request);

        // Set timeout to mark as failed if no response after 10s (reduced from 30s)
        const timeoutId = setTimeout(() => {
          const existing = requestMapRef.current.get(generatedId);
          if (existing && existing.status === 0) {
            updateRequest(generatedId, {
              status: 0,
              responseHeaders: { 'X-Request-Status': 'Timeout' },
              time: '10000ms',
            });
          }
          pendingTimeoutsRef.current.delete(generatedId);
        }, 10000);

        pendingTimeoutsRef.current.set(generatedId, timeoutId);
      } catch (error) {
        onError?.(error);
      }
    },
    [addRequest, onRequest, onError, updateRequest],
  );

  // Handle SSL Bypass connections (TCP tunnels without decryption)
  const handleSslBypass = useCallback(
    (data: any) => {
      try {
        const { id, host, port, timestamp, note } = data;

        // Create a special request object for SSL bypass
        const bypassRequest: NetworkRequest = {
          id: id || `ssl-bypass-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          url: `https://${host}${port === 443 ? '' : `:${port}`}`,
          protocol: 'https',
          host: host,
          path: '/',
          method: 'TUNNEL', // Changed from CONNECT to be more user-friendly
          status: 200, // Tunnel established
          requestHeaders: {
            'X-SSL-Bypass': 'true',
            'X-Bypass-Note': note || 'TCP tunnel without decryption',
          },
          responseHeaders: {
            'X-Connection-Type': 'SSL Bypass',
            'X-Decryption': 'Disabled',
          },
          requestBody: '',
          responseBody: '',
          type: 'other',
          size: '0 B',
          time: '0ms',
          timestamp: timestamp || Date.now(),
        };

        requestMapRef.current.set(bypassRequest.id, bypassRequest);
        addRequest(bypassRequest);
        onRequest?.(bypassRequest);
      } catch (error) {
        console.error('[handleSslBypass] Error:', error);
        onError?.(error);
      }
    },
    [addRequest, onRequest, onError],
  );

  const handleProxyResponse = useCallback(
    (data: any) => {
      try {
        // Clear timeout if exists
        const timeout = pendingTimeoutsRef.current.get(data.id);
        if (timeout) {
          clearTimeout(timeout);
          pendingTimeoutsRef.current.delete(data.id);
        }

        const existing = requestMapRef.current.get(data.id);

        if (existing) {
          // Only log if status code indicates error (4xx, 5xx)
          if (data.statusCode >= 400) {
            console.warn('[DEBUG|NetworkEvents] Proxy Response error', {
              id: data.id,
              statusCode: data.statusCode,
              url: existing.url,
              method: existing.method,
            });
          }

          const updates = {
            status: data.statusCode ?? 200,
            responseHeaders: data.headers || {},
          };
          const updated = { ...existing, ...updates };
          requestMapRef.current.set(data.id, updated);
          updateRequest(data.id, updates);
          onResponse?.(data.id, data.statusCode, data.headers);
        } else {
          // Skip responses without URL — placeholder sẽ không có thông tin hữu ích
          if (!data.url) {
            return;
          }
          const placeholder = buildPlaceholderRequest(
            data.id,
            data.statusCode,
            data.headers || {},
            data.timestamp || Date.now(),
          );
          requestMapRef.current.set(data.id, placeholder);
          addRequest(placeholder);
          onRequest?.(placeholder);
          onResponse?.(data.id, data.statusCode, data.headers);
        }
      } catch (error) {
        onError?.(error);
      }
    },
    [updateRequest, onResponse, addRequest, onRequest, onError],
  );

  const handleProxyResponseBody = useCallback(
    (data: any) => {
      try {
        const requestTimestamp = timestampMapRef.current.get(data.id);
        let timeStr = '0ms';
        let sizeBytes = 0;

        if (requestTimestamp) {
          const result = formatElapsedTime(requestTimestamp, data.timestamp || Date.now());
          timeStr = result.timeStr;
          timestampMapRef.current.delete(data.id);
        }

        const sizeResult = formatResponseSize(data.size);
        sizeBytes = sizeResult.sizeBytes;
        const finalSize = sizeResult.sizeStr;

        const body = decodeBinaryBody(data.body || '', data.isBinary, 'Binary Data');

        updateRequest(data.id, {
          responseBody: body,
          size: finalSize,
          time: timeStr,
        });

        onResponseBody?.(data.id, body, sizeBytes);
      } catch (error) {
        onError?.(error);
      }
    },
    [updateRequest, onResponseBody, onError],
  );

  const handleProxyRequestBody = useCallback(
    (data: any) => {
      try {
        const existing = requestMapRef.current.get(data.id);
        if (existing) {
          const body = decodeBinaryBody(data.body || '', data.isBinary, 'Binary Request Body');
          updateRequest(data.id, { requestBody: body });
        }
      } catch (error) {
        onError?.(error);
      }
    },
    [updateRequest, onError],
  );

  // ── WebSocket event handlers (từ ProxyServer qua IPC) ──
  const handleWsConnect = useCallback(
    (_event: any, data: any) => {
      try {
        if (!data?.id || !data?.url) return;
        const protocol = typeof data.url === 'string' && data.url.startsWith('wss') ? 'wss' : 'ws';
        useWebSocketStore.getState().addConnection({
          id: data.id,
          url: data.url,
          host: data.host || '',
          path: data.path || '',
          protocol,
          status: 'connecting',
          openedAt: data.startTime || Date.now(),
          requestHeaders: data.requestHeaders,
          responseHeaders: data.responseHeaders,
          frames: [],
        });
      } catch (error) {
        console.error('[DEBUG|NetworkEvents] ws:connect handler failed', error);
        onError?.(error);
      }
    },
    [onError],
  );

  const handleWsMessage = useCallback(
    (_event: any, data: any) => {
      try {
        if (!data?.connectionId || !data?.id) return;
        const direction = data.direction === 'client' ? 'send' : 'receive';
        const opcode = data.dataType === 'binary' ? 'binary' : 'text';
        useWebSocketStore.getState().addFrame(data.connectionId, {
          id: data.id,
          connectionId: data.connectionId,
          direction,
          opcode,
          payload: data.data || '',
          size: data.size || 0,
          timestamp: data.timestamp || Date.now(),
        });
      } catch (error) {
        console.error('[DEBUG|NetworkEvents] ws:message handler failed', error);
        onError?.(error);
      }
    },
    [onError],
  );

  const handleWsUpdate = useCallback(
    (_event: any, data: any) => {
      try {
        if (!data?.id) return;
        const updates: Partial<{
          status: 'connecting' | 'open' | 'closed' | 'error';
          responseHeaders: Record<string, string>;
        }> = {};
        if (data.status === 'connected') updates.status = 'open';
        else if (data.status === 'connecting') updates.status = 'connecting';
        else if (data.status === 'closed') updates.status = 'closed';
        else if (data.status === 'error') updates.status = 'error';
        if (data.responseHeaders) updates.responseHeaders = data.responseHeaders;
        if (Object.keys(updates).length > 0) {
          useWebSocketStore.getState().updateConnection(data.id, updates);
        }
      } catch (error) {
        console.error('[DEBUG|NetworkEvents] ws:update handler failed', error);
        onError?.(error);
      }
    },
    [onError],
  );

  const handleWsClose = useCallback(
    (_event: any, data: any) => {
      try {
        if (!data?.id) return;
        useWebSocketStore.getState().updateConnection(data.id, {
          status: 'closed',
          closedAt: data.endTime || Date.now(),
        });
      } catch (error) {
        console.error('[DEBUG|NetworkEvents] ws:close handler failed', error);
        onError?.(error);
      }
    },
    [onError],
  );

  // ── CLI Capture method handlers (eBPF, Packet Capture, App Debug) ──
  const handleEbpfHttpsEvent = useCallback(
    (_event: any, data: any) => {
      try {
        if (!data?.id) return;

        // Convert eBPF event to NetworkRequest format
        if (data.type === 'request') {
          const request: NetworkRequest = {
            id: data.id,
            url: data.url || '',
            protocol: 'https',
            host: data.headers?.['Host'] || '',
            path: data.url || '',
            method: data.method || 'GET',
            status: 0,
            requestHeaders: data.headers || {},
            responseHeaders: {},
            requestBody: data.body || '',
            responseBody: '',
            type: 'xhr',
            size: '0 B',
            time: '0ms',
            timestamp: data.timestamp || Date.now(),
          };

          // Add special header to indicate eBPF capture
          request.requestHeaders['X-Capture-Method'] = 'eBPF';

          timestampMapRef.current.set(data.id, data.timestamp || Date.now());
          requestMapRef.current.set(data.id, request);
          addRequest(request);
          onRequest?.(request);
        } else if (data.type === 'response') {
          // Update existing request with response
          const existing = requestMapRef.current.get(data.id);
          if (existing) {
            const requestTimestamp = timestampMapRef.current.get(data.id);
            let timeStr = '0ms';
            if (requestTimestamp) {
              const elapsed = Date.now() - requestTimestamp;
              timeStr = `${elapsed}ms`;
              timestampMapRef.current.delete(data.id);
            }

            const updates: Partial<NetworkRequest> = {
              status: data.statusCode || 200,
              responseHeaders: data.headers || {},
              responseBody: data.body || '',
              time: timeStr,
            };

            updateRequest(data.id, updates);
            onResponse?.(data.id, data.statusCode || 200, data.headers || {});
            onResponseBody?.(data.id, data.body || '', data.body?.length || 0);
          }
        }
      } catch (error) {
        console.error('[DEBUG|NetworkEvents] ebpf:https-event handler failed', error);
        onError?.(error);
      }
    },
    [addRequest, updateRequest, onRequest, onResponse, onResponseBody, onError],
  );

  const handlePacketCaptured = useCallback(
    (_event: any, data: any) => {
      try {
        if (!data?.id) return;

        // Convert packet to NetworkRequest format (metadata only)
        const request: NetworkRequest = {
          id: data.id,
          url: `${data.protocol.toLowerCase()}://${data.destination.host}:${data.destination.port}`,
          protocol: data.protocol.toLowerCase(),
          host: data.destination.host,
          path: '/',
          method: 'PACKET', // Special method for packet capture
          status: data.encrypted ? 0 : 200,
          requestHeaders: {
            'X-Capture-Method': 'Packet Capture',
            'X-Encrypted': data.encrypted ? 'true' : 'false',
            'X-Source': `${data.source.host}:${data.source.port}`,
            'X-Flags': data.flags || '',
          },
          responseHeaders: {},
          requestBody: data.encrypted ? '[Encrypted - No plaintext available]' : '',
          responseBody: '',
          type: 'other',
          size: `${data.size} B`,
          time: '0ms',
          timestamp: data.timestamp || Date.now(),
        };

        requestMapRef.current.set(data.id, request);
        addRequest(request);
        onRequest?.(request);
      } catch (error) {
        console.error('[DEBUG|NetworkEvents] packet:captured handler failed', error);
        onError?.(error);
      }
    },
    [addRequest, onRequest, onError],
  );

  const handleAppDebugLog = useCallback(
    (_event: any, data: any) => {
      try {
        if (!data?.id) return;

        // Convert debug log to NetworkRequest format (for display purposes)
        const request: NetworkRequest = {
          id: data.id,
          url: `app-debug://${data.module || 'app'}`,
          protocol: 'app-debug',
          host: data.module || 'app',
          path: `/${data.level}`,
          method: 'LOG',
          status: data.level === 'error' ? 500 : 200,
          requestHeaders: {
            'X-Capture-Method': 'App Debug',
            'X-Log-Level': data.level,
            'X-Module': data.module || 'unknown',
          },
          responseHeaders: {},
          requestBody: '',
          responseBody: data.message || '',
          type: 'other',
          size: `${data.message?.length || 0} B`,
          time: '0ms',
          timestamp: data.timestamp || Date.now(),
        };

        requestMapRef.current.set(data.id, request);
        addRequest(request);
        onRequest?.(request);
      } catch (error) {
        console.error('[DEBUG|NetworkEvents] app-debug:log handler failed', error);
        onError?.(error);
      }
    },
    [addRequest, onRequest, onError],
  );

  // Setup WebSocket Bus listeners
  useEffect(() => {
    if (!targetId) {
      return;
    }

    // REMOVED: Periodic cleanup/stale detection.
    // Requests should remain in "Pending" state indefinitely until they receive
    // a response or are explicitly cancelled by the browser/system.
    // This prevents false positives for long-running operations like uploads,
    // large downloads, SSE streams, or complex backend processing.

    const unsubscribes: (() => void)[] = [];

    // Helper to subscribe and store unsubscribe fn
    const sub = (channel: string, handler: (event: unknown, data: unknown) => void) => {
      const unsub = wsBus.on(channel, handler);
      unsubscribes.push(unsub);
    };

    // CDP Events
    sub('cdp:request', (_e, d) => {
      try {
        handleCdpRequest(d as CdpRequestData);
      } catch (err) {
        onError?.(err);
      }
    });

    sub('cdp:response', (_e, d) => {
      try {
        handleCdpResponse(d as CdpResponseData);
      } catch (err) {
        onError?.(err);
      }
    });

    sub('cdp:response-body', (_e, d) => {
      try {
        handleCdpResponseBody(d as CdpResponseBodyData);
      } catch (err) {
        onError?.(err);
      }
    });

    sub('cdp:script-unpacked', (_e, d) => {
      try {
        handleScriptUnpacked(d as CdpScriptUnpackedData);
      } catch (err) {
        onError?.(err);
      }
    });

    sub('cdp:script-source', (_e, d) => {
      try {
        handleScriptSource(d as CdpScriptSourceData);
      } catch (err) {
        onError?.(err);
      }
    });

    sub('cdp:error', (_e, d) => {
      onError?.(d);
    });

    // Proxy Events (if applicable via same bus later)
    sub('proxy:request', (_e, d) => {
      try {
        handleProxyRequest(d);
      } catch (err) {
        onError?.(err);
      }
    });

    sub('proxy:response', (_e, d) => {
      try {
        handleProxyResponse(d);
      } catch (err) {
        onError?.(err);
      }
    });

    sub('proxy:response-body', (_e, d) => {
      try {
        handleProxyResponseBody(d);
      } catch (err) {
        onError?.(err);
      }
    });

    sub('proxy:request-body', (_e, d) => {
      try {
        handleProxyRequestBody(d);
      } catch (err) {
        onError?.(err);
      }
    });

    sub('proxy:ssl-bypass', (_e, d) => {
      try {
        handleSslBypass(d);
      } catch (err) {
        onError?.(err);
      }
    });

    // WebSocket Store Events
    sub('ws:connect', (_e, d) => handleWsConnect(_e, d));
    sub('ws:message', (_e, d) => handleWsMessage(_e, d));
    sub('ws:update', (_e, d) => handleWsUpdate(_e, d));
    sub('ws:close', (_e, d) => handleWsClose(_e, d));

    // CLI Capture Events
    sub('ebpf:https-event', (_e, d) => handleEbpfHttpsEvent(_e, d));
    sub('packet:captured', (_e, d) => handlePacketCaptured(_e, d));
    sub('app-debug:log', (_e, d) => handleAppDebugLog(_e, d));

    return () => {
      // Unsubscribe all listeners
      unsubscribes.forEach((fn) => fn());

      // Clear all pending timeouts on unmount
      pendingTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      pendingTimeoutsRef.current.clear();

      // Clear cleanup interval
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
        cleanupIntervalRef.current = null;
      }
    };
  }, [
    handleCdpRequest,
    handleCdpResponse,
    handleCdpResponseBody,
    handleScriptUnpacked,
    handleScriptSource,
    onError,
    handleProxyRequest,
    handleSslBypass,
    handleProxyResponse,
    handleProxyResponseBody,
    handleProxyRequestBody,
    handleWsConnect,
    handleWsMessage,
    handleWsUpdate,
    handleWsClose,
    handleEbpfHttpsEvent,
    handlePacketCaptured,
    handleAppDebugLog,
    targetId,
    updateRequest,
  ]);

  return {
    requests: useNetworkStore.getState().requests,
    addRequest,
    updateRequest,
    clearRequests,
    loadMore,
    hasMore,
    loading,
    totalCount,
    requestMap: requestMapRef.current,
    unpackedScripts: unpackedScriptsRef.current,
  };
}

export default useNetworkEvents;
