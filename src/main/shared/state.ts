/**
 * ------------------------------------------------------------------
 * Trạng thái ứng dụng
 * ------------------------------------------------------------------
 * Trạng thái có thể thay đổi dùng chung cho tiến trình chính. 
 * Sau khi di chuyển tính năng Emulate/Target sang Express Server,
 * file này chỉ còn giữ lại các biến trạng thái cơ bản nếu cần thiết
 * cho việc cleanup hoặc debug.
 *
 * Hàm chính:
 * - clearActiveState() : Reset trạng thái chung
 * ------------------------------------------------------------------
 */

// ─── Interfaces ─────────────────────────────────────────────────────────
export interface AppState {
  // Placeholder for future global state needs in Main Process
  // Currently empty as Target/Process management moved to Server.
}

// ─── Constants ──────────────────────────────────────────────────────────
export const appState: AppState = {};

export function clearActiveState(): void {
  // No-op currently. Add cleanup logic here if new global states are introduced.
}
