/**
 * ------------------------------------------------------------------
 * Update Memory Executor
 * ------------------------------------------------------------------
 * Thực thi tool update_memory: thay thế đoạn nội dung trong file memory
 * toàn cục thông qua MemoryController.
 *
 * Main functions:
 * - executeUpdateMemory() : Cập nhật memory theo old_content/new_content
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Components ──
import { MemoryController } from '@renderer/controller/MemoryController';

// ─── Functions ───────────────────────────────────────────────────────────────
/**
 * Execute update_memory tool.
 */
export async function executeUpdateMemory(params: {
  old_content: string;
  new_content: string;
  _validationError?: string;
}): Promise<string | null> {
  if (params._validationError) {
    return `[update_memory] Result: Error - ${params._validationError}`;
  }

  const result = await MemoryController.updateMemory(
    params.old_content ?? '',
    params.new_content ?? '',
  );

  if (!result.success) {
    return `[update_memory] Result: Error - ${result.error}`;
  }

  const createdInfo = result.data?.created ? ' (created)' : '';
  return `[update_memory] Result: Memory updated successfully${createdInfo}`;
}