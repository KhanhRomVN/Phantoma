/**
 * ------------------------------------------------------------------
 * usePaginatedRequests
 * ------------------------------------------------------------------
 * Hook phân trang in-memory cho network requests, dữ liệu được
 * lưu trong networkStore (Zustand). Gom các event vào buffer và
 * flush sau 120ms để giảm số lần set state (batch update).
 *
 * Các chức năng chính:
 * - Thêm/cập nhật/xóa requests trong store
 * - Buffer adds/updates và flush batch sau 120ms
 * - Debounce callback onRequestsChange (150ms)
 * - Giới hạn số lượng requests trong memory
 * - Tự động clear requests khi targetId thay đổi
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useEffect, useCallback, useRef } from 'react';

// ── Stores ──
import { useNetworkStore } from '../stores/networkStore';

// ── Types ──
import { NetworkRequest } from '../types/inspector';

// ─── Types ──────────────────────────────────────────────────────────────
interface UsePaginatedRequestsOptions {
  targetId: string;
  limit?: number;
  maxMemory?: number;
  onRequestsChange?: (requests: NetworkRequest[]) => void;
}

interface PendingEntry {
  id?: string;
  request?: NetworkRequest;
  updates?: Partial<NetworkRequest>;
}

// ─── Hook ───────────────────────────────────────────────────────────────
export function usePaginatedRequests({
  targetId,
  maxMemory = 1000,
  onRequestsChange,
}: UsePaginatedRequestsOptions) {
  // ── Refs ──
  const onRequestsChangeRef = useRef(onRequestsChange);
  const targetIdRef = useRef(targetId);
  const isFirstMountRef = useRef(true);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestRequestsRef = useRef<NetworkRequest[]>([]);
  const pendingMapRef = useRef<Map<string, PendingEntry>>(new Map());

  // ── Effects ──
  useEffect(() => {
    onRequestsChangeRef.current = onRequestsChange;
  }, [onRequestsChange]);

  useEffect(() => {
    targetIdRef.current = targetId;
  }, [targetId]);

  useEffect(() => {
    if (maxMemory) {
      useNetworkStore.setState({ maxMemory });
    }
  }, [maxMemory]);

  // ── Callbacks ──
  const scheduleOnRequestsChange = useCallback((newRequests: NetworkRequest[]) => {
    latestRequestsRef.current = newRequests;
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => {
      onRequestsChangeRef.current?.(latestRequestsRef.current);
      debounceTimeoutRef.current = null;
    }, 150);
  }, []);

  const flush = useCallback(() => {
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = null;
    }

    const entries = Array.from(pendingMapRef.current.entries());
    if (entries.length === 0) return;
    pendingMapRef.current.clear();

    const adds: NetworkRequest[] = [];
    const updates: Array<{ id: string; updates: Partial<NetworkRequest> }> = [];

    for (const [, entry] of entries) {
      if (entry.request) {
        adds.push(entry.request);
      }
      if (entry.updates) {
        updates.push({ id: entry.request?.id || entry.id || '', updates: entry.updates });
      }
    }

    const store = useNetworkStore.getState();
    if (adds.length > 0) store.addRequests(adds);
    if (updates.length > 0) store.updateRequests(updates);

    scheduleOnRequestsChange(useNetworkStore.getState().requests);
  }, [scheduleOnRequestsChange]);

  const scheduleFlush = useCallback(() => {
    if (flushTimeoutRef.current) return;
    flushTimeoutRef.current = setTimeout(() => {
      flushTimeoutRef.current = null;
      flush();
    }, 120);
  }, [flush]);

  const addRequest = useCallback(
    (request: Partial<NetworkRequest>) => {
      const networkReq: NetworkRequest = {
        id: request.id || 'req-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9),
        method: request.method || 'GET',
        url: request.url || '',
        protocol: request.protocol || 'http',
        host: request.host || '',
        path: request.path || '/',
        status: request.status || 0,
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
      };

      const existing = pendingMapRef.current.get(networkReq.id);
      if (existing) {
        existing.request = networkReq;
      } else {
        pendingMapRef.current.set(networkReq.id, { request: networkReq });
      }
      scheduleFlush();
    },
    [scheduleFlush],
  );

  const updateRequest = useCallback(
    (id: string, updates: Partial<NetworkRequest>) => {
      const existing = pendingMapRef.current.get(id);
      if (existing) {
        existing.updates = { ...existing.updates, ...updates };
      } else {
        pendingMapRef.current.set(id, { id, updates });
      }
      scheduleFlush();
    },
    [scheduleFlush],
  );

  const clearRequests = useCallback(() => {
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = null;
    }
    pendingMapRef.current.clear();
    useNetworkStore.getState().clearRequests();
    onRequestsChangeRef.current?.([]);
  }, []);

  const loadMore = useCallback(() => {
    // In-memory implementation doesn't need pagination
  }, []);

  const reload = useCallback(() => {
    // In-memory implementation - no reload needed
  }, []);

  // ── Effects ──
  useEffect(() => {
    if (targetId) {
      if (isFirstMountRef.current) {
        isFirstMountRef.current = false;
        return; // Bỏ qua clear lần mount đầu tiên — giữ requests khôi phục từ store
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
        flushTimeoutRef.current = null;
      }
      pendingMapRef.current.clear();
      useNetworkStore.getState().clearRequests();
      onRequestsChangeRef.current?.([]);
    }
  }, [targetId]);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
        flushTimeoutRef.current = null;
      }
      pendingMapRef.current.clear();
    };
  }, []);

  return {
    requests: useNetworkStore.getState().requests,
    loading: false,
    hasMore: false,
    totalCount: useNetworkStore.getState().requests.length,
    addRequest,
    updateRequest,
    clearRequests,
    loadMore,
    reload,
  };
}

export default usePaginatedRequests;