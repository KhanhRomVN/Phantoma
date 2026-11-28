/**
 * ------------------------------------------------------------------
 * Terminal IPC
 * ------------------------------------------------------------------
 * Wrapper mỏng quanh window.api cho các kênh IPC terminal:* trong Code
 * module (invoke, send, listen, kill foreground, lịch sử, process info).
 *
 * Main types:
 * - Listener : Kiểu hàm lắng nghe sự kiện IPC
 *
 * Main constants:
 * - terminalIpc : Tập hàm giao tiếp với terminal
 * ------------------------------------------------------------------
 */

// ─── Functions ───────────────────────────────────────────────────────────────
const api = () => (window as any).api;

// ─── Types ───────────────────────────────────────────────────────────────────
type Listener = (event: any, ...args: any[]) => void;

// ─── Constants ───────────────────────────────────────────────────────────────
export const terminalIpc = {
  canSend: (): boolean => Boolean(api()?.send),
  canListen: (): boolean => Boolean(api()?.on),
  canInvoke: (): boolean => Boolean(api()?.invoke),
  invoke: (channel: string, ...args: unknown[]): Promise<any> => api().invoke(channel, ...args),
  send: (channel: string, ...args: unknown[]): void => api()?.send(channel, ...args),
  listen: (channel: string, listener: Listener): void => api().on(channel, listener),
  unlisten: (channel: string, listener: Listener): void => api().off(channel, listener),
  killForeground: (terminalId: string): Promise<any> => api().invoke('terminal:kill-foreground', terminalId),
  historyDelete: (id: string): void => api()?.send('terminal:history-delete', id),
  onProcessInfo: (listener: Listener): (() => void) => {
    api().on('terminal:process-info', listener);
    return () => api().off('terminal:process-info', listener);
  },
};