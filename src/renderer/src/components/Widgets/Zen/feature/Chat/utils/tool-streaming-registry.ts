/**
 * ------------------------------------------------------------------
 * Tool Streaming Registry
 * ------------------------------------------------------------------
 * Registry cho các tool có streaming output riêng (qua IPC, không lưu trực tiếp).
 * Ví dụ: run_command stream output qua terminal IPC, không cần setToolOutputs ở đây.
 * ------------------------------------------------------------------
 */

const streamingTools = new Set<string>();

/**
 * Register a tool type that handles its own output streaming.
 * These tools skip the default output storage logic.
 */
export const registerStreamingTool = (toolType: string): void => {
  streamingTools.add(toolType);
};

/**
 * Check if a tool handles its own output streaming.
 */
export const isStreamingTool = (toolType: string): boolean => {
  return streamingTools.has(toolType);
};