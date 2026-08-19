import { useState, useEffect, useCallback, useRef } from 'react';
import { NetworkRequest } from '../../types/inspector';
import { useNetworkStore } from '../../stores/networkStore';

interface UsePaginatedRequestsOptions {
  targetId: string;
  limit?: number;
  maxMemory?: number;
  onRequestsChange?: (requests: NetworkRequest[]) => void;
}

/**
 * In-memory paginated requests hook (NO IndexedDB persistence)
 * Requests are stored only in React state and cleared on app refresh
 */
export function usePaginatedRequests({
  targetId,
  maxMemory = 1000,
  onRequestsChange,
}: UsePaginatedRequestsOptions) {
  const [requests, setRequests] = useState<NetworkRequest[]>(
    () => useNetworkStore.getState().requests as NetworkRequest[],
  );
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const onRequestsChangeRef = useRef(onRequestsChange);
  const targetIdRef = useRef(targetId);
  const isFirstMountRef = useRef(true);

  useEffect(() => {
    onRequestsChangeRef.current = onRequestsChange;
  }, [onRequestsChange]);

  useEffect(() => {
    targetIdRef.current = targetId;
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

      setRequests((prev) => {
        if (prev.some((r) => r.id === networkReq.id)) return prev;
        const newRequests = [networkReq, ...prev];
        if (newRequests.length > maxMemory) {
          const sliced = newRequests.slice(0, maxMemory);
          onRequestsChangeRef.current?.(sliced);
          setTotalCount(sliced.length);
          return sliced;
        }
        onRequestsChangeRef.current?.(newRequests);
        setTotalCount(newRequests.length);
        return newRequests;
      });
    },
    [maxMemory],
  );

  const updateRequest = useCallback((id: string, updates: Partial<NetworkRequest>) => {
    setRequests((prev) => {
      const updated = prev.map((r) => {
        if (r.id === id) {
          return { ...r, ...updates };
        }
        return r;
      });
      onRequestsChangeRef.current?.(updated);
      return updated;
    });
  }, []);

  const clearRequests = useCallback(() => {
    setRequests([]);
    setTotalCount(0);
    setHasMore(false);
    onRequestsChangeRef.current?.([]);
  }, []);

  const loadMore = useCallback(() => {
    // In-memory implementation doesn't need pagination
    // All requests are already loaded in state
    setHasMore(false);
  }, []);

  const reload = useCallback(() => {
    // In-memory implementation - no reload needed
    // Requests are already in state
  }, []);

  // Clear requests when targetId changes
  useEffect(() => {
    if (targetId) {
      if (isFirstMountRef.current) {
        isFirstMountRef.current = false;
        return; // Bỏ qua clear lần mount đầu tiên — giữ requests khôi phục từ store
      }
      setRequests([]);
      setTotalCount(0);
      setHasMore(false);
      onRequestsChangeRef.current?.([]);
    }
  }, [targetId]);

  return {
    requests,
    loading: false, // Always false for in-memory
    hasMore,
    totalCount,
    addRequest,
    updateRequest,
    clearRequests,
    loadMore,
    reload,
  };
}

export default usePaginatedRequests;
