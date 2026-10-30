/**
 * ------------------------------------------------------------------
 * IPC Module Index
 * ------------------------------------------------------------------
 * Điểm xuất khẩu tập trung (Barrel File) cho toàn bộ hệ thống IPC Handler.
 * Cung cấp một interface sạch sẽ cho Main Process để khởi tạo tất cả
 * kênh giao tiếp với Renderer mà không cần biết cấu trúc nội tại của từng module.
 *
 * Exports:
 * - setupAppHandlers, setupBrowserHandlers, ... : Các hàm khởi tạo handler theo domain
 * - closeAllBrowserSessions                     : Hàm cleanup tài nguyên đặc biệt
 * ------------------------------------------------------------------
 */

export * from './app.handlers';
export * from './fs.handlers';
export { setupDialogHandlers } from './dialog.handlers';
export { setupConversationHandlers } from './conversation.handlers';
export { setupWindowHandlers } from './window.handlers';
export { setupTerminalHandlers } from './terminal.handlers';
export { setupGitHandlers } from './git.handlers';
export { setupTaskHandlers } from './task.handlers';
export { setupLoggerHandlers } from './logger.handlers';
// export { setupBrowserHandlers } from './puppeteer.handlers'; // Deprecated - moved to recon server
export { setupReconHandlers } from './recon.handlers';
export { registerWorkspaceHandlers } from './webview.handlers';
export { setupMemoryHandlers } from './memory.handlers';
export { setupSkillHandlers } from './skill.handlers';
export { setupTitleHandlers } from './title.handlers';
export { setupWorkspaceDataHandlers } from './workspace.handlers';
export { setupDesignHandlers } from './design.handlers';
export { setupRuntimeHandlers } from './runtime.handlers';
