/**
 * ------------------------------------------------------------------
 * Code Tool Output Formatter
 * ------------------------------------------------------------------
 * Format IPC result messages cho run_command tool.
 * ------------------------------------------------------------------
 */

import type { ToolOutputFormatter } from '@renderer/components/RightPanel/Zen/feature/Chat/types/tool-output';

/**
 * Format run_command output message.
 */
export const formatCodeToolOutput: ToolOutputFormatter = (params) => {
  const { toolType, commandText, output, error } = params;

  if (toolType !== 'run_command') return null;

  const cmdText = commandText || 'command';
  if (error) {
    return `Output: [run_command for '${cmdText}'] Error - ${error}\n\`\`\`\n${output}\n\`\`\``;
  }
  return `Output: [run_command for '${cmdText}']\n\`\`\`\n${output}\n\`\`\``;
};