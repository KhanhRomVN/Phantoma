/**
 * ------------------------------------------------------------------
 * CreateReportHandler
 * ------------------------------------------------------------------
 * Tạo report markdown mới bằng cách gọi backend API.
 * App tự quyết định nơi lưu trữ (file_path do backend generate).
 *
 * Main methods:
 * - handle() : Tạo report từ content, trả về text output
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Services ──
import { emulateApi } from '../services/emulate-api.service';

// ─── Class ──────────────────────────────────────────────────────────────
export class CreateReportHandler {
  /**
   * Tạo report mới.
   * @param content  - Nội dung markdown đầy đủ
   * @param targetId - ID của target hiện tại
   */
  public async handle(
    content: string,
    targetId?: string | null,
    title?: string,
  ): Promise<{ text: string }> {
    if (!content || content.trim().length === 0) {
      return { text: '[create_report] Error: content is required' };
    }
    if (!targetId) {
      return { text: '[create_report] Error: targetId is required' };
    }

    const res = await emulateApi.createReport(targetId, {
      emulate_target_id: targetId,
      title: title || '',
      file_path: '',
      content,
    });

    if (!res.success) {
      return { text: '[create_report] Error: ' + (res.error || 'Failed to create report') };
    }

    // Dispatch event để UI update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('report-updated'));
    }

    return {
      text: `[create_report] Created "${res.data?.title || 'report'}" (ID: ${res.data?.id})`,
    };
  }
}
