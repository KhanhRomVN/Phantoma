/**
 * ------------------------------------------------------------------
 * Runtime SSE Bridge
 * ------------------------------------------------------------------
 * Cầu nối tương thích: cung cấp API giống `window.api.on/off` nhưng
 * lấy event từ express-server qua SSE (EventSource) thay vì Electron
 * IPC. Nhờ đó useNetworkEvents.ts giữ nguyên không cần sửa.
 *
 * Cách dùng: gọi `installRuntimeSseBridge()` một lần khi app khởi động.
 * ------------------------------------------------------------------
 */

import { logger } from '@renderer/utils/logger';

type Listener = (event: unknown, data: unknown) => void;

const listeners = new Map<string, Set<Listener>>();
let eventSource: EventSource | null = null;
let installed = false;

function resolveSseUrl(): string {
  const storedUrl = localStorage.getItem('server_url');
  const base = storedUrl
    ? `http://${storedUrl}`
    : import.meta.env.VITE_SERVER_URL || 'http://localhost:8080';
  return `${base}/api/v1/runtime/events`;
}

let _debugReqCount = 0;
function dispatch(channel: string, data: unknown): void {
  if (channel === 'cdp:request') {
    _debugReqCount++;
  }

  const set = listeners.get(channel);
  if (!set) {
    if (channel === 'cdp:request') {
      logger.warn('[SSE-Bridge][DEBUG] NO LISTENERS for cdp:request! Event dropped.');
    }
    return;
  }
  for (const fn of set) {
    try {
      fn({ type: channel }, data);
    } catch (err) {
      logger.error('[RuntimeSseBridge] listener error', {
        channel,
        err: String(err),
      });
    }
  }
}

// Global error handler để bắt parse failures trước khi chúng propagate lên Electron framework
let _sseParseErrorCount = 0;
const handleGlobalSseError = (e: ErrorEvent) => {
  _sseParseErrorCount++;
  // Chỉ log lần đầu + mỗi 50 lỗi để tránh spam
  if (_sseParseErrorCount === 1 || _sseParseErrorCount % 50 === 0) {
    logger.error(
      `[SSE-Bridge][DEBUG] GLOBAL PARSE ERROR #${_sseParseErrorCount}:`,
      e.message?.substring(0, 200),
    );
  }
  // Prevent default behavior that might trigger app reload
  e.preventDefault();
};

// Attach once at module level before any connections
if (typeof window !== 'undefined') {
  window.addEventListener('error', handleGlobalSseError, true); // capture phase
}

function safeJsonParse<T>(data: string | null | undefined, fallback: T): T {
  if (!data) return fallback;
  try {
    return JSON.parse(data) as T;
  } catch (err) {
    _sseParseErrorCount++;
    if (_sseParseErrorCount <= 5 || _sseParseErrorCount % 50 === 0) {
      logger.warn('[SSE-Bridge][DEBUG] Malformed JSON received:', {
        preview: data.substring(0, 100),
        error: String(err).substring(0, 80),
        count: _sseParseErrorCount,
      });
    }
    return fallback;
  }
}

function ensureConnected(): void {
  if (eventSource) return;

  const url = resolveSseUrl();
  eventSource = new EventSource(url);

  const channels = [
    'cdp:request',
    'cdp:response',
    'cdp:response-body',
    'cdp:script-unpacked',
    'cdp:script-source',
    'cdp:error',
    'proxy:request',
    'proxy:response',
    'proxy:response-body',
    'proxy:request-body',
    'proxy:ssl-bypass',
    'proxy:breakpoint-hit',
    'ws:connect',
    'ws:message',
    'ws:update',
    'ws:close',
    'ebpf:https-event',
    'packet:captured',
    'app-debug:log',
    'target:status-changed',
    'app:process-exit',
    // Giai đoạn 2: terminal + mobile
    'terminal:data',
    'terminal:exit',
    'mobile:logcat-output',
    'mobile:frida-log',
    'mobile:frida-progress',
    'mobile:launch-progress',
    'mobile:proxy-progress',
    'mobile:install-cert-progress',
    'mobile:install-progress',
  ];

  for (const channel of channels) {
    eventSource.addEventListener(channel, (e: MessageEvent) => {
      // [DEBUG] Log raw payload size để phát hiện chunk quá lớn gây OOM
      if (channel === 'cdp:request' || channel === 'cdp:response-body') {
        const byteLen = typeof e.data === 'string' ? e.data.length : 0;
        if (byteLen > 512 * 1024) {
          logger.warn(
            `[SSE-Bridge][DEBUG] LARGE PAYLOAD on ${channel}: ${(byteLen / 1024).toFixed(1)} KB`,
          );
        }
      }

      const data = safeJsonParse<any>(e.data, null);
      if (data === null) return; // Silently drop invalid/malformed payloads instead of crashing

      dispatch(channel, data);
    });
  }

  eventSource.onerror = () => {
    logger.warn('[RuntimeSseBridge] SSE error — will retry automatically');
  };
}

/**
 * [DIAGNOSTIC] Chạy self-test để xác định điểm đứt gãy trong luồng dữ liệu.
 * Gọi thủ công từ Console: __phantoma_sse_diag()
 */
function runDiagnostic(): void {
  // Step 1: Kiểm tra listeners đã đăng ký chưa
  const hasReqListener = listeners.has('cdp:request') && listeners.get('cdp:request')!.size > 0;

  if (!hasReqListener) {
    logger.error(
      '[SSE-DIAG] FAILED at Step 1: No listener for cdp:request. Check useNetworkEvents mount order.',
    );
    return;
  }

  // Step 2: Mô phỏng event dispatch trực tiếp (bỏ qua mạng/SSE)
  const mockRequest = {
    id: 'diag-' + Date.now(),
    url: 'https://diagnostic.test/api/ping',
    method: 'GET',
    resourceType: 'xhr',
    headers: {},
    timestamp: Date.now(),
  };

  try {
    dispatch('cdp:request', mockRequest);
  } catch (err) {
    logger.error('[SSE-DIAG] FAILED at Step 2: Exception during dispatch.', err);
    return;
  }

  // Step 3: Chờ 100ms để worker/store cập nhật异步, rồi kiểm tra store
  setTimeout(() => {
    // @ts-ignore - truy cập global store cho debug
    const store = (window as any).__PHANTOMA_NETWORK_STORE__;
    if (store) {
      const exists = store.getState().requests.some((r: any) => r.id === mockRequest.id);
      if (!exists) {
        logger.error(
          '[SSE-DIAG] FAILED at Step 3: Data lost between Dispatch and Store. Likely Worker postMessage failure or Filter drop.',
        );
      }
    } else {
      logger.warn(
        '[SSE-DIAG] Step 3 SKIPPED: Could not access networkStore globally. Manual inspection required.',
      );
    }
  }, 150);
}

// Expose to window for manual triggering
if (typeof window !== 'undefined') {
  (window as any).__phantoma_sse_diag = runDiagnostic;
}

export function installRuntimeSseBridge(): void {
  if (installed) return;
  installed = true;

  const w = window as unknown as { api?: Record<string, unknown> };

  // Ensure w.api exists and is mutable enough for our needs
  if (!w.api) {
    w.api = {};
  }

  // Helper to safely define properties on potentially frozen/read-only objects
  const safeDefineProp = (obj: any, prop: string, value: any) => {
    try {
      obj[prop] = value;
    } catch (e) {
      // Fallback to Object.defineProperty if direct assignment fails due to read-only constraints
      try {
        Object.defineProperty(obj, prop, {
          value,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      } catch (innerErr) {
        logger.error(`[RuntimeSseBridge] Failed to set ${prop}`, { err: String(innerErr) });
      }
    }
  };

  safeDefineProp(w.api, 'on', (channel: string, fn: Listener) => {
    if (!listeners.has(channel)) listeners.set(channel, new Set());
    listeners.get(channel)!.add(fn);
    ensureConnected();
  });

  safeDefineProp(w.api, 'off', (channel: string, fn: Listener) => {
    listeners.get(channel)?.delete(fn);
  });
}

export function closeRuntimeSseBridge(): void {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
}
