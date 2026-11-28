/**
 * ------------------------------------------------------------------
 * Dialog Service
 * ------------------------------------------------------------------
 * Service mỏng bọc dialogIpc để chọn file/thư mục từ hộp thoại hệ thống.
 *
 * Main functions:
 * - dialogService.selectPaths() : Chọn file hoặc folder, trả về mảng đường dẫn
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Services ──
import { dialogIpc } from '../ipc/dialog.ipc';

// ─── Constants ───────────────────────────────────────────────────────────────
export const dialogService = {
  selectPaths: async (kind: 'file' | 'folder', multiple = true): Promise<string[]> => {
    const res = await dialogIpc.selectPaths({ kind, multiple });
    return res?.success ? (res.paths as string[]) : [];
  },
};