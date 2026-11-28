/**
 * ------------------------------------------------------------------
 * Executor Types
 * ------------------------------------------------------------------
 * Định nghĩa các type cho tool executor system.
 * Bao gồm context, options, và interface chuẩn cho mọi executor.
 *
 * Main types:
 * - ExecutorContext : Context dùng chung cho tất cả executors
 * - ToolExecutor    : Interface chuẩn cho mọi tool executor
 * - ExecutorOptions : Options tùy chọn khi thực thi tool
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Types ──
import type { ToolOutput } from './tool_output.types';

// ── Services ──
import type { electronWidgetBridge } from '../../../shared/platform/electron-widget-bridge.service';

// ─── Types ──────────────────────────────────────────────────────────────
// Executor context - shared state and dependencies
export interface ExecutorContext {
  setToolOutputs: React.Dispatch<React.SetStateAction<Record<string, ToolOutput>>>;
  conversationIdRef?: React.MutableRefObject<string>;
  getToolTimeout: (actionType: string) => number;
  extensionService: typeof electronWidgetBridge;
  messageDispatcher: any;
  pendingToolResolvers?: Map<string, (result: string | null) => void>;
  commandStartTimes?: Map<string, number>;
  earlyCommandResults?: Map<string, any>;
  responseNumber?: number;
  activeTargetId?: string | null;
  moduleId?: string;
  folderPath?: string | null;
  workflowAgentId?: string | null;
}

// Base executor interface
export interface ToolExecutor {
  execute(action: any, context: ExecutorContext, options?: ExecutorOptions): Promise<string | null>;
}

// Executor options
export interface ExecutorOptions {
  bypassIgnore?: boolean;
}
