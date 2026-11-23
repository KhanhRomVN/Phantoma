import { MemoryController } from '@renderer/controller/MemoryController';

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