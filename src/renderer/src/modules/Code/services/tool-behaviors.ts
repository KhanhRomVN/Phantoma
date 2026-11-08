/**
 * ------------------------------------------------------------------
 * Code Tool Behaviors
 * ------------------------------------------------------------------
 * Module-specific behaviors cho các tool của Code:
 * - run_command không collapse mặc định (cần xem output ngay)
 * - run_command có thể dangerous (detect qua SecurityValidator)
 * - run_command format đặc biệt trong markdown (terminal_id: command)
 * ------------------------------------------------------------------
 */

import type {
  ToolCollapseChecker,
  ToolDangerChecker,
  ToolMarkdownFormatter,
} from '@renderer/components/Widgets/Zen/shared/tool-behaviors';
import { SecurityValidator } from '../utils/security';

/**
 * Code tools không collapse mặc định.
 * (Zen core sẽ collapse tất cả tool khác, chỉ run_command được expand.)
 */
export const checkCodeToolCollapse: ToolCollapseChecker = (action) => {
  // run_command luôn expand để user thấy output ngay
  if (action.type === 'run_command') return false;
  // Các tool khác của Code module không có quy tắc đặc biệt → để Zen core quyết định
  return false;
};

/**
 * Check dangerous command cho run_command.
 */
export const checkCodeToolDanger: ToolDangerChecker = (action) => {
  if (action.type !== 'run_command') return { dangerous: false };

  const commandText = action.params?.command;
  if (typeof commandText !== 'string') return { dangerous: false };

  const verdict = SecurityValidator.validateCommand(commandText);
  if (!verdict.safe) {
    return {
      dangerous: true,
      reason: verdict.reason || 'Command validation failed',
    };
  }

  return { dangerous: false };
};

/**
 * Format run_command cho markdown display: terminal_id: command_preview
 */
export const formatCodeToolForMarkdown: ToolMarkdownFormatter = (action) => {
  if (action.type !== 'run_command') return null;

  const id = action.params.terminal_id || '';
  const cmd = action.params.command || action.params.text || '';

  if (id && cmd) {
    const preview = cmd.length > 30 ? cmd.substring(0, 30) + '...' : cmd;
    return `${id}: ${preview}`;
  }

  if (id) return id;

  return cmd.length > 50 ? cmd.substring(0, 50) + '...' : cmd;
};
