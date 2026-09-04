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
import { logger } from '@renderer/utils/logger';
import {
  buildCdpRequest,
  parseProxyRequest,
  decodeBinaryBody,
  formatElapsedTime,
  formatResponseSize,
  buildPlaceholderRequest,
} from '../utils/network-event-parser.util';

// ── Hooks ──
import { usePaginatedRequests } from './usePaginatedRequests';

// ── Stores ──
import { useNetworkStore } from '../stores/networkStore';

// ── Types ──
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

// [DEBUG] Helper theo dõi kích thước Map — xóa sau khi fix rò rỉ RAM
function logMapStats(label: string, map: Map<string, any>) {
  let totalSize = 0;
  map.forEach((value) => {
    try {
      totalSize += JSON.stringify(value).length;
    } catch {
      // Bỏ qua giá trị không serialize được
    }
  });
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

  // Use paginated requests hook (store-backed, no React state)
  const { addRequest, updateRequest, clearRequests, loadMore, hasMore, loading, totalCount } =
    usePaginatedRequests({
      targetId,
      limit: 100,
      maxMemory: 500,
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
  const handleCdpRequest = useCallback(
    (data: CdpRequestData) => {
      const req = buildRequest(data);
      const fullReq = req as NetworkRequest;
      // Skip non-network protocols (data:, blob:, etc.)
      if (fullReq.protocol === 'data' || fullReq.protocol === 'blob') return;
      // Skip OPTIONS preflight requests to reduce noise (they often don't complete properly in CDP)
      if (fullReq.method === 'OPTIONS') {
        return;
      }

      requestMapRef.current.set(fullReq.id, fullReq);
      // [DEBUG] Theo dõi rò rỉ RAM — xóa sau khi fix
      logMapStats('requestMapRef', requestMapRef.current);
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
          logger.warn('[DEBUG|NetworkEvents] CDP Response error', {
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
      // [DEBUG] Theo dõi rò rỉ RAM — xóa sau khi fix
      logMapStats('unpackedScriptsRef', unpackedScriptsRef.current);
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
            logger.warn('[DEBUG|NetworkEvents] Proxy Response error', {
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

  // Setup IPC listeners
  useEffect(() => {
    if (!targetId) {
      return;
    }

    if (!window.api?.on) {
      return;
    }

    // Setup periodic cleanup for stuck pending requests (every 5 seconds)
    cleanupIntervalRef.current = setInterval(() => {
      // [DEBUG] Log tổng quan 3 Map mỗi 5s — xóa sau khi fix rò rỉ
      logMapStats('requestMapRef', requestMapRef.current);
      logMapStats('unpackedScriptsRef', unpackedScriptsRef.current);
      logMapStats('timestampMapRef', timestampMapRef.current);
      const now = Date.now();
      useNetworkStore.getState().requests.forEach((req) => {
        if (req.status === 0 && !req.responseHeaders?.['X-Request-Status']) {
          const timestamp = timestampMapRef.current.get(req.id);
          if (timestamp && now - timestamp > 10000) {
            // Request pending > 10s
            updateRequest(req.id, {
              status: 0,
              responseHeaders: { 'X-Request-Status': 'Stale' },
              time: `${now - timestamp}ms`,
            });
            timestampMapRef.current.delete(req.id);
          }
        }
      });
    }, 5000);

    const handleRequest = (_event: any, data: any) => {
      try {
        handleCdpRequest(data);
      } catch (error) {
        onError?.(error);
      }
    };

    const handleResponse = (_event: any, data: any) => {
      try {
        handleCdpResponse(data);
      } catch (error) {
        onError?.(error);
      }
    };

    const handleResponseBody = (_event: any, data: any) => {
      try {
        handleCdpResponseBody(data);
      } catch (error) {
        onError?.(error);
      }
    };

    const handleError = (_event: any, data: any) => {
      onError?.(data);
    };

    const handleScriptUnpackedEvent = (_event: any, data: any) => {
      try {
        handleScriptUnpacked(data);
      } catch (error) {
        onError?.(error);
      }
    };

    const handleScriptSourceEvent = (_event: any, data: any) => {
      try {
        handleScriptSource(data);
      } catch (error) {
        onError?.(error);
      }
    };

    const handleProxyRequestWrapped = (_event: any, data: any) => {
      try {
        handleProxyRequest(data);
      } catch (error) {
        onError?.(error);
      }
    };

    const handleProxyResponseWrapped = (_event: any, data: any) => {
      try {
        handleProxyResponse(data);
      } catch (error) {
        onError?.(error);
      }
    };

    const handleProxyResponseBodyWrapped = (_event: any, data: any) => {
      try {
        handleProxyResponseBody(data);
      } catch (error) {
        onError?.(error);
      }
    };

    const handleProxyRequestBodyWrapped = (_event: any, data: any) => {
      try {
        handleProxyRequestBody(data);
      } catch (error) {
        onError?.(error);
      }
    };

    window.api.on('cdp:request', handleRequest);
    window.api.on('cdp:response', handleResponse);
    window.api.on('cdp:response-body', handleResponseBody);
    window.api.on('cdp:script-unpacked', handleScriptUnpackedEvent);
    window.api.on('cdp:script-source', handleScriptSourceEvent);
    window.api.on('cdp:error', handleError);
    window.api.on('proxy:request', handleProxyRequestWrapped);
    window.api.on('proxy:response', handleProxyResponseWrapped);
    window.api.on('proxy:response-body', handleProxyResponseBodyWrapped);
    window.api.on('proxy:request-body', handleProxyRequestBodyWrapped);

    return () => {
      if (window.api?.off) {
        window.api.off('cdp:request', handleRequest);
        window.api.off('cdp:response', handleResponse);
        window.api.off('cdp:response-body', handleResponseBody);
        window.api.off('cdp:script-unpacked', handleScriptUnpackedEvent);
        window.api.off('cdp:script-source', handleScriptSourceEvent);
        window.api.off('cdp:error', handleError);
        window.api.off('proxy:request', handleProxyRequestWrapped);
        window.api.off('proxy:response', handleProxyResponseWrapped);
        window.api.off('proxy:response-body', handleProxyResponseBodyWrapped);
        window.api.off('proxy:request-body', handleProxyRequestBodyWrapped);
      }

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
    handleProxyResponse,
    handleProxyResponseBody,
    handleProxyRequestBody,
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
