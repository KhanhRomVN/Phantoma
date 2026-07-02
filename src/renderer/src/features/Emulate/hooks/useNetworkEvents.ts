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

interface UseNetworkEventsOptions {
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
  const { initialRequests = [], onRequest, onResponse, onResponseBody, onScriptUnpacked, onScriptSource, onError, onRequestsChange } = options;

  const [requests, setRequests] = useState<NetworkRequest[]>(initialRequests);
  const requestMapRef = useRef<Map<string, NetworkRequest>>(new Map());
  const timestampMapRef = useRef<Map<string, number>>(new Map());
  const unpackedScriptsRef = useRef<Map<string, CdpScriptUnpackedData>>(new Map());

  const addRequest = useCallback((req: NetworkRequest) => {
    setRequests((prev) => {
      const exists = prev.some((r) => r.id === req.id);
      if (exists) return prev;
      const newRequests = [...prev, req];
      onRequestsChange?.(newRequests);
      return newRequests;
    });
    requestMapRef.current.set(req.id, req);
    onRequest?.(req);
  }, [onRequest, onRequestsChange]);

  const updateRequest = useCallback((id: string, updates: Partial<NetworkRequest>) => {
    setRequests((prev) => {
      const newRequests = prev.map((r) => {
        if (r.id === id) {
          const updated = { ...r, ...updates };
          requestMapRef.current.set(id, updated);
          return updated;
        }
        return r;
      });
      onRequestsChange?.(newRequests);
      return newRequests;
    });
  }, [onRequestsChange]);

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
      // if (data.isDifferent) {
      //   console.log(`[CDP:Unpacked] Script differs! ${data.url} - Compression: ${data.compressionRatio}`);
      // }

      onScriptUnpacked?.(data);
    },
    [onScriptUnpacked],
  );

  const handleScriptSource = useCallback(
    (data: CdpScriptSourceData) => {
      // console.log(`[CDP:ScriptSource] Received unpacked source for ${data.url} (${data.size} bytes)`);
      onScriptSource?.(data);
    },
    [onScriptSource],
  );

  // Proxy event handlers
  const handleProxyRequest = useCallback(
    (_event: any, data: any) => {
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

        

        // Try to guess type from URL or content-type
        let type = 'other';
        const pathLower = path.toLowerCase();
        if (pathLower.endsWith('.js')) type = 'js';
        else if (pathLower.endsWith('.css')) type = 'css';
        else if (pathLower.endsWith('.html') || pathLower.endsWith('.htm')) type = 'doc';
        else if (pathLower.endsWith('.png') || pathLower.endsWith('.jpg') || pathLower.endsWith('.jpeg') || pathLower.endsWith('.gif') || pathLower.endsWith('.svg') || pathLower.endsWith('.webp')) type = 'img';
        else if (pathLower.endsWith('.json')) type = 'xhr';
        else if (data.method === 'POST' || data.method === 'PUT' || data.method === 'DELETE' || data.method === 'PATCH') type = 'xhr';
        else if (data.method === 'GET' && (data.url?.includes('api') || data.url?.includes('graphql'))) type = 'xhr';

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

        addRequest(req);
      } catch (error) {
        onError?.(error);
      }
    },
    [addRequest, onError],
  );

  const handleProxyResponse = useCallback(
    (_event: any, data: any) => {
      try {
        const existing = requestMapRef.current.get(data.id);
        if (existing) {
          updateRequest(data.id, {
            status: data.statusCode || 200,
            responseHeaders: data.headers || {},
          });
        }
        onResponse?.(data.id, data.statusCode, data.headers);
      } catch (error) {
        onError?.(error);
      }
    },
    [updateRequest, onResponse, onError],
  );

  const handleProxyResponseBody = useCallback(
    (_event: any, data: any) => {
      try {
        const requestTimestamp = timestampMapRef.current.get(data.id);
        let timeMs = 0;

        if (requestTimestamp) {
          const currentTime = data.timestamp || Date.now();
          timeMs = currentTime - requestTimestamp;
          timestampMapRef.current.delete(data.id);
        }

        const timeStr = timeMs >= 1000 ? `${(timeMs / 1000).toFixed(2)}s` : `${timeMs}ms`;

        // Convert size string to bytes for proper display
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

        // Handle binary response body (base64 encoded)
        let body = data.body || '';
        if (data.isBinary && body) {
          try {
            // Try to decode base64
            const decoded = atob(body);
            // Check if it's valid UTF-8 text
            try {
              const utf8Decoded = decodeURIComponent(escape(decoded));
              // If decoded looks like text, use it
              if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(utf8Decoded)) {
                // Contains control chars, keep as base64
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
    (_event: any, data: any) => {
      try {
        const existing = requestMapRef.current.get(data.id);
        if (existing) {
          let body = data.body || '';
          // Handle binary request body
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

  const clearRequests = useCallback(() => {
    setRequests([]);
    requestMapRef.current.clear();
    timestampMapRef.current.clear();
    unpackedScriptsRef.current.clear();
    onRequestsChange?.([]);
  }, [onRequestsChange]);

  // Setup IPC listeners
  useEffect(() => {
    const listeners: Array<{ event: string; handler: (event: any, data: any) => void }> = [];

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

    // Proxy event handlers (wrapped to catch errors)
    const handleProxyRequestWrapped = (_event: any, data: any) => {
      try {
        handleProxyRequest(_event, data);
      } catch (error) {
        onError?.(error);
      }
    };

    const handleProxyResponseWrapped = (_event: any, data: any) => {
      try {
        handleProxyResponse(_event, data);
      } catch (error) {
        onError?.(error);
      }
    };

    const handleProxyResponseBodyWrapped = (_event: any, data: any) => {
      try {
        handleProxyResponseBody(_event, data);
      } catch (error) {
        onError?.(error);
      }
    };

    const handleProxyRequestBodyWrapped = (_event: any, data: any) => {
      try {
        handleProxyRequestBody(_event, data);
      } catch (error) {
        onError?.(error);
      }
    };

    if (window.api?.on) {
      // CDP events
      window.api.on('cdp:request', handleRequest);
      window.api.on('cdp:response', handleResponse);
      window.api.on('cdp:response-body', handleResponseBody);
      window.api.on('cdp:script-unpacked', handleScriptUnpackedEvent);
      window.api.on('cdp:script-source', handleScriptSourceEvent);
      window.api.on('cdp:error', handleError);

      // Proxy events
      window.api.on('proxy:request', handleProxyRequestWrapped);
      window.api.on('proxy:response', handleProxyResponseWrapped);
      window.api.on('proxy:response-body', handleProxyResponseBodyWrapped);
      window.api.on('proxy:request-body', handleProxyRequestBodyWrapped);

      listeners.push(
        { event: 'cdp:request', handler: handleRequest },
        { event: 'cdp:response', handler: handleResponse },
        { event: 'cdp:response-body', handler: handleResponseBody },
        { event: 'cdp:script-unpacked', handler: handleScriptUnpackedEvent },
        { event: 'cdp:script-source', handler: handleScriptSourceEvent },
        { event: 'cdp:error', handler: handleError },
        { event: 'proxy:request', handler: handleProxyRequestWrapped },
        { event: 'proxy:response', handler: handleProxyResponseWrapped },
        { event: 'proxy:response-body', handler: handleProxyResponseBodyWrapped },
        { event: 'proxy:request-body', handler: handleProxyRequestBodyWrapped },
      );
    }

    return () => {
      // Clean up all registered listeners using off()
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
  ]);

  return {
    requests,
    addRequest,
    updateRequest,
    clearRequests,
    requestMap: requestMapRef.current,
    unpackedScripts: unpackedScriptsRef.current,
  };
}

export default useNetworkEvents;