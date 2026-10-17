/**
 * ------------------------------------------------------------------
 * Memory Executor
 * ------------------------------------------------------------------
 * Thực thi các memory tool: read_memory, update_memory.
 * Gọi MemoryController và trả về output text cho LLM.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Controller ──
import { MemoryController } from '@renderer/controller/MemoryController';

// ─── Functions ──────────────────────────────────────────────────────────

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