/**
 * ------------------------------------------------------------------
 * Tool Output Formatter Registry
 * ------------------------------------------------------------------
 * Registry cho module-specific output formatters.
 * Mỗi module đăng ký formatter cho IPC result messages của tool.
 * ------------------------------------------------------------------
 */

import type { ToolOutputFormatter } from '@renderer/components/Widgets/Zen/shared/tool-output';

// ─── Registry State ─────────────────────────────────────────────────────
const outputFormatters: ToolOutputFormatter[] = [];

// ─── Registration API ───────────────────────────────────────────────────
export const registerToolOutputFormatter = (formatter: ToolOutputFormatter): void => {
  outputFormatters.push(formatter);
};

// ─── Query API ──────────────────────────────────────────────────────────
/**
 * Format tool output message.
 * Returns first non-null result, or default format if no formatter handled it.
 */
export const formatToolOutput = (params: {
  toolType: string;
  commandText?: string;
  output: string;
  error?: string;
}): string => {
  // Try module-specific formatters
  for (const formatter of outputFormatters) {
    const result = formatter(params);
    if (result !== null) return result;
  }

  // Default format
  const { toolType, commandText, output, error } = params;
  const label = commandText || toolType;
  if (error) {
    return `Output: [${toolType} for '${label}'] Error - ${error}\n\`\`\`\n${output}\n\`\`\``;
  }
  return `Output: [${toolType} for '${label}']\n\`\`\`\n${output}\n\`\`\``;
};
