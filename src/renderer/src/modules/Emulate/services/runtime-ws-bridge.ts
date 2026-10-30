/**
 * ------------------------------------------------------------------
 * Runtime WebSocket Bridge & Event Bus
 * ------------------------------------------------------------------
 * Quản lý kết nối WebSocket tới Emulate Server và phân phối sự kiện.
 * Cung cấp API tương thích `on/off` thông qua wsBus thay vì window.api
 * để tránh xung đột với Electron Preload Script (frozen properties).
 * ------------------------------------------------------------------
 */

import { resolveEmulateBaseUrl } from './emulate-base-url';

type Listener = (event: unknown, data: unknown) => void;

// ─── Internal Event Bus ────────────────────────────────────────────────
class WsEventBus {
  private listeners = new Map<string, Set<Listener>>();

  public on(channel: string, fn: Listener): () => void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(fn);

    // Return unsubscribe function
    return () => {
      this.listeners.get(channel)?.delete(fn);
    };
  }

  public off(channel: string, fn: Listener): void {
    this.listeners.get(channel)?.delete(fn);
  }

  public emit(channel: string, data: unknown): void {
    const set = this.listeners.get(channel);
    if (!set || set.size === 0) {
      return;
    }

    for (const fn of set) {
      try {
        // Mimic Electron IPC signature: (event, data)
        fn({ type: channel }, data);
      } catch (err) {
        console.error('[WsBus] Listener execution error', { channel, err });
      }
    }
  }
}

export const wsBus = new WsEventBus();

// ─── WebSocket Connection Manager ──────────────────────────────────────
let ws: WebSocket | null = null;
let installed = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 2000;

function resolveWsUrl(): string {
  const base = resolveEmulateBaseUrl();
  const wsBase = base.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
  return `${wsBase}/ws/events`;
}

function safeJsonParse<T>(data: string | ArrayBufferLike | Blob | ArrayBufferView, fallback: T): T {
  if (typeof data !== 'string') return fallback;
  try {
    return JSON.parse(data) as T;
  } catch (err) {
    console.warn('[WS-Bridge] Malformed JSON:', String(err).substring(0, 80));
    return fallback;
  }
}

function scheduleReconnect(): void {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('[RuntimeWsBridge] Max reconnect attempts reached. Emitting disconnect event.');
    // Notify subscribers that the connection is permanently lost
    wsBus.emit('ws:permanently-disconnected', { reason: 'max_retries_exceeded' });
    return;
  }

  reconnectAttempts++;
  const delay = Math.min(RECONNECT_DELAY_MS * Math.pow(1.5, reconnectAttempts - 1), 10000);

  setTimeout(() => connect(), delay);
}

function connect(): void {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const url = resolveWsUrl();

  try {
    ws = new WebSocket(url);
  } catch (err) {
    console.error('[RuntimeWsBridge] Failed to create WS:', err);
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    reconnectAttempts = 0;
    ws?.send(JSON.stringify({ action: 'PING' }));
  };

  ws.onmessage = (event: MessageEvent) => {
    const message = safeJsonParse<{ type: string; data: any }>(event.data, null as any);
    if (!message || !message.type) return;

    // Dispatch via internal bus instead of window.api
    wsBus.emit(message.type, message.data);
  };

  ws.onerror = (error) => {
    console.error('[RuntimeWsBridge] WS Error:', error);
  };

  ws.onclose = (event) => {
    console.warn(`[RuntimeWsBridge] Closed (${event.code}). Notifying subscribers.`);
    ws = null;

    // Emit immediate disconnection notification so UI can cleanup
    // regardless of whether reconnection will eventually succeed or fail.
    wsBus.emit('ws:immediate-disconnect', { code: event.code, reason: event.reason });

    if (installed) scheduleReconnect();
  };
}

export function installRuntimeWsBridge(): void {
  if (installed) return;
  installed = true;
  connect();
}

export function closeRuntimeWsBridge(): void {
  if (ws) {
    ws.close(1000, 'Manual shutdown');
    ws = null;
  }
  installed = false;
  reconnectAttempts = MAX_RECONNECT_ATTEMPTS;
  // Notify subscribers that the bridge was manually shut down
  wsBus.emit('ws:permanently-disconnected', { reason: 'manual_shutdown' });
}
