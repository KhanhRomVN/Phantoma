/**
 * ------------------------------------------------------------------
 * FS IPC
 * ------------------------------------------------------------------
 * Wrapper mỏng quanh window.api cho các kênh IPC fs:* (ghi file,
 * validate đường dẫn, thay thế hàng loạt) trong Code module.
 *
 * Main constants:
 * - fsIpc : Tập hàm writeFile/validatePaths/getHomedir/replaceAll
 * ------------------------------------------------------------------
 */

// ─── Functions ───────────────────────────────────────────────────────────────
const api = () => (window as any).api;

// ─── Constants ───────────────────────────────────────────────────────────────
export const fsIpc = {
  writeFile: (filePath: string, content: string): Promise<any> => api().invoke('fs:write-file', filePath, content),
  validatePaths: (paths: string[]): Promise<any> => api().invoke('fs:validate-paths', paths),
  getHomedir: (): Promise<any> => api().invoke('fs:get-homedir'),
  replaceAll: (files: string[], query: string, replacement: string, options: unknown): Promise<any> =>
    api().invoke('fs:replace-all', files, query, replacement, options),
};