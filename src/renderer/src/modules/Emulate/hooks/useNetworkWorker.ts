/**
 * ------------------------------------------------------------------
 * useNetworkWorker
 * ------------------------------------------------------------------
 * Hook giao tiếp với Network Worker.
 * Cung cấp API tương đương usePaginatedRequests nhưng delegate toàn
 * bộ logic xử lý dữ liệu sang Worker (background thread).
 *
 * Các chức năng chính:
 * - Khởi tạo và quản lý vòng đời Worker
 * - addRequest / updateRequest / clearRequests
 * - filter (search + config)
 * - loadMore (offset-based infinite scroll)
 * - Cập nhật networkStore với window hiện tại (~100 items)
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useEffect, useRef, useCallback, useState } from 'react';

// ── Stores ──
import { useNetworkStore } from '../stores/networkStore';

// ── Types ──
import { NetworkRequest } from '../types/inspector';
import { InspectorFilter } from '../types/filter.types';

// ─── Types ──────────────────────────────────────────────────────────────
interface UseNetworkWorkerOptions {
  targetId?: string;
  onRequestsChange?: (requests: NetworkRequest[]) => void;
}

// ─── Hook ───────────────────────────────────────────────────────────────
export function useNetworkWorker(options: UseNetworkWorkerOptions = {}) {
  const { targetId, onRequestsChange } = options;

  const workerRef = useRef<Worker | null>(null);
  const isReadyRef = useRef(false);
  const pendingMessagesRef = useRef<Array<{ type: string; payload?: any }>>([]);
  const onRequestsChangeRef = useRef(onRequestsChange);
  const isFirstMountRef = useRef(true);

  const [totalCount, setTotalCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState<number | null>(null);
  const [isFiltered, setIsFiltered] = useState(false);

  useEffect(() => {
    onRequestsChangeRef.current = onRequestsChange;
  }, [onRequestsChange]);

  const postToWorker = useCallback((type: string, payload?: any) => {
    if (!workerRef.current) return;
    if (!isReadyRef.current) {
      pendingMessagesRef.current.push({ type, payload });
      return;
    }
    workerRef.current.postMessage({ type, payload });
  }, []);

  // Khởi tạo Worker
  useEffect(() => {
    const worker = new Worker(new URL('../workers/network.worker.ts', import.meta.url), {
      type: 'module',
    });

    workerRef.current = worker;

    worker.onmessage = (e) => {
      const { type, payload } = e.data;

      switch (type) {
        case 'WORKER_READY': {
          isReadyRef.current = true;
          const pending = pendingMessagesRef.current.splice(0);
          for (const msg of pending) {
            worker.postMessage({ type: msg.type, payload: msg.payload });
          }
          break;
        }

        // REQUEST_ADDED: Worker gửi khi có request mới
        // → prepend vào store (không replace toàn bộ)
        case 'REQUEST_ADDED': {
          const { request, totalCount: tc, filteredCount: fc, matchesFilter } = payload;

          // Cập nhật tổng đếm trong store (FooterBar đọc từ đây)
          useNetworkStore.getState().setWorkerCounts(tc, fc ?? null);
          setTotalCount(tc);
          setFilteredCount(fc ?? null);

          // Chỉ thêm vào store nếu request match filter hiện tại (hoặc không filter)
          if (matchesFilter) {
            useNetworkStore.getState().prependRequest(request);
          }
          break;
        }

        // REQUESTS_UPDATED: Worker gửi khi có thay đổi lớn (legacy, vẫn giữ)
        case 'REQUESTS_UPDATED': {
          useNetworkStore.getState().setWindow(payload.window);
          useNetworkStore
            .getState()
            .setWorkerCounts(payload.totalCount, payload.filteredCount ?? null);
          setTotalCount(payload.totalCount);
          setFilteredCount(payload.filteredCount ?? null);
          onRequestsChangeRef.current?.(payload.window);
          break;
        }

        case 'REQUEST_UPDATED': {
          useNetworkStore.getState().updateRequests([{ id: payload.id, updates: payload.updates }]);
          break;
        }

        case 'FILTER_RESULT': {
          useNetworkStore.getState().setWindow(payload.window);
          useNetworkStore
            .getState()
            .setWorkerCounts(
              payload.totalCount ?? payload.totalMatched,
              payload.isFiltered ? payload.totalMatched : null,
            );
          setTotalCount(payload.totalMatched);
          setFilteredCount(payload.isFiltered ? payload.totalMatched : null);
          setIsFiltered(payload.isFiltered);
          onRequestsChangeRef.current?.(payload.window);
          break;
        }

        case 'WINDOW_UPDATED': {
          // Append window vào state hiện tại (infinite scroll)
          const current = useNetworkStore.getState().requests;
          const incoming: NetworkRequest[] = payload.window;
          const currentIds = new Set(current.map((r) => r.id));
          const newItems = incoming.filter((r) => !currentIds.has(r.id));
          if (newItems.length > 0) {
            useNetworkStore.getState().appendWindow(newItems);
            onRequestsChangeRef.current?.(useNetworkStore.getState().requests);
          }
          break;
        }

        case 'REQUESTS_CLEARED': {
          useNetworkStore.getState().clearRequests();
          setTotalCount(0);
          setFilteredCount(null);
          setIsFiltered(false);
          onRequestsChangeRef.current?.([]);
          break;
        }

        default:
          break;
      }
    };

    worker.onerror = (err) => {
      console.error('[useNetworkWorker] Worker error:', err);
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
      isReadyRef.current = false;
      pendingMessagesRef.current = [];
    };
  }, []);

  // Clear khi targetId thay đổi (bỏ qua lần mount đầu)
  useEffect(() => {
    if (!targetId) return;
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    postToWorker('CLEAR');
  }, [targetId, postToWorker]);

  // ─── API ──────────────────────────────────────────────────────────
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
      postToWorker('ADD_REQUEST', networkReq);
    },
    [postToWorker],
  );

  const updateRequest = useCallback(
    (id: string, updates: Partial<NetworkRequest>) => {
      postToWorker('UPDATE_REQUEST', { id, updates });
    },
    [postToWorker],
  );

  const clearRequests = useCallback(() => {
    postToWorker('CLEAR');
  }, [postToWorker]);

  const filter = useCallback(
    (searchTerm: string, config?: InspectorFilter) => {
      postToWorker('FILTER', { searchTerm, config });
    },
    [postToWorker],
  );

  const loadMore = useCallback(
    (offset: number, limit: number = 100) => {
      postToWorker('LOAD_MORE', { offset, limit });
    },
    [postToWorker],
  );

  return {
    addRequest,
    updateRequest,
    clearRequests,
    filter,
    loadMore,
    // Compat với usePaginatedRequests API
    hasMore: false,
    loading: false,
    reload: () => {},
    totalCount,
    filteredCount,
    isFiltered,
  };
}

export default useNetworkWorker;
