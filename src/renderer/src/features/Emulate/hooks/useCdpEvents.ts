import { useEffect, useRef, useState, useCallback } from 'react';
import { NetworkRequest } from '../types/inspector';

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

interface UseCdpEventsOptions {
  onRequest?: (request: NetworkRequest) => void;
  onResponse?: (requestId: string, status: number, headers: Record<string, string>) => void;
  onResponseBody?: (requestId: string, body: string, size: number) => void;
  onScriptUnpacked?: (data: CdpScriptUnpackedData) => void;
  onScriptSource?: (data: CdpScriptSourceData) => void;
  onError?: (error: any) => void;
}

export function useCdpEvents(options: UseCdpEventsOptions = {}) {
  const { onRequest, onResponse, onResponseBody, onScriptUnpacked, onScriptSource, onError } = options;

  const [requests, setRequests] = useState<NetworkRequest[]>([]);
  const requestMapRef = useRef<Map<string, NetworkRequest>>(new Map());
  const timestampMapRef = useRef<Map<string, number>>(new Map());
  const unpackedScriptsRef = useRef<Map<string, CdpScriptUnpackedData>>(new Map());

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
        initiator: data.initiator ? JSON.stringify(data.initiator) : undefined,
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

      const updates: Partial<NetworkRequest> = {
        responseBody: data.body || '',
        size: sizeStr,
        time: timeStr,
      };

      // Mark as unpacked if it came from Debugger API
      if (data.isUnpacked) {
        updates.responseBody = `/* UNPACKED SOURCE FROM DEBUGGER API */\n${data.body || ''}`;
      }

      updateRequest(data.id, updates);

      onResponseBody?.(data.id, data.body || '', data.size);
    },
    [updateRequest, onResponseBody],
  );

  const handleScriptUnpacked = useCallback(
    (data: CdpScriptUnpackedData) => {
      unpackedScriptsRef.current.set(data.requestId, data);
      
      // Log comparison result
      if (data.isDifferent) {
        console.log(`[CDP:Unpacked] Script differs! ${data.url} - Compression: ${data.compressionRatio}`);
      }

      onScriptUnpacked?.(data);
    },
    [onScriptUnpacked],
  );

  const handleScriptSource = useCallback(
    (data: CdpScriptSourceData) => {
      console.log(`[CDP:ScriptSource] Received unpacked source for ${data.url} (${data.size} bytes)`);
      onScriptSource?.(data);
    },
    [onScriptSource],
  );

  const clearRequests = useCallback(() => {
    setRequests([]);
    requestMapRef.current.clear();
    timestampMapRef.current.clear();
    unpackedScriptsRef.current.clear();
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

    const handleScriptUnpackedEvent = (event: any, data: any) => {
      try {
        handleScriptUnpacked(data);
      } catch (error) {
        onError?.(error);
      }
    };

    const handleScriptSourceEvent = (event: any, data: any) => {
      try {
        handleScriptSource(data);
      } catch (error) {
        onError?.(error);
      }
    };

    if (window.api?.on) {
      window.api.on('cdp:request', handleRequest);
      window.api.on('cdp:response', handleResponse);
      window.api.on('cdp:response-body', handleResponseBody);
      window.api.on('cdp:script-unpacked', handleScriptUnpackedEvent);
      window.api.on('cdp:script-source', handleScriptSourceEvent);
      window.api.on('cdp:error', handleError);

      listeners.push(
        { event: 'cdp:request', handler: handleRequest },
        { event: 'cdp:response', handler: handleResponse },
        { event: 'cdp:response-body', handler: handleResponseBody },
        { event: 'cdp:script-unpacked', handler: handleScriptUnpackedEvent },
        { event: 'cdp:script-source', handler: handleScriptSourceEvent },
        { event: 'cdp:error', handler: handleError },
      );
    }

    return () => {
      // Note: window.api.off is not implemented in preload
      // Cleanup will happen on unmount
    };
  }, [handleCdpRequest, handleCdpResponse, handleCdpResponseBody, handleScriptUnpacked, handleScriptSource, onError]);

  return {
    requests,
    addRequest,
    updateRequest,
    clearRequests,
    requestMap: requestMapRef.current,
    unpackedScripts: unpackedScriptsRef.current,
  };
}

export default useCdpEvents;