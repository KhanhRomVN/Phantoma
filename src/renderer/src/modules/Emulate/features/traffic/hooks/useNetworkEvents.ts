/**
 * Hook nhận network event từ emulate server qua WebSocket (wsBus).
 * Server đã chuẩn hóa request/response/body thành 2 kênh:
 *   - net:request : NetworkRequest hoàn chỉnh
 *   - net:update  : { id, updates }
 * Hook chỉ đưa data vào buffer → networkStore, không parse gì thêm.
 */

import { useEffect, useRef, useCallback } from 'react';

import { useNetworkBuffer } from './useNetworkBuffer';

import { wsBus } from '@renderer/modules/Emulate/shared/api/runtime-ws-bridge';

import { useWebSocketStore } from '../stores/websocket.store';

import { NetworkRequest } from '@renderer/modules/Emulate/shared/types/network.types';
import { logger } from '@renderer/modules/Emulate/shared/utils/logger.util';

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
  onScriptUnpacked?: (data: CdpScriptUnpackedData) => void;
  onScriptSource?: (data: CdpScriptSourceData) => void;
  onError?: (error: any) => void;
  onRequestsChange?: (requests: NetworkRequest[]) => void;
}

export function useNetworkEvents(options: UseNetworkEventsOptions = {}) {
  const { targetId = '', onRequest, onScriptUnpacked, onScriptSource, onError, onRequestsChange } =
    options;

  const { addRequest, updateRequest, clearRequests, loadMore, hasMore, loading, totalCount } =
    useNetworkBuffer({ targetId, onRequestsChange });

  const unpackedScriptsRef = useRef<Map<string, CdpScriptUnpackedData>>(new Map());
  const timestampMapRef = useRef<Map<string, number>>(new Map());
  const onRequestRef = useRef(onRequest);
  const onErrorRef = useRef(onError);
  const onScriptUnpackedRef = useRef(onScriptUnpacked);
  const onScriptSourceRef = useRef(onScriptSource);
  onRequestRef.current = onRequest;
  onErrorRef.current = onError;
  onScriptUnpackedRef.current = onScriptUnpacked;
  onScriptSourceRef.current = onScriptSource;

  useEffect(() => {
    unpackedScriptsRef.current = new Map();
    timestampMapRef.current = new Map();
  }, [targetId]);

  const addAndNotify = useCallback(
    (request: NetworkRequest) => {
      timestampMapRef.current.set(request.id, request.timestamp);
      addRequest(request);
      onRequestRef.current?.(request);
    },
    [addRequest],
  );

  const handleEbpfHttpsEvent = useCallback(
    (data: any) => {
      if (!data?.id) return;
      if (data.type === 'request') {
        addAndNotify({
          id: data.id,
          url: data.url || '',
          protocol: 'https',
          host: data.headers?.['Host'] || '',
          path: data.url || '',
          method: data.method || 'GET',
          status: 0,
          requestHeaders: { ...(data.headers || {}), 'X-Capture-Method': 'eBPF' },
          responseHeaders: {},
          requestBody: data.body || '',
          responseBody: '',
          type: 'xhr',
          size: '0 B',
          time: '0ms',
          timestamp: data.timestamp || Date.now(),
        });
      } else if (data.type === 'response') {
        const start = timestampMapRef.current.get(data.id);
        timestampMapRef.current.delete(data.id);
        updateRequest(data.id, {
          status: data.statusCode || 200,
          responseHeaders: data.headers || {},
          responseBody: data.body || '',
          time: start ? `${Date.now() - start}ms` : '0ms',
        });
      }
    },
    [addAndNotify, updateRequest],
  );

  const handlePacketCaptured = useCallback(
    (data: any) => {
      if (!data?.id) return;
      addAndNotify({
        id: data.id,
        url: `${data.protocol.toLowerCase()}://${data.destination.host}:${data.destination.port}`,
        protocol: data.protocol.toLowerCase(),
        host: data.destination.host,
        path: '/',
        method: 'PACKET',
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
      });
    },
    [addAndNotify],
  );

  const handleAppDebugLog = useCallback(
    (data: any) => {
      if (!data?.id) return;
      addAndNotify({
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
      });
    },
    [addAndNotify],
  );

  const handleWsConnect = useCallback((data: any) => {
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
  }, []);

  const handleWsMessage = useCallback((data: any) => {
    if (!data?.connectionId || !data?.id) return;
    useWebSocketStore.getState().addFrame(data.connectionId, {
      id: data.id,
      connectionId: data.connectionId,
      direction: data.direction === 'client' ? 'send' : 'receive',
      opcode: data.dataType === 'binary' ? 'binary' : 'text',
      payload: data.data || '',
      size: data.size || 0,
      timestamp: data.timestamp || Date.now(),
    });
  }, []);

  const handleWsUpdate = useCallback((data: any) => {
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
  }, []);

  const handleWsClose = useCallback((data: any) => {
    if (!data?.id) return;
    useWebSocketStore.getState().updateConnection(data.id, {
      status: 'closed',
      closedAt: data.endTime || Date.now(),
    });
  }, []);

  useEffect(() => {
    if (!targetId) return;

    const unsubscribes: (() => void)[] = [];
    const sub = (channel: string, handler: (data: any) => void) => {
      unsubscribes.push(
        wsBus.on(channel, (_e, d) => {
          try {
            handler(d);
          } catch (err) {
            logger.error(`[useNetworkEvents] ${channel} handler failed`, err);
            onErrorRef.current?.(err);
          }
        }),
      );
    };

    // Đã chuẩn hóa ở emulate/src
    sub('net:request', (d) => addAndNotify(d as NetworkRequest));
    sub('net:update', (d) => updateRequest(d.id, d.updates));

    sub('cdp:script-unpacked', (d: CdpScriptUnpackedData) => {
      unpackedScriptsRef.current.set(d.requestId, d);
      onScriptUnpackedRef.current?.(d);
    });
    sub('cdp:script-source', (d: CdpScriptSourceData) => onScriptSourceRef.current?.(d));
    sub('cdp:error', (d) => onErrorRef.current?.(d));

    sub('ws:connect', handleWsConnect);
    sub('ws:message', handleWsMessage);
    sub('ws:update', handleWsUpdate);
    sub('ws:close', handleWsClose);

    sub('ebpf:https-event', handleEbpfHttpsEvent);
    sub('packet:captured', handlePacketCaptured);
    sub('app-debug:log', handleAppDebugLog);

    return () => unsubscribes.forEach((fn) => fn());
  }, [
    targetId,
    addAndNotify,
    updateRequest,
    handleWsConnect,
    handleWsMessage,
    handleWsUpdate,
    handleWsClose,
    handleEbpfHttpsEvent,
    handlePacketCaptured,
    handleAppDebugLog,
  ]);

  return {
    addRequest,
    updateRequest,
    clearRequests,
    loadMore,
    hasMore,
    loading,
    totalCount,
    unpackedScripts: unpackedScriptsRef.current,
  };
}
