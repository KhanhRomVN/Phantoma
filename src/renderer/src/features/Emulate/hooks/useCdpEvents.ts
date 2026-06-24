import { useEffect, useRef, useState, useCallback } from 'react';
import { NetworkRequest } from '../types/inspector';

interface CdpRequestData {
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

interface CdpResponseData {
  id: string;
  statusCode: number;
  headers: Record<string, string>;
  timestamp: number;
}

interface CdpResponseBodyData {
  id: string;
  body: string;
  size: number;
  timestamp: number;
}

interface UseCdpEventsOptions {
  onRequest?: (request: NetworkRequest) => void;
  onResponse?: (requestId: string, status: number, headers: Record<string, string>) => void;
  onResponseBody?: (requestId: string, body: string, size: number) => void;
  onError?: (error: any) => void;
}

export function useCdpEvents(options: UseCdpEventsOptions = {}) {
  const { onRequest, onResponse, onResponseBody, onError } = options;

  const [requests, setRequests] = useState<NetworkRequest[]>([]);
  const requestMapRef = useRef<Map<string, NetworkRequest>>(new Map());
  const timestampMapRef = useRef<Map<string, number>>(new Map());

  const addRequest = useCallback((req: NetworkRequest) => {
    setRequests((prev) => {
      const exists = prev.some((r) => r.id === req.id);
      if (exists) return prev;
      return [...prev, req];
    });
    requestMapRef.current.set(req.id, req);
    onRequest?.(req);
  }, [onRequest]);

  const updateRequest = useCallback((id: string, updates: Partial<NetworkRequest>) => {
    setRequests((prev) => {
      return prev.map((r) => {
        if (r.id === id) {
          const updated = { ...r, ...updates };
          requestMapRef.current.set(id, updated);
          return updated;
        }
        return r;
      });
    });
  }, []);

  const handleCdpRequest = useCallback(
    (data: CdpRequestData) => {
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
        requestBody: data.requestBody || '',
        responseBody: '',
        initiator: data.initiator,
      };

      addRequest(req);
    },
    [addRequest],
  );

  const handleCdpResponse = useCallback(
    (data: CdpResponseData) => {
      const existing = requestMapRef.current.get(data.id);
      if (existing) {
        updateRequest(data.id, {
          status: data.statusCode || 200,
          responseHeaders: data.headers || {},
        });
      }
      onResponse?.(data.id, data.statusCode, data.headers);
    },
    [updateRequest, onResponse],
  );

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

      updateRequest(data.id, {
        responseBody: data.body || '',
        size: sizeStr,
        time: timeStr,
      });

      onResponseBody?.(data.id, data.body || '', data.size);
    },
    [updateRequest, onResponseBody],
  );

  const clearRequests = useCallback(() => {
    setRequests([]);
    requestMapRef.current.clear();
    timestampMapRef.current.clear();
  }, []);

  // Setup IPC listeners
  useEffect(() => {
    const listeners: Array<{ event: string; handler: (event: any, data: any) => void }> = [];

    const handleRequest = (event: any, data: any) => {
      try {
        handleCdpRequest(data);
      } catch (error) {
        onError?.(error);
      }
    };

    const handleResponse = (event: any, data: any) => {
      try {
        handleCdpResponse(data);
      } catch (error) {
        onError?.(error);
      }
    };

    const handleResponseBody = (event: any, data: any) => {
      try {
        handleCdpResponseBody(data);
      } catch (error) {
        onError?.(error);
      }
    };

    const handleError = (event: any, data: any) => {
      onError?.(data);
    };

    if (window.api?.on) {
      window.api.on('cdp:request', handleRequest);
      window.api.on('cdp:response', handleResponse);
      window.api.on('cdp:response-body', handleResponseBody);
      window.api.on('cdp:error', handleError);

      listeners.push(
        { event: 'cdp:request', handler: handleRequest },
        { event: 'cdp:response', handler: handleResponse },
        { event: 'cdp:response-body', handler: handleResponseBody },
        { event: 'cdp:error', handler: handleError },
      );
    }

    return () => {
      // Note: window.api.off is not implemented in preload
      // Cleanup will happen on unmount
    };
  }, [handleCdpRequest, handleCdpResponse, handleCdpResponseBody, onError]);

  return {
    requests,
    addRequest,
    updateRequest,
    clearRequests,
    requestMap: requestMapRef.current,
  };
}

export default useCdpEvents;