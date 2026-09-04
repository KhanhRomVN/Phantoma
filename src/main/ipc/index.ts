/**
 * ------------------------------------------------------------------
 * Barrel export IPC
 * ------------------------------------------------------------------
 * Tái xuất tất cả hàm thiết lập IPC handler từ thư mục ipc
 * để cung cấp một điểm import duy nhất cho tiến trình chính.
 *
 * Export chính:
 * - setup*Handlers()        : Các hàm đăng ký IPC handler riêng lẻ
 * - closeAllBrowserSessions : Trợ giúp dọn dẹp trình duyệt
 * ------------------------------------------------------------------
 */

export * from './proxy.handlers';
export * from './cdp.handlers';
export * from './app.handlers';
export * from './session.handlers';
export * from './fs.handlers';
export * from './tls.handlers';
export * from './renderer.handlers';
export { setupMobileHandlers } from './mobile.handlers';
export { setupConversationHandlers } from './conversation.handlers';
export { setupWindowHandlers } from './window.handlers';
export { setupTerminalHandlers } from './terminal.handlers';
export { setupGitHandlers } from './git.handlers';
export { setupLoggerHandlers } from './logger.handlers';
export { setupBrowserHandlers, closeAllBrowserSessions } from './browser.handlers';
export { setupTargetHandlers } from './target.handlers';
