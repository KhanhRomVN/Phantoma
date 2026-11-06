/**
 * ------------------------------------------------------------------
 * Code Tool Status Checker
 * ------------------------------------------------------------------
 * Kiểm tra trạng thái busy/blocked cho các tool của Code module.
 * ------------------------------------------------------------------
 */

import type { ToolStatusChecker } from '@renderer/components/RightPanel/Zen/shared/tool-status';
import { TERMINAL_STATUS } from '@renderer/components/RightPanel/Zen/shared/tool-constants';

/**
 * Check if a Code tool is busy and should block interaction.
 */
export const checkCodeToolStatus: ToolStatusChecker = (context) => {
  const { action, hasHistoryOutput, toolOutputs, actionId, terminalStatus } = context;

  // run_command: check if terminal is busy
  if (action.type === 'run_command' && !hasHistoryOutput) {
    const outputData = toolOutputs?.[actionId];
    const terminalId = (outputData as any)?.terminalId || action.params.terminal_id;
    if (terminalId && terminalStatus?.[terminalId] === TERMINAL_STATUS.RUNNING) {
      return true;
    }
  }

  return false;
};