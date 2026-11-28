/**
 * ------------------------------------------------------------------
 * Design IPC
 * ------------------------------------------------------------------
 * Wrapper mỏng quanh window.api cho các kênh IPC design:* (quản lý
 * design của project) trong Code module.
 *
 * Main constants:
 * - designIpc : Tập hàm list/create/remove/update
 * ------------------------------------------------------------------
 */

// ─── Functions ───────────────────────────────────────────────────────────────
const api = () => (window as any).api;

// ─── Constants ───────────────────────────────────────────────────────────────
export const designIpc = {
  list: (projectPath: string): Promise<any> => api().invoke('design:list', projectPath),
  create: (projectPath: string, input: unknown): Promise<any> => api().invoke('design:create', projectPath, input),
  remove: (projectPath: string, designId: string): Promise<any> =>
    api().invoke('design:delete', projectPath, designId),
  update: (projectPath: string, designId: string, graph: unknown): Promise<any> =>
    api().invoke('design:update', projectPath, designId, graph),
};