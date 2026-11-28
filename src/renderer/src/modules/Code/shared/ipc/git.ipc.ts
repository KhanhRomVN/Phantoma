/**
 * ------------------------------------------------------------------
 * Git IPC
 * ------------------------------------------------------------------
 * Wrapper mỏng quanh window.api cho các kênh IPC git:* trong Code module.
 *
 * Main types:
 * - Listener : Kiểu hàm lắng nghe sự kiện IPC
 *
 * Main constants:
 * - gitIpc : Tập hàm invoke/on (on trả về hàm hủy đăng ký)
 * ------------------------------------------------------------------
 */

// ─── Functions ───────────────────────────────────────────────────────────────
const api = () => (window as any).api;

// ─── Types ───────────────────────────────────────────────────────────────────
type Listener = (event: any, ...args: any[]) => void;

// ─── Constants ───────────────────────────────────────────────────────────────
export const gitIpc = {
  invoke: (channel: string, ...args: unknown[]): Promise<any> => api().invoke(channel, ...args),
  on: (channel: string, listener: Listener): (() => void) => {
    const off = api().on(channel, listener);
    return typeof off === 'function' ? off : () => api().off(channel, listener);
  },
};