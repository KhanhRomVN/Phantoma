/**
 * Gom request/update từ emulate server thành batch, flush 1 lần mỗi
 * FLUSH_INTERVAL_MS vào networkStore (1 lần set thay vì 1 lần/request).
 * Thay thế useNetworkWorker + network.worker.ts (không còn xử lý
 * lưu trữ/filter ở background thread vì bắt gói đã nằm ở emulate/src).
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useNetworkStore } from '../stores/network.store';
import { NetworkRequest } from '@renderer/modules/Emulate/shared/types/network.types';

const FLUSH_INTERVAL_MS = 100;

interface UseNetworkBufferOptions {
  targetId?: string;
  onRequestsChange?: (requests: NetworkRequest[]) => void;
}

export function useNetworkBuffer(options: UseNetworkBufferOptions = {}) {
  const { targetId, onRequestsChange } = options;

  const pendingAddsRef = useRef<Map<string, NetworkRequest>>(new Map());
  const pendingUpdatesRef = useRef<Map<string, Partial<NetworkRequest>>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onRequestsChangeRef = useRef(onRequestsChange);
  const isFirstMountRef = useRef(true);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    onRequestsChangeRef.current = onRequestsChange;
  }, [onRequestsChange]);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const adds = Array.from(pendingAddsRef.current.values()).reverse();
    const updates = Array.from(pendingUpdatesRef.current, ([id, u]) => ({ id, updates: u }));
    pendingAddsRef.current = new Map();
    pendingUpdatesRef.current = new Map();
    if (adds.length === 0 && updates.length === 0) return;

    const store = useNetworkStore.getState();
    if (adds.length > 0) store.addRequests(adds);
    if (updates.length > 0) store.updateRequests(updates);

    const current = useNetworkStore.getState().requests;
    useNetworkStore.getState().setWorkerCounts(current.length, null);
    setTotalCount(current.length);
    onRequestsChangeRef.current?.(current);
  }, []);

  const schedule = useCallback(() => {
    if (!timerRef.current) timerRef.current = setTimeout(flush, FLUSH_INTERVAL_MS);
  }, [flush]);

  useEffect(() => () => flush(), [flush]);

  useEffect(() => {
    if (!targetId) return;
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    pendingAddsRef.current = new Map();
    pendingUpdatesRef.current = new Map();
    useNetworkStore.getState().clearAssets();
    useNetworkStore.getState().clearRequests();
    setTotalCount(0);
    onRequestsChangeRef.current?.([]);
  }, [targetId]);

  const addRequest = useCallback(
    (request: Partial<NetworkRequest>) => {
      const networkReq: NetworkRequest = {
        id: request.id || 'req-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9),
        method: request.method || 'GET',
        url: request.url || '',
        protocol: request.protocol || 'http',
        host: request.host || '',
        path: request.path || '/',
        status: request.status ?? 0,
        type: request.type || 'other',
        size: typeof request.size === 'string' ? request.size : String(request.size || '0 B'),
        time: typeof request.time === 'string' ? request.time : String(request.time || '0ms'),
        timestamp: typeof request.timestamp === 'number' ? request.timestamp : Date.now(),
        requestHeaders: request.requestHeaders || {},
        responseHeaders: request.responseHeaders || {},
        requestBody:
          typeof request.requestBody === 'string'
            ? request.requestBody
            : JSON.stringify(request.requestBody || ''),
        responseBody:
          typeof request.responseBody === 'string'
            ? request.responseBody
            : JSON.stringify(request.responseBody || ''),
        initiator: request.initiator,
        securityIssues: request.securityIssues,
        requestCookies: request.requestCookies,
        responseCookies: request.responseCookies,
        securityDetails: request.securityDetails,
        timing: request.timing,
        serverIPAddress: request.serverIPAddress,
        connection: request.connection,
        isIntercepted: request.isIntercepted,
        analysis: request.analysis,
      };
      if (!pendingAddsRef.current.has(networkReq.id)) {
        pendingAddsRef.current.set(networkReq.id, networkReq);
      }
      schedule();
    },
    [schedule],
  );

  const updateRequest = useCallback(
    (id: string, updates: Partial<NetworkRequest>) => {
      const pendingAdd = pendingAddsRef.current.get(id);
      if (pendingAdd) {
        pendingAddsRef.current.set(id, { ...pendingAdd, ...updates });
      } else {
        pendingUpdatesRef.current.set(id, { ...pendingUpdatesRef.current.get(id), ...updates });
      }
      schedule();
    },
    [schedule],
  );

  const clearRequests = useCallback(() => {
    pendingAddsRef.current = new Map();
    pendingUpdatesRef.current = new Map();
    useNetworkStore.getState().clearRequests();
    setTotalCount(0);
    onRequestsChangeRef.current?.([]);
  }, []);

  // Store chỉ giữ window maxMemory, không còn nguồn dữ liệu phía sau để load thêm
  const loadMore = useCallback((_offset: number, _limit?: number) => {}, []);

  return {
    addRequest,
    updateRequest,
    clearRequests,
    loadMore,
    hasMore: false,
    loading: false,
    totalCount,
  };
}
