import { useState, useEffect, useCallback, useRef } from 'react';
import { NetworkRequest } from '../types/inspector';

interface UsePaginatedRequestsOptions {
  targetId: string;
  limit?: number;
  maxMemory?: number;
  initialRequests?: NetworkRequest[];
  onRequestsChange?: (requests: NetworkRequest[]) => void;
}

export function usePaginatedRequests({
  targetId,
  limit: _limit = 100,
  maxMemory = 1000,
  initialRequests,
  onRequestsChange,
}: UsePaginatedRequestsOptions) {
  const [requests, setRequests] = useState<NetworkRequest[]>(initialRequests || []);
  const [totalCount, setTotalCount] = useState(initialRequests ? initialRequests.length : 0);
  const onRequestsChangeRef = useRef(onRequestsChange);
  const prevTargetIdRef = useRef(targetId);

  useEffect(() => {
    onRequestsChangeRef.current = onRequestsChange;
  }, [onRequestsChange]);

  // Reset requests when targetId changes (in-memory only, no IndexedDB)
  useEffect(() => {
    if (prevTargetIdRef.current !== targetId) {
      prevTargetIdRef.current = targetId;
      setRequests([]);
      setTotalCount(0);
      onRequestsChangeRef.current?.([]);
    }
  }, [targetId]);

  const addRequest = useCallback(
    (request: Partial<NetworkRequest>) => {
      const networkReq: NetworkRequest = {
        id: (request as any).id || 'req-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9),
        method: (request as any).method || 'GET',
        url: (request as any).url || '',
        protocol: (request as any).protocol || 'http',
        host: (request as any).host || '',
        path: (request as any).path || '/',
        status: (request as any).status || 0,
        type: (request as any).type || 'other',
        size: (request as any).size || '0 B',
        time: (request as any).time || '0ms',
        timestamp: (request as any).timestamp || Date.now(),
        requestHeaders: (request as any).requestHeaders || {},
        responseHeaders: (request as any).responseHeaders || {},
        requestBody: (request as any).requestBody || '',
        responseBody: (request as any).responseBody || '',
        initiator: (request as any).initiator,
        securityIssues: (request as any).securityIssues,
        requestCookies: (request as any).requestCookies,
        responseCookies: (request as any).responseCookies,
      };

      setRequests((prev) => {
        if (prev.some((r) => (r as any).id === (networkReq as any).id)) {
          return prev;
        }
        const newRequests = [networkReq, ...prev];
        if (newRequests.length > maxMemory) {
          const sliced = newRequests.slice(0, maxMemory);
          onRequestsChangeRef.current?.(sliced);
          return sliced;
        }
        onRequestsChangeRef.current?.(newRequests);
        return newRequests;
      });

      setTotalCount((prev) => prev + 1);
    },
    [maxMemory],
  );

  const updateRequest = useCallback(
    (id: string, updates: Partial<NetworkRequest>) => {
      setRequests((prev) => {
        const updated = prev.map((r) => {
          if ((r as any).id === id) {
            return { ...r, ...updates } as NetworkRequest;
          }
          return r;
        });
        onRequestsChangeRef.current?.(updated);
        return updated;
      });
    },
    [],
  );

  const clearRequests = useCallback(() => {
    setRequests([]);
    setTotalCount(0);
    onRequestsChangeRef.current?.([]);
  }, []);

  const loadMore = useCallback(() => {
    // No-op: all requests are in memory, no pagination from DB needed
  }, []);

  const reload = useCallback(() => {
    // No-op: requests managed entirely in memory
  }, []);

  return {
    requests,
    loading: false,
    hasMore: false,
    totalCount,
    addRequest,
    updateRequest,
    clearRequests,
    loadMore,
    reload,
  };
}

export default usePaginatedRequests;