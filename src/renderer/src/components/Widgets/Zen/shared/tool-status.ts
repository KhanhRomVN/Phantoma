/**
 * ------------------------------------------------------------------
 * Tool Status Types
 * ------------------------------------------------------------------
 * Interface cho module-specific logic kiểm tra trạng thái tool.
 * Mỗi module tự định nghĩa điều kiện tool đang busy/blocked.
 * ------------------------------------------------------------------
 */

import type { ToolAction } from '@renderer/components/Widgets/Zen/feature/Chat/services/responseParser';

export interface ToolStatusContext {
  actionId: string;
  action: ToolAction;
  hasOutput: boolean;
  hasHistoryOutput: boolean;
  toolOutputs?: Record<string, any>;
  terminalStatus?: Record<string, string>;
}

/**
 * Module-specific checker để xác định tool có đang busy/blocked không.
 * Return true nếu tool đang busy và cần block interaction.
 */
export type ToolStatusChecker = (context: ToolStatusContext) => boolean;
