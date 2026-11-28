/**
 * ------------------------------------------------------------------
 * Debug IPC
 * ------------------------------------------------------------------
 * Wrapper mỏng quanh window.api cho các kênh IPC debug:* trong Code module.
 *
 * Main constants:
 * - debugIpc : Tập hàm raw/invoke/createLaunch
 * ------------------------------------------------------------------
 */

// ─── Functions ───────────────────────────────────────────────────────────────
const api = () => (window as any).api;

// ─── Constants ───────────────────────────────────────────────────────────────
export const debugIpc = {
  raw: (): any => api(),
  invoke: (channel: `debug:${string}`, ...args: unknown[]): Promise<any> => api().invoke(channel, ...args),
  createLaunch: (projectPath: string): Promise<any> => api().invoke('debug:create-launch', projectPath),
};