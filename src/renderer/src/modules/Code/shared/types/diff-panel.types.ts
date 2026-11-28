/**
 * ------------------------------------------------------------------
 * Diff Panel Types
 * ------------------------------------------------------------------
 * Kiểu dữ liệu trạng thái cho panel hiển thị diff.
 *
 * Main types:
 * - PanelState : Trạng thái loading/error/diff của panel
 * ------------------------------------------------------------------
 */

// ─── Types ───────────────────────────────────────────────────────────────────
export interface PanelState {
  loading: boolean;
  error: string | null;
  diff: string;
}