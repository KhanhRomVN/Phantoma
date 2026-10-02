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

function dispatch(channel: string, data: unknown): void {
  const set = listeners.get(channel);
  if (!set) return;
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

function ensureConnected(): void {
  if (eventSource) return;

  const url = resolveSseUrl();
  logger.info('[RuntimeSseBridge] connecting SSE', { url });
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
      try {
        const data = JSON.parse(e.data);
        dispatch(channel, data);
      } catch (err) {
        logger.warn('[RuntimeSseBridge] failed to parse event', {
          channel,
          err: String(err),
        });
      }
    });
  }

  eventSource.onerror = () => {
    logger.warn('[RuntimeSseBridge] SSE error — will retry automatically');
  };
}

export function installRuntimeSseBridge(): void {
  if (installed) return;
  installed = true;

  const w = window as unknown as { api?: Record<string, unknown> };
  w.api = w.api || {};

  w.api.on = (channel: string, fn: Listener) => {
    if (!listeners.has(channel)) listeners.set(channel, new Set());
    listeners.get(channel)!.add(fn);
    ensureConnected();
  };

  w.api.off = (channel: string, fn: Listener) => {
    listeners.get(channel)?.delete(fn);
  };

  logger.info('[RuntimeSseBridge] installed');
}

export function closeRuntimeSseBridge(): void {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
}