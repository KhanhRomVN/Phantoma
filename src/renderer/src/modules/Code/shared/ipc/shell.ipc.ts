/**
 * ------------------------------------------------------------------
 * Shell IPC
 * ------------------------------------------------------------------
 * Wrapper mỏng quanh window.api cho các kênh IPC mở đường dẫn/URL
 * bằng ứng dụng hệ thống trong Code module.
 *
 * Main constants:
 * - shellIpc : Tập hàm openPath/openExternal/openFolder/openPrExternal
 * ------------------------------------------------------------------
 */

// ─── Functions ───────────────────────────────────────────────────────────────
const api = () => (window as any).api;

// ─── Constants ───────────────────────────────────────────────────────────────
export const shellIpc = {
  openPath: (target: string): Promise<any> => api().invoke('shell:open-path', target),
  openExternal: (url: string): Promise<any> => api().invoke('shell:open-external', url),
  openFolder: (payload: { path: string }): Promise<any> => api().invoke('openFolder', payload),
  openPrExternal: (url: string): Promise<any> => api().invoke('pr:open-external', url),
};