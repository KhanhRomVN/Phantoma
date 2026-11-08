/**
 * ------------------------------------------------------------------
 * OnlineUserBadge
 * ------------------------------------------------------------------
 * Badge hiển thị tổng số người đang online dùng Zen, lấy qua WebSocket
 * tới worker zen-presence (Cloudflare Durable Object).
 * Màu lấy hoàn toàn từ biến theme VSCode.
 *
 * Main features:
 * - Một kết nối WebSocket dùng chung cho mọi badge
 * - Gửi ping định kỳ, tự reconnect khi mất kết nối
 * - Tự ngắt khi không còn badge nào
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { extensionService } from '../../services/ExtensionService';

// ─── Types ──────────────────────────────────────────────────────────────
type Listener = (count: number | null) => void;

interface OnlineUserBadgeProps {
  style?: React.CSSProperties;
}

// ─── Constants ──────────────────────────────────────────────────────────
const PRESENCE_ENDPOINT = 'wss://zen-presence.khanhromvn.workers.dev/';
const PRESENCE_ID_KEY = 'zen_presence_id';
const PING_MS = 30_000;
const RECONNECT_MS = 5_000;

// ─── Module state ───────────────────────────────────────────────────────
const listeners = new Set<Listener>();
let current: number | null = null;
let socket: WebSocket | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

// ─── Helpers ────────────────────────────────────────────────────────────
const emit = (count: number | null) => {
  current = count;
  listeners.forEach((l) => l(count));
};

const clearTimers = () => {
  if (pingTimer) clearInterval(pingTimer);
  if (reconnectTimer) clearTimeout(reconnectTimer);
  pingTimer = null;
  reconnectTimer = null;
};

const getPresenceId = async (): Promise<string> => {
  const storage = extensionService.getStorage();
  try {
    const saved = await storage.get(PRESENCE_ID_KEY);
    if (saved?.value) return saved.value;
    const id = `zen-${uuidv4()}`;
    await storage.set(PRESENCE_ID_KEY, id);
    return id;
  } catch {
    return `zen-${uuidv4()}`;
  }
};

const connect = async () => {
  const uid = await getPresenceId();
  if (listeners.size === 0 || socket) return;
  const ws = new WebSocket(`${PRESENCE_ENDPOINT}?uid=${encodeURIComponent(uid)}`);
  socket = ws;

  ws.onopen = () => {
    pingTimer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send('ping');
    }, PING_MS);
  };

  ws.onmessage = (event) => {
    if (event.data === 'pong') return;
    try {
      const { online } = JSON.parse(event.data);
      if (typeof online === 'number') emit(online);
    } catch {}
  };

  ws.onclose = () => {
    if (socket !== ws) return;
    socket = null;
    clearTimers();
    if (listeners.size > 0) reconnectTimer = setTimeout(connect, RECONNECT_MS);
  };
};

const stop = () => {
  clearTimers();
  const ws = socket;
  socket = null;
  ws?.close();
};

const useOnlineCount = () => {
  const [count, setCount] = useState<number | null>(current);

  useEffect(() => {
    listeners.add(setCount);
    if (listeners.size === 1) connect();
    return () => {
      listeners.delete(setCount);
      if (listeners.size === 0) stop();
    };
  }, []);

  return count;
};

// ─── Component ──────────────────────────────────────────────────────────
const OnlineUserBadge: React.FC<OnlineUserBadgeProps> = ({ style }) => {
  const count = useOnlineCount();

  return (
    <>
      <style>{`
        @keyframes zen-online-pulse {
          0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--vscode-textLink-foreground) 55%, transparent); }
          70% { box-shadow: 0 0 0 5px transparent; }
          100% { box-shadow: 0 0 0 0 transparent; }
        }
      `}</style>
      <div
        title={count === null ? 'Online' : `${count} online`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 10px',
          fontSize: 11,
          fontWeight: 600,
          lineHeight: 1.2,
          border:
            '1px dashed color-mix(in srgb, var(--vscode-textLink-foreground) 35%, transparent)',
          borderRadius: 4,
          color: 'var(--vscode-textLink-foreground)',
          backgroundColor:
            'color-mix(in srgb, var(--vscode-textLink-foreground) 14%, transparent)',
          ...style,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: 'currentColor',
            animation: 'zen-online-pulse 2s ease-out infinite',
          }}
        />
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{count ?? '–'}</span>
        <span
          style={{
            fontWeight: 500,
            opacity: 0.75,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            fontSize: 9,
          }}
        >
          online
        </span>
      </div>
    </>
  );
};

export default OnlineUserBadge;