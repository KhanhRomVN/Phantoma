import { useEffect, useRef, useCallback } from 'react';

// TYPE
import { NetworkRequest } from '../../types/inspector';

// HOOK
import { usePaginatedRequests } from './usePaginatedRequests';

// STORE
import { useNetworkStore } from '../../../../stores/networkStore';

// UTILS — pure network parsers (tách từ file này)
import {
  buildCdpRequest,
  parseProxyRequest,
  decodeBinaryBody,
  formatElapsedTime,
  formatResponseSize,
  buildPlaceholderRequest,
} from '../../utils/network-event-parser.util';

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

  // Use paginated requests hook
  const {
    requests,
    addRequest,
    updateRequest,
    clearRequests,
    loadMore,
    hasMore,
    loading,
    totalCount,
  } = usePaginatedRequests({
    targetId,
    limit: 100,
    maxMemory: 500,
    onRequestsChange,
  });

  const requestMapRef = useRef<Map<string, NetworkRequest>>(new Map());
  const timestampMapRef = useRef<Map<string, number>>(new Map());
  const unpackedScriptsRef = useRef<Map<string, CdpScriptUnpackedData>>(new Map());

  // Sync local requests to global store for RequestTable / Repeater
  useEffect(() => {
    useNetworkStore.setState({ requests });
  }, [requests]);

  // Reset refs when targetId changes to prevent memory leak
  useEffect(() => {
    requestMapRef.current = new Map();
    timestampMapRef.current = new Map();
    unpackedScriptsRef.current = new Map();
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
      if (existing) {
        const updates: Partial<NetworkRequest> = {
          status: data.statusCode || 200,
          responseHeaders: data.headers || {},
        };
        const updated = { ...existing, ...updates };
        requestMapRef.current.set(data.id, updated);
        updateRequest(data.id, updates);
        onResponse?.(data.id, data.statusCode, data.headers);
      } else {
        console.warn('[useNetworkEvents] No existing request for response:', data.id);
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
        const { timeStr: elapsed } = formatElapsedTime(requestTimestamp, data.timestamp || Date.now());
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
        timestampMapRef.current.set(generatedId, timestamp);
        requestMapRef.current.set(generatedId, request);
        addRequest(request);
        onRequest?.(request);
      } catch (error) {
        onError?.(error);
      }
    },
    [addRequest, onRequest, onError],
  );

  const handleProxyResponse = useCallback(
    (data: any) => {
      try {
        const existing = requestMapRef.current.get(data.id);
        if (existing) {
          const updates = {
            status: data.statusCode || 200,
            responseHeaders: data.headers || {},
          };
          const updated = { ...existing, ...updates };
          requestMapRef.current.set(data.id, updated);
          updateRequest(data.id, updates);
          onResponse?.(data.id, data.statusCode, data.headers);
        }
      } catch (error) {
        onError?.(error);
      }
    },
    [updateRequest, onResponse, onError],
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
      console.debug('[useNetworkEvents] No targetId, skipping IPC listener registration');
      return;
    }

    if (!window.api?.on) {
      console.warn('[useNetworkEvents] window.api.on not available');
      return;
    }

    const handleRequest = (_event: any, data: any) => {
      try {
        handleCdpRequest(data);
      } catch (error) {
        console.error('[useNetworkEvents] Error handling cdp:request:', error);
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
  ]);

  return {
    requests,
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