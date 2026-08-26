import { useEffect, useCallback, useRef } from 'react';
import { NetworkRequest } from '../../types/inspector';
import { useNetworkStore } from '../../stores/networkStore';

interface UsePaginatedRequestsOptions {
  targetId: string;
  limit?: number;
  maxMemory?: number;
  onRequestsChange?: (requests: NetworkRequest[]) => void;
}

/**
 * In-memory paginated requests hook backed by networkStore.
 * Requests live in the zustand store so this hook does NOT trigger
 * React re-renders on every network event.
 */
export function usePaginatedRequests({
  targetId,
  maxMemory = 1000,
  onRequestsChange,
}: UsePaginatedRequestsOptions) {
  const onRequestsChangeRef = useRef(onRequestsChange);
  const targetIdRef = useRef(targetId);
  const isFirstMountRef = useRef(true);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestRequestsRef = useRef<NetworkRequest[]>([]);

  useEffect(() => {
    onRequestsChangeRef.current = onRequestsChange;
  }, [onRequestsChange]);

  useEffect(() => {
    targetIdRef.current = targetId;
  }, [targetId]);

  const scheduleOnRequestsChange = useCallback((newRequests: NetworkRequest[]) => {
    latestRequestsRef.current = newRequests;
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => {
      onRequestsChangeRef.current?.(latestRequestsRef.current);
      debounceTimeoutRef.current = null;
    }, 150);
  }, []);

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

      useNetworkStore.getState().addRequest(networkReq);
      const current = useNetworkStore.getState().requests;
      if (current.length > maxMemory) {
        const sliced = current.slice(0, maxMemory);
        useNetworkStore.setState({ requests: sliced });
        scheduleOnRequestsChange(sliced);
      } else {
        scheduleOnRequestsChange(current);
      }
    },
    [maxMemory, scheduleOnRequestsChange],
  );

  const updateRequest = useCallback(
    (id: string, updates: Partial<NetworkRequest>) => {
      useNetworkStore.getState().updateRequest(id, updates);
      scheduleOnRequestsChange(useNetworkStore.getState().requests);
    },
    [scheduleOnRequestsChange],
  );

  const clearRequests = useCallback(() => {
    useNetworkStore.getState().clearRequests();
    onRequestsChangeRef.current?.([]);
  }, []);

  const loadMore = useCallback(() => {
    // In-memory implementation doesn't need pagination
  }, []);

  const reload = useCallback(() => {
    // In-memory implementation - no reload needed
  }, []);

  // Clear requests when targetId changes
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
      useNetworkStore.getState().clearRequests();
      onRequestsChangeRef.current?.([]);
    }
  }, [targetId]);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
    };
  }, []);

  return {
    // Non-reactive getter — components needing reactivity must subscribe to useNetworkStore directly.
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