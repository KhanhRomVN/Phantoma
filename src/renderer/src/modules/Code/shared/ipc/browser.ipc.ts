/**
 * ------------------------------------------------------------------
 * Browser IPC
 * ------------------------------------------------------------------
 * Wrapper mỏng quanh window.api cho các kênh IPC của browser trong
 * Code module (invoke, send, listen/unlisten).
 *
 * Main types:
 * - Listener : Kiểu hàm lắng nghe sự kiện IPC
 *
 * Main constants:
 * - browserIpc : Tập hàm canSend/canListen/canInvoke/invoke/send/listen/unlisten
 * ------------------------------------------------------------------
 */

// ─── Functions ───────────────────────────────────────────────────────────────
const api = () => (window as any).api;

// ─── Types ───────────────────────────────────────────────────────────────────
type Listener = (event: any, ...args: any[]) => void;

// ─── Constants ───────────────────────────────────────────────────────────────
export const browserIpc = {
  canSend: (): boolean => Boolean(api()?.send),
  canListen: (): boolean => Boolean(api()?.on),
  canInvoke: (): boolean => Boolean(api()?.invoke),
  invoke: (channel: string, ...args: unknown[]): Promise<any> => api().invoke(channel, ...args),
  send: (channel: string, ...args: unknown[]): void => api()?.send(channel, ...args),
  listen: (channel: string, listener: Listener): void => api().on(channel, listener),
  unlisten: (channel: string, listener: Listener): void => api().off(channel, listener),
};