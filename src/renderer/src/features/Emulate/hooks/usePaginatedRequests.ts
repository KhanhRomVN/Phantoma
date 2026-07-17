import { useState, useEffect, useCallback, useRef } from 'react';
import { requestStorage, StoredRequest } from '../../../services/IndexedDBStorage';
import { NetworkRequest } from '../types/inspector';

interface UsePaginatedRequestsOptions {
  targetId: string;
  limit?: number;
  maxMemory?: number;
  onRequestsChange?: (requests: NetworkRequest[]) => void;
}

export function usePaginatedRequests({
  targetId,
  limit = 100,
  maxMemory = 1000,
  onRequestsChange,
}: UsePaginatedRequestsOptions) {
  const [requests, setRequests] = useState<NetworkRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const offsetRef = useRef(0);
  const isInitialLoadRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const onRequestsChangeRef = useRef(onRequestsChange);
  const pendingRequestsRef = useRef<StoredRequest[]>([]);

  useEffect(() => {
    onRequestsChangeRef.current = onRequestsChange;
  }, [onRequestsChange]);

  const toNetworkRequest = (stored: StoredRequest): NetworkRequest => ({
    id: stored.id,
    method: stored.method,
    url: stored.url,
    protocol: stored.protocol,
    host: stored.host,
    path: stored.path,
    status: stored.status,
    type: stored.type,
    size: stored.size,
    time: stored.time,
    timestamp: stored.timestamp,
    requestHeaders: stored.requestHeaders,
    responseHeaders: stored.responseHeaders,
    requestBody: stored.requestBody,
    responseBody: stored.responseBody,
    initiator: stored.initiator,
    securityIssues: stored.securityIssues,
    requestCookies: stored.requestCookies,
    responseCookies: stored.responseCookies,
  });

  const loadInitial = useCallback(async () => {
    if (!targetId) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    offsetRef.current = 0;

    try {
      const count = await requestStorage.getRequestsCount(targetId);
      setTotalCount(count);

      const stored = await requestStorage.getRequests(targetId, Math.min(limit, maxMemory), 0);
      const mapped = stored.map(toNetworkRequest);
      setRequests(mapped);
      setHasMore(stored.length < count && stored.length === limit);
      offsetRef.current = stored.length;
      onRequestsChangeRef.current?.(mapped);
    } catch (error) {
      console.error('[usePaginatedRequests] Failed to load initial:', error);
    } finally {
      setLoading(false);
      isInitialLoadRef.current = false;
    }
  }, [targetId, limit, maxMemory]);

  const loadMore = useCallback(async () => {
    if (!targetId || loading || !hasMore) return;
    if (offsetRef.current >= maxMemory) {
      setHasMore(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);

    try {
      const remaining = maxMemory - offsetRef.current;
      const take = Math.min(limit, remaining);
      const stored = await requestStorage.getRequests(targetId, take, offsetRef.current);

      if (stored.length === 0) {
        setHasMore(false);
        setLoading(false);
        return;
      }

      const mapped = stored.map(toNetworkRequest);
      setRequests((prev) => {
        const existingIds = new Set(prev.map((r) => r.id));
        const newRequests = mapped.filter((r) => !existingIds.has(r.id));
        const merged = [...prev, ...newRequests];
        onRequestsChangeRef.current?.(merged);
        return merged;
      });

      offsetRef.current += stored.length;
      const total = await requestStorage.getRequestsCount(targetId);
      setTotalCount(total);
      setHasMore(offsetRef.current < total && offsetRef.current < maxMemory);
    } catch (error) {
      console.error('[usePaginatedRequests] Failed to load more:', error);
    } finally {
      setLoading(false);
    }
  }, [targetId, loading, hasMore, limit, maxMemory]);

  const addRequest = useCallback(
    async (request: Partial<NetworkRequest>) => {
      const stored: StoredRequest = {
        id: request.id || `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        targetId: targetId || '',
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
        responseBodyCompressed: false,
        initiator: request.initiator,
        securityIssues: request.securityIssues,
        requestCookies: request.requestCookies,
        responseCookies: request.responseCookies,
      };

      if (!targetId) {
        console.warn('[usePaginatedRequests] No targetId, buffering request:', stored.id);
        console.debug('[DEBUG] Buffering request:', stored.id);
        pendingRequestsRef.current.push(stored);
        // Still display in memory
        const networkReq = toNetworkRequest(stored);
        setRequests((prev) => {
          if (prev.some((r) => r.id === networkReq.id)) return prev;
          const newRequests = [networkReq, ...prev];
          if (newRequests.length > maxMemory) {
            const sliced = newRequests.slice(0, maxMemory);
            onRequestsChangeRef.current?.(sliced);
            return sliced;
          }
          onRequestsChangeRef.current?.(newRequests);
          return newRequests;
        });
        return;
      }

      // Normal flow with targetId
      stored.targetId = targetId;
      requestStorage.saveRequest(targetId, stored).catch(console.error);

      setRequests((prev) => {
        if (prev.some((r) => r.id === stored.id)) {
          return prev;
        }
        const networkReq = toNetworkRequest(stored);
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
    [targetId, maxMemory],
  );

  const updateRequest = useCallback(
    async (id: string, updates: Partial<NetworkRequest>) => {
      if (!targetId) return;

      setRequests((prev) => {
        const updated = prev.map((r) => {
          if (r.id === id) {
            const merged = { ...r, ...updates };
            const stored: StoredRequest = {
              id: merged.id,
              targetId,
              method: merged.method,
              url: merged.url,
              protocol: merged.protocol,
              host: merged.host,
              path: merged.path,
              status: merged.status || 0,
              type: merged.type || 'other',
              size: typeof merged.size === 'string' ? merged.size : String(merged.size || '0 B'),
              time: typeof merged.time === 'string' ? merged.time : String(merged.time || '0ms'),
              timestamp: typeof merged.timestamp === 'number' ? merged.timestamp : Date.now(),
              requestHeaders: merged.requestHeaders || {},
              responseHeaders: merged.responseHeaders || {},
              requestBody:
                typeof merged.requestBody === 'string'
                  ? merged.requestBody
                  : JSON.stringify(merged.requestBody || ''),
              responseBody:
                typeof merged.responseBody === 'string'
                  ? merged.responseBody
                  : JSON.stringify(merged.responseBody || ''),
              responseBodyCompressed: false,
              initiator: merged.initiator,
              securityIssues: merged.securityIssues,
              requestCookies: merged.requestCookies,
              responseCookies: merged.responseCookies,
            };
            requestStorage.saveRequest(targetId, stored).catch(console.error);
            return merged;
          }
          return r;
        });
        onRequestsChangeRef.current?.(updated);
        return updated;
      });
    },
    [targetId],
  );

  const clearRequests = useCallback(async () => {
    if (!targetId) return;
    await requestStorage.deleteTarget(targetId);
    setRequests([]);
    setTotalCount(0);
    setHasMore(false);
    offsetRef.current = 0;
    onRequestsChangeRef.current?.([]);
  }, [targetId]);

  const reload = useCallback(async () => {
    await loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (targetId) {
      // Flush pending requests when targetId becomes available
      if (pendingRequestsRef.current.length > 0) {
        console.debug(`[DEBUG] Flushing ${pendingRequestsRef.current.length} pending requests to target ${targetId}`);
        const pending = pendingRequestsRef.current;
        pendingRequestsRef.current = [];
        pending.forEach((stored) => {
          const withTarget = { ...stored, targetId };
          requestStorage.saveRequest(targetId, withTarget).catch(console.error);
        });
        setTotalCount((prev) => prev + pending.length);
      }
      isInitialLoadRef.current = true;
      loadInitial();
    } else {
      setRequests([]);
      setTotalCount(0);
      setHasMore(false);
      offsetRef.current = 0;
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [targetId, loadInitial]);

  return {
    requests,
    loading,
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