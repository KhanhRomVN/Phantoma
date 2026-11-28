/**
 * ------------------------------------------------------------------
 * Read Memory Executor
 * ------------------------------------------------------------------
 * Thực thi tool read_memory: đọc nội dung file memory toàn cục thông
 * qua MemoryController và định dạng kết quả cho agent.
 *
 * Main functions:
 * - executeReadMemory() : Đọc memory, xử lý trường hợp file chưa tồn tại
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Components ──
import { MemoryController } from '@renderer/controller/MemoryController';

// ─── Functions ───────────────────────────────────────────────────────────────
/**
 * Execute read_memory tool.
 */
export async function executeReadMemory(): Promise<string | null> {
  const result = await MemoryController.readMemory();

  if (!result.success) {
    return `[read_memory] Result: Error - ${result.error}`;
  }

  const data = result.data;
  const exists = data?.exists ?? false;
  const content = data?.content || '';

  if (!exists) {
    return '[read_memory] Result: (memory file does not exist yet)\n```\n\n```';
  }

  return `[read_memory] Result:\n\`\`\`\n${content}\n\`\`\``;
}