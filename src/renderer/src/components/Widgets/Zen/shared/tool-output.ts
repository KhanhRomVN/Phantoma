/**
 * ------------------------------------------------------------------
 * Tool Output Formatter Types
 * ------------------------------------------------------------------
 * Interface cho module-specific output formatting.
 * Modules có thể đăng ký formatter để format IPC result messages.
 * ------------------------------------------------------------------
 */

/**
 * Format IPC result message for a specific tool type.
 * Returns formatted string or null to use default format.
 */
export type ToolOutputFormatter = (params: {
  toolType: string;
  commandText?: string;
  output: string;
  error?: string;
}) => string | null;