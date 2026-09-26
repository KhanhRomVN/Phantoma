/**
 * ------------------------------------------------------------------
 * Network Worker
 * ------------------------------------------------------------------
 * Xử lý toàn bộ logic quản lý network requests ở background thread.
 * Không ảnh hưởng đến Main Thread (UI).
 *
 * Messages nhận vào:
 * - ADD_REQUEST    : Thêm request mới
 * - UPDATE_REQUEST : Cập nhật request theo id
 * - FILTER         : Filter/search requests
 * - LOAD_MORE      : Lấy thêm items (offset/limit)
 * - CLEAR          : Xóa toàn bộ
 *
 * Messages gửi ra:
 * - REQUESTS_UPDATED : Sau khi add request (window mới nhất)
 * - REQUEST_UPDATED  : Sau khi update single request
 * - FILTER_RESULT    : Kết quả filter
 * - WINDOW_UPDATED   : Kết quả load more
 * - REQUESTS_CLEARED : Sau khi clear
 * ------------------------------------------------------------------
 */

// ─── Types ────────────────────────────────────────────────────────────
interface NetworkRequest {
  id: string;
  method: string;
  url: string;
  protocol: string;
  host: string;
  path: string;
  status: number;
  type: string;
  size: string;
  time: string;
  timestamp: number;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody: string;
  responseBody: string;
  initiator?: string;
  securityIssues?: any[];
  requestCookies?: Record<string, string>;
  responseCookies?: Record<string, string>;
  securityDetails?: any;
  timing?: any;
  serverIPAddress?: string;
  connection?: string;
  isIntercepted?: boolean;
  analysis?: any;
}

interface InspectorFilter {
  methods: Record<string, boolean>;
  host: { whitelist: string[] };
  path: { whitelist: string[] };
  status: Record<string, boolean>;
  type: {
    xhr: boolean;
    js: boolean;
    css: boolean;
    img: boolean;
    media: boolean;
    font: boolean;
    doc: boolean;
    ws: boolean;
    wasm: boolean;
    manifest: boolean;
    other: boolean;
  };
  size: { min: string; max: string };
  time: { min: string; max: string };
}

interface WorkerMessage {
  type: string;
  payload?: any;
}

// ─── Constants ────────────────────────────────────────────────────────
const WINDOW_SIZE = 100;
const MAX_REQUESTS = 50000;

// ─── State ────────────────────────────────────────────────────────────
let requests: NetworkRequest[] = [];
let requestIndex: Map<string, number> = new Map();
// null = không filter, dùng toàn bộ requests
let filteredRequests: NetworkRequest[] | null = null;
let currentFilter: { searchTerm?: string; config?: InspectorFilter } | null = null;

// ─── Helpers ──────────────────────────────────────────────────────────
function rebuildIndex(): void {
  requestIndex.clear();
  requests.forEach((r, i) => requestIndex.set(r.id, i));
}

function getWindow(offset: number, limit: number): NetworkRequest[] {
  const source = filteredRequests !== null ? filteredRequests : requests;
  return source.slice(offset, offset + limit);
}

function sendToMain(type: string, payload: any): void {
  self.postMessage({ type, payload });
}

// ─── Request Classifier (copy từ request-classifier.util.ts) ──────────
function getRequestCategory(req: { type?: string; path?: string; protocol?: string }): string {
  const type = (req.type || '').toLowerCase();

  if (type.includes('xhr') || type.includes('fetch')) return 'xhr';
  if (type.includes('js') || type.includes('script') || req.path?.match(/\.js(\?|$)/)) return 'js';
  if (type.includes('css') || req.path?.match(/\.css(\?|$)/)) return 'css';
  if (
    type.includes('img') ||
    type.includes('image') ||
    type.includes('png') ||
    type.includes('jpg') ||
    type.includes('jpeg') ||
    type.includes('gif') ||
    type.includes('svg') ||
    type.includes('ico') ||
    type.includes('webp') ||
    req.path?.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)(\?|$)/)
  )
    return 'img';
  if (
    type.includes('media') ||
    type.includes('video') ||
    type.includes('audio') ||
    req.path?.match(/\.(mp4|webm|ogg|mp3|wav)(\?|$)/)
  )
    return 'media';
  if (
    type.includes('font') ||
    type.includes('woff') ||
    type.includes('ttf') ||
    req.path?.match(/\.(woff|woff2|ttf|otf|eot)(\?|$)/)
  )
    return 'font';
  if (
    type.includes('ws') ||
    type.includes('websocket') ||
    req.protocol === 'ws' ||
    req.protocol === 'wss'
  )
    return 'ws';
  if (type.includes('wasm') || req.path?.match(/\.wasm(\?|$)/)) return 'wasm';
  if (type.includes('manifest') || req.path?.match(/manifest\.json(\?|$)/)) return 'manifest';
  if (
    type.includes('doc') ||
    type.includes('html') ||
    type.includes('document') ||
    (!type && !req.path?.includes('.'))
  )
    return 'doc';

  return 'other';
}

// ─── Filter Logic (copy từ useRequestFilter.ts) ───────────────────────
function filterRequestsByConfig(
  reqs: NetworkRequest[],
  filter: InspectorFilter,
  searchTerm: string,
): NetworkRequest[] {
  return reqs.filter((req) => {
    if (!req.host || req.host.trim() === '' || !req.url || req.url.trim() === '') {
      return false;
    }

    const method = req.method?.toUpperCase() || '';
    const methodKey = method as keyof typeof filter.methods;
    if (method && filter.methods[methodKey] === false) {
      return false;
    }

    if (filter.host.whitelist.length > 0) {
      const hostMatch = filter.host.whitelist.some((h) =>
        req.host?.toLowerCase().includes(h.toLowerCase()),
      );
      if (!hostMatch) return false;
    }

    const status = req.status;
    const failedStatus = status === 0 && req.responseHeaders?.['X-Request-Status'] === 'Failed';
    if (failedStatus) {
      if (filter.status['failed'] === false) {
        return false;
      }
    } else if (typeof status === 'number' && filter.status[status] === false) {
      return false;
    }

    const type = getRequestCategory(req);
    if (filter.type[type as keyof typeof filter.type] === false) {
      return false;
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const searchable = [
        req.id,
        req.method,
        req.host,
        req.path,
        req.url,
        req.type,
        req.status?.toString(),
        req.size,
        req.time,
        req.requestBody,
        req.responseBody,
      ]
        .filter(Boolean)
        .map((s) => String(s).toLowerCase());

      const headerEntries = [req.requestHeaders, req.responseHeaders].flatMap(
        (headers) => (headers ? Object.entries(headers) : []),
      );
      const headerSearchable = headerEntries
        .flatMap(([k, v]) => [k, String(v)])
        .map((s) => s.toLowerCase());

      const matchesSearch =
        searchable.some((s) => s.includes(term)) ||
        headerSearchable.some((s) => s.includes(term));

      if (!matchesSearch) {
        return false;
      }
    }

    return true;
  });
}

// Kiểm tra 1 request có match filter hiện tại không
function matchesCurrentFilter(req: NetworkRequest): boolean {
  if (!currentFilter) return true;
  const { searchTerm = '', config } = currentFilter;
  if (!config && !searchTerm) return true;

  if (!config) {
    // Chỉ search term, không có config filter
    if (!req.host || req.host.trim() === '' || !req.url || req.url.trim() === '') return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const searchable = [
        req.id, req.method, req.host, req.path, req.url,
        req.type, req.status?.toString(), req.size, req.time,
        req.requestBody, req.responseBody,
      ].filter(Boolean).map((s) => String(s).toLowerCase());
      return searchable.some((s) => s.includes(term));
    }
    return true;
  }

  const filtered = filterRequestsByConfig([req], config, searchTerm);
  return filtered.length > 0;
}

// ─── Message Handlers ─────────────────────────────────────────────────
self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'ADD_REQUEST': {
      const req: NetworkRequest = payload;
      if (!requestIndex.has(req.id)) {
        requests.unshift(req); // Thêm vào đầu (mới nhất lên trên)
        rebuildIndex();

        // Giới hạn mềm để tránh OOM
        if (requests.length > MAX_REQUESTS) {
          requests = requests.slice(0, MAX_REQUESTS);
          rebuildIndex();
        }

        // Kiểm tra xem request có match filter hiện tại không
        const matchesFilter = filteredRequests === null || matchesCurrentFilter(req);

        if (filteredRequests !== null && matchesFilter) {
          filteredRequests.unshift(req);
        }

        // Gửi CHỈ item mới + metadata — không gửi lại toàn bộ window
        // Main thread sẽ prepend item này vào store
        sendToMain('REQUEST_ADDED', {
          request: req,
          totalCount: requests.length,
          filteredCount: filteredRequests !== null ? filteredRequests.length : null,
          matchesFilter,
        });
      }
      break;
    }

    case 'UPDATE_REQUEST': {
      const { id, updates } = payload;
      const idx = requestIndex.get(id);
      if (idx !== undefined) {
        requests[idx] = { ...requests[idx], ...updates };

        // Cập nhật trong filteredRequests nếu đang filter
        if (filteredRequests !== null) {
          const filteredIdx = filteredRequests.findIndex((r) => r.id === id);
          if (filteredIdx !== -1) {
            filteredRequests[filteredIdx] = { ...filteredRequests[filteredIdx], ...updates };
          }
        }

        sendToMain('REQUEST_UPDATED', { id, updates });
      }
      break;
    }

    case 'FILTER': {
      const { searchTerm, config } = payload;

      if (!searchTerm && !config) {
        // Clear filter
        filteredRequests = null;
        currentFilter = null;
      } else {
        currentFilter = { searchTerm, config };
        if (config) {
          filteredRequests = filterRequestsByConfig(requests, config, searchTerm || '');
        } else if (searchTerm) {
          // Chỉ search term, không có config
          filteredRequests = requests.filter((req) => {
            if (!req.host || !req.url) return false;
            const term = searchTerm.toLowerCase();
            const searchable = [
              req.id, req.method, req.host, req.path, req.url,
              req.type, req.status?.toString(), req.size, req.time,
              req.requestBody, req.responseBody,
            ].filter(Boolean).map((s) => String(s).toLowerCase());
            return searchable.some((s) => s.includes(term));
          });
        } else {
          filteredRequests = null;
          currentFilter = null;
        }
      }

      const source = filteredRequests !== null ? filteredRequests : requests;
      sendToMain('FILTER_RESULT', {
        window: getWindow(0, WINDOW_SIZE),
        totalMatched: source.length,
        totalCount: requests.length,
        isFiltered: filteredRequests !== null,
      });
      break;
    }

    case 'LOAD_MORE': {
      const { offset, limit = WINDOW_SIZE } = payload;
      sendToMain('WINDOW_UPDATED', {
        window: getWindow(offset, limit),
        offset,
      });
      break;
    }

    case 'CLEAR': {
      requests = [];
      requestIndex.clear();
      filteredRequests = null;
      currentFilter = null;
      sendToMain('REQUESTS_CLEARED', {});
      break;
    }

    default:
      console.warn('[NetworkWorker] Unknown message type:', type);
  }
};

// Signal sẵn sàng
sendToMain('WORKER_READY', {});
