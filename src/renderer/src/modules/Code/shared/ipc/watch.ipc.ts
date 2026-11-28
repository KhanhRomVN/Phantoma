/**
 * ------------------------------------------------------------------
 * Watch IPC
 * ------------------------------------------------------------------
 * Wrapper mỏng quanh window.api cho các kênh IPC theo dõi thay đổi
 * thư mục/file và git index trong Code module.
 *
 * Main types:
 * - Listener : Kiểu hàm lắng nghe sự kiện IPC
 *
 * Main constants:
 * - watchIpc : Tập hàm watch/unwatch và đăng ký listener thay đổi
 * ------------------------------------------------------------------
 */

// ─── Functions ───────────────────────────────────────────────────────────────
const api = () => (window as any).api;

// ─── Types ───────────────────────────────────────────────────────────────────
type Listener = (event: any, ...args: any[]) => void;

const subscribe = (channel: string, listener: Listener): (() => void) => {
  api().on(channel, listener);
  return () => api().off(channel, listener);
};

// ─── Constants ───────────────────────────────────────────────────────────────
export const watchIpc = {
  watchDir: (projectPath: string): Promise<any> => api().invoke('fs:watch-dir', projectPath),
  unwatchDir: (projectPath: string): Promise<any> => api().invoke('fs:unwatch-dir', projectPath),
  onDirChanged: (listener: Listener): (() => void) => subscribe('fs:dir-changed', listener),
  onIndexChanged: (listener: Listener): (() => void) => subscribe('git:index-changed', listener),
  watchFile: (filePath: string): Promise<any> => api().invoke('fs:watch-file', filePath),
  unwatchFile: (filePath: string): Promise<any> => api().invoke('fs:unwatch-file', filePath),
  onFileChanged: (listener: Listener): (() => void) => api().on('fs:file-changed', listener),
};