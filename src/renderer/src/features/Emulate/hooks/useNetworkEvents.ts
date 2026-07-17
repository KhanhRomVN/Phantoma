import { useEffect, useRef, useCallback } from 'react';
import { NetworkRequest } from '../types/inspector';
import { usePaginatedRequests } from './usePaginatedRequests';

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
  initialRequests?: NetworkRequest[];
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
    initialRequests = [],
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
    maxMemory: 1000,
    onRequestsChange,
  });

  const requestMapRef = useRef<Map<string, NetworkRequest>>(new Map());
  const timestampMapRef = useRef<Map<string, number>>(new Map());
  const unpackedScriptsRef = useRef<Map<string, CdpScriptUnpackedData>>(new Map());

  // Build request object from CDP data
  const buildRequest = useCallback((data: CdpRequestData): Partial<NetworkRequest> => {
    let host = '';
    let path = '';
    let protocol = 'http';
    try {
      if (data.url) {
        const url = new URL(data.url);
        host = url.host;
        path = url.pathname;
        protocol = url.protocol.replace(':', '');
      }
    } catch {
      // Ignore invalid URL
    }

    const resourceTypeMap: Record<string, string> = {
      Document: 'doc',
      XHR: 'xhr',
      Fetch: 'fetch',
      Script: 'js',
      Stylesheet: 'css',
      Image: 'img',
      Media: 'media',
      Font: 'font',
      WebSocket: 'ws',
      Manifest: 'manifest',
      Other: 'other',
    };
    const type = resourceTypeMap[data.resourceType] || 'other';
    const id = data.id || `cdp-${Date.now()}-${Math.random()}`;
    timestampMapRef.current.set(id, data.timestamp || Date.now());

    return {
      id,
      method: data.method || 'GET',
      protocol,
      host,
      path,
      url: data.url || '',
      status: 0,
      type,
      size: '0 B',
      time: '0ms',
      timestamp: data.timestamp || Date.now(),
      requestHeaders: data.headers || {},
      responseHeaders: {},
      requestBody: data.requestBody || '',
      responseBody: '',
      initiator: data.initiator ? JSON.stringify(data.initiator) : undefined,
    };
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
        console.debug('[DEBUG] Creating placeholder request for response ID:', data.id);
        // Create placeholder request from response data
        const placeholder: Partial<NetworkRequest> = {
          id: data.id,
          method: 'GET', // Fallback - method not available in response
          url: '', // Will be filled from response headers if available
          status: data.statusCode || 200,
          responseHeaders: data.headers || {},
          timestamp: data.timestamp || Date.now(),
          type: 'other',
          host: '',
          path: '/',
          protocol: 'http',
          size: '0 B',
          time: '0ms',
          requestHeaders: {},
          responseBody: '',
          requestBody: '',
        };
        // Try to extract URL from response headers
        if (data.headers && typeof data.headers === 'object') {
          const urlHeader = data.headers[':path'] || data.headers['x-original-url'] || '';
          if (urlHeader) {
            placeholder.url = urlHeader;
          }
        }
        const fullReq = placeholder as NetworkRequest;
        requestMapRef.current.set(data.id, fullReq);
        addRequest(fullReq);
        onRequest?.(fullReq);
        onResponse?.(data.id, data.statusCode, data.headers);
      }
    },
    [updateRequest, onResponse, addRequest, onRequest],
  );

  // Handle CDP response body event
  const handleCdpResponseBody = useCallback(
    (data: CdpResponseBodyData) => {
      const requestTimestamp = timestampMapRef.current.get(data.id);
      let timeMs = 0;

      if (requestTimestamp) {
        const currentTime = data.timestamp || Date.now();
        timeMs = currentTime - requestTimestamp;
        timestampMapRef.current.delete(data.id);
      }

      const timeStr = timeMs >= 1000 ? `${(timeMs / 1000).toFixed(2)}s` : `${timeMs}ms`;
      const sizeStr = data.size ? `${(data.size / 1024).toFixed(1)} KB` : '0 B';

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
        let host = '';
        let path = '';
        let protocol = 'https';
        try {
          if (data.url) {
            const url = new URL(data.url);
            host = url.host;
            path = url.pathname;
            protocol = url.protocol.replace(':', '');
          }
        } catch {
          // Ignore invalid URL
        }

        let type = 'other';
        const pathLower = path.toLowerCase();
        if (pathLower.endsWith('.js')) type = 'js';
        else if (pathLower.endsWith('.css')) type = 'css';
        else if (pathLower.endsWith('.html') || pathLower.endsWith('.htm')) type = 'doc';
        else if (
          pathLower.endsWith('.png') ||
          pathLower.endsWith('.jpg') ||
          pathLower.endsWith('.jpeg') ||
          pathLower.endsWith('.gif') ||
          pathLower.endsWith('.svg') ||
          pathLower.endsWith('.webp')
        ) type = 'img';
        else if (pathLower.endsWith('.json')) type = 'xhr';
        else if (
          data.method === 'POST' ||
          data.method === 'PUT' ||
          data.method === 'DELETE' ||
          data.method === 'PATCH'
        ) type = 'xhr';
        else if (
          data.method === 'GET' &&
          (data.url?.includes('api') || data.url?.includes('graphql'))
        ) type = 'xhr';

        const id = data.id || `proxy-${Date.now()}-${Math.random()}`;
        timestampMapRef.current.set(id, data.timestamp || Date.now());

        const req: NetworkRequest = {
          id,
          method: data.method || 'GET',
          protocol,
          host,
          path,
          url: data.url || '',
          status: 0,
          type,
          size: '0 B',
          time: '0ms',
          timestamp: data.timestamp || Date.now(),
          requestHeaders: data.headers || {},
          responseHeaders: {},
          requestBody: '',
          responseBody: '',
          initiator: data.initiator || undefined,
        };

        requestMapRef.current.set(id, req);
        addRequest(req);
        onRequest?.(req);
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
        let timeMs = 0;

        if (requestTimestamp) {
          const currentTime = data.timestamp || Date.now();
          timeMs = currentTime - requestTimestamp;
          timestampMapRef.current.delete(data.id);
        }

        const timeStr = timeMs >= 1000 ? `${(timeMs / 1000).toFixed(2)}s` : `${timeMs}ms`;

        let sizeBytes = 0;
        if (typeof data.size === 'string') {
          const match = data.size.match(/([\d.]+)\s*(KB|B)/);
          if (match) {
            const num = parseFloat(match[1]);
            if (match[2] === 'KB') sizeBytes = num * 1024;
            else sizeBytes = num;
          }
        } else if (typeof data.size === 'number') {
          sizeBytes = data.size;
        }

        const finalSize = sizeBytes > 0 ? `${(sizeBytes / 1024).toFixed(1)} KB` : '0 B';

        let body = data.body || '';
        if (data.isBinary && body) {
          try {
            const decoded = atob(body);
            try {
              const utf8Decoded = decodeURIComponent(escape(decoded));
              if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(utf8Decoded)) {
                body = `[Binary Data - Base64 encoded]\n${body.substring(0, 1000)}...`;
              } else {
                body = utf8Decoded;
              }
            } catch {
              body = `[Binary Data - Base64 encoded]\n${body.substring(0, 1000)}...`;
            }
          } catch {
            body = `[Binary Data - Unable to decode]\n${body.substring(0, 1000)}...`;
          }
        }

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
          let body = data.body || '';
          if (data.isBinary && body) {
            try {
              const decoded = atob(body);
              try {
                const utf8Decoded = decodeURIComponent(escape(decoded));
                if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(utf8Decoded)) {
                  body = `[Binary Request Body]\n${body.substring(0, 1000)}...`;
                } else {
                  body = utf8Decoded;
                }
              } catch {
                body = `[Binary Request Body]\n${body.substring(0, 1000)}...`;
              }
            } catch {
              body = `[Binary Request Body - Unable to decode]\n${body.substring(0, 1000)}...`;
            }
          }
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