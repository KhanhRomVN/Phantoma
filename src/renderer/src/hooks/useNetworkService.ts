import { useEffect, useRef, useCallback } from 'react';
import { useNetworkStore, NetworkRequest, CdpScriptUnpackedData } from '../stores/networkStore';
import { useModuleStore } from '../stores/moduleStore';

// NetworkService: singleton IPC listener manager
// Runs once at app level (MainLayout), survives route changes

let isServiceStarted = false;

function buildProxyRequest(data: any): NetworkRequest {
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
    /* ignore */
  }

  let type = 'other';
  const pathLower = path.toLowerCase();
  if (pathLower.endsWith('.js')) type = 'js';
  else if (pathLower.endsWith('.css')) type = 'css';
  else if (pathLower.endsWith('.html') || pathLower.endsWith('.htm')) type = 'doc';
  else if (/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(pathLower)) type = 'img';
  else if (pathLower.endsWith('.json')) type = 'xhr';
  else if (
    data.method === 'POST' ||
    data.method === 'PUT' ||
    data.method === 'DELETE' ||
    data.method === 'PATCH'
  )
    type = 'xhr';
  else if (data.method === 'GET' && (data.url?.includes('api') || data.url?.includes('graphql')))
    type = 'xhr';

  return {
    id: data.id || 'proxy-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9),
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
}

function buildCdpRequest(data: any): NetworkRequest {
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
    /* ignore */
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

  return {
    id: data.id || 'cdp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9),
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
}

function decodeBody(body: string, isBinary: boolean): string {
  if (!isBinary || !body) return body || '';
  try {
    const decoded = atob(body);
    try {
      const utf8Decoded = decodeURIComponent(escape(decoded));
      if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(utf8Decoded)) {
        return '[Binary Data - Base64]\n' + body.substring(0, 1000) + '...';
      }
      return utf8Decoded;
    } catch {
      return '[Binary Data - Base64]\n' + body.substring(0, 1000) + '...';
    }
  } catch {
    return '[Binary Data - Unable to decode]\n' + body.substring(0, 1000) + '...';
  }
}

export function useNetworkService() {
  const addRequest = useNetworkStore((s) => s.addRequest);
  const updateRequest = useNetworkStore((s) => s.updateRequest);
  const setUnpackedScript = useNetworkStore((s) => s.setUnpackedScript);
  const requestMapRef = useRef<Map<string, NetworkRequest>>(new Map());
  const timestampMapRef = useRef<Map<string, number>>(new Map());

  const handleProxyRequest = useCallback(
    (_event: any, data: any) => {
      try {
        const req = buildProxyRequest(data);
        requestMapRef.current.set(req.id, req);
        timestampMapRef.current.set(req.id, data.timestamp || Date.now());
        addRequest(req);
      } catch (error) {
        console.error('[NetworkService] proxy:request error:', error);
      }
    },
    [addRequest],
  );

  const handleProxyResponse = useCallback(
    (_event: any, data: any) => {
      try {
        const existing = requestMapRef.current.get(data.id);
        if (existing) {
          const updated = {
            ...existing,
            status: data.statusCode || 200,
            responseHeaders: data.headers || {},
          };
          requestMapRef.current.set(data.id, updated);
          updateRequest(data.id, {
            status: data.statusCode || 200,
            responseHeaders: data.headers || {},
          });
        }
      } catch (error) {
        console.error('[NetworkService] proxy:response error:', error);
      }
    },
    [updateRequest],
  );

  const handleProxyResponseBody = useCallback(
    (_event: any, data: any) => {
      try {
        const requestTimestamp = timestampMapRef.current.get(data.id);
        let timeMs = 0;
        if (requestTimestamp) {
          timeMs = (data.timestamp || Date.now()) - requestTimestamp;
          timestampMapRef.current.delete(data.id);
        }
        const timeStr = timeMs >= 1000 ? (timeMs / 1000).toFixed(2) + 's' : timeMs + 'ms';

        let sizeBytes = 0;
        if (typeof data.size === 'string') {
          const match = data.size.match(/([\d.]+)\s*(KB|B)/);
          if (match) {
            sizeBytes = match[2] === 'KB' ? parseFloat(match[1]) * 1024 : parseFloat(match[1]);
          }
        } else if (typeof data.size === 'number') {
          sizeBytes = data.size;
        }
        const sizeStr = sizeBytes > 0 ? (sizeBytes / 1024).toFixed(1) + ' KB' : '0 B';
        const body = decodeBody(data.body || '', data.isBinary);

        updateRequest(data.id, { responseBody: body, size: sizeStr, time: timeStr });
      } catch (error) {
        console.error('[NetworkService] proxy:response-body error:', error);
      }
    },
    [updateRequest],
  );

  const handleProxyRequestBody = useCallback(
    (_event: any, data: any) => {
      try {
        const body = decodeBody(data.body || '', data.isBinary);
        updateRequest(data.id, { requestBody: body });
      } catch (error) {
        console.error('[NetworkService] proxy:request-body error:', error);
      }
    },
    [updateRequest],
  );

  const handleCdpRequest = useCallback(
    (_event: any, data: any) => {
      try {
        const req = buildCdpRequest(data);
        requestMapRef.current.set(req.id, req);
        timestampMapRef.current.set(req.id, data.timestamp || Date.now());
        addRequest(req);
      } catch (error) {
        console.error('[NetworkService] cdp:request error:', error);
      }
    },
    [addRequest],
  );

  const handleCdpResponse = useCallback(
    (_event: any, data: any) => {
      try {
        // Guard: skip if status already set (prevents infinite update loop)
        const existing = requestMapRef.current.get(data.id);
        if (existing && existing.status !== 0) return;
        updateRequest(data.id, {
          status: data.statusCode || 200,
          responseHeaders: data.headers || {},
        });
      } catch (error) {
        console.error('[NetworkService] cdp:response error:', error);
      }
    },
    [updateRequest],
  );

  const handleCdpResponseBody = useCallback(
    (_event: any, data: any) => {
      try {
        const requestTimestamp = timestampMapRef.current.get(data.id);
        let timeMs = 0;
        if (requestTimestamp) {
          timeMs = (data.timestamp || Date.now()) - requestTimestamp;
          timestampMapRef.current.delete(data.id);
        }
        const timeStr = timeMs >= 1000 ? (timeMs / 1000).toFixed(2) + 's' : timeMs + 'ms';
        const sizeStr = data.size ? (data.size / 1024).toFixed(1) + ' KB' : '0 B';
        const body = data.isUnpacked
          ? '/* UNPACKED SOURCE FROM DEBUGGER API */\n' + (data.body || '')
          : data.body || '';

        updateRequest(data.id, { responseBody: body, size: sizeStr, time: timeStr });
      } catch (error) {
        console.error('[NetworkService] cdp:response-body error:', error);
      }
    },
    [updateRequest],
  );

  const handleScriptUnpacked = useCallback(
    (_event: any, data: CdpScriptUnpackedData) => {
      setUnpackedScript(data.requestId, data);
    },
    [setUnpackedScript],
  );

  useEffect(() => {
    if (isServiceStarted) return;
    isServiceStarted = true;

    if (!window.api?.on) {
      console.warn('[NetworkService] window.api.on not available');
      return;
    }

    window.api.on('proxy:request', handleProxyRequest);
    window.api.on('proxy:response', handleProxyResponse);
    window.api.on('proxy:response-body', handleProxyResponseBody);
    window.api.on('proxy:request-body', handleProxyRequestBody);
    window.api.on('cdp:request', handleCdpRequest);
    window.api.on('cdp:response', handleCdpResponse);
    window.api.on('cdp:response-body', handleCdpResponseBody);
    window.api.on('cdp:script-unpacked', handleScriptUnpacked);

    return () => {
      // Never cleanup - listeners live for the entire app lifetime
    };
  }, []); // Empty deps - run once on mount, never cleanup
}
