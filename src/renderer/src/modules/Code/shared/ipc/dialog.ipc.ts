/**
 * ------------------------------------------------------------------
 * Dialog IPC
 * ------------------------------------------------------------------
 * Wrapper mỏng quanh window.api cho các kênh IPC dialog:* (chọn đường
 * dẫn, hộp thoại lưu file) trong Code module.
 *
 * Main constants:
 * - dialogIpc : Tập hàm selectPaths/showSave
 * ------------------------------------------------------------------
 */

// ─── Functions ───────────────────────────────────────────────────────────────
const api = () => (window as any).api;

// ─── Constants ───────────────────────────────────────────────────────────────
export const dialogIpc = {
  selectPaths: (options: { kind: 'file' | 'folder'; multiple?: boolean; [key: string]: unknown }): Promise<any> =>
    api().invoke('dialog:select-paths', options),
  showSave: (options: { defaultPath?: string; [key: string]: unknown }): Promise<any> =>
    api().invoke('dialog:show-save', options),
};