// ============= GROUP TYPES =============

/**
 * ------------------------------------------------------------------
 * Renderer Types
 * ------------------------------------------------------------------
 * Định nghĩa các type cho hệ thống renderer trong chat UI.
 * Bao gồm group types, content blocks, và props cho từng renderer.
 *
 * Main types:
 * - GroupType          : Các loại content group hiển thị trong chat
 * - ContentBlock       : Block content trước khi gán key
 * - BaseRendererProps  : Props chung cho mọi renderer
 * - MergedRendererProps: Props cho renderer hỗ trợ merge actions
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Constants ──
import { TOOL_ACTION_TYPES } from '../constants/constants';

// ── Services ──
import { ToolAction } from '../services/ResponseParser';

// ── Types ──
import { Message, Question } from './message';
import { ToolOutputs } from './tool-outputs';

// ─── Types ──────────────────────────────────────────────────────────────
/**
 * Represents different types of content groups that can be rendered in the chat
 */
export type GroupType =
  | {
      type: 'tools';
      items: { action: ToolAction; index: number }[];
      key: string;
    }
  | { type: 'markdown'; content: string; key: string }
  | { type: 'code'; content: string; language?: string; key: string }
  | {
      type: 'question';
      options: string[];
      title?: string;
      optional?: boolean;
      questions?: Question[];
      selectedOption?: string;
      questionAnswers?: Record<string, string>;
      key: string;
    }
  | {
      type: 'error';
      content: string;
      errorCode?: string;
      toolName?: string;
      toolParams?: Record<string, any>;
      key: string;
    }
  | { type: 'warning'; label: string; message: string; key: string }
  | { type: 'thinking'; content: string; key: string }
  | { type: 'response_number'; content: string; key: string };

/**
 * ContentBlock for parser - same as GroupType but without 'key' field
 * Used by ResponseParser to build content blocks before key assignment
 */
export type ContentBlock =
  | { type: 'markdown'; content: string }
  | { type: 'code'; content: string; language: string }
  | {
      type: 'question';
      options: string[];
      title?: string;
      optional?: boolean;
      questions?: Question[];
      selectedOption?: string;
      questionAnswers?: Record<string, any>;
    }
  | { type: 'tool'; action: ToolAction; actionIndex?: number }
  | { type: 'thinking'; content: string }
  | {
      type: 'error';
      content: string;
      errorCode?: string;
      toolName?: string;
      toolParams?: Record<string, any>;
    };

// ============= RENDERER PROPS =============

/**
 * Common props shared across all renderer components
 */
export interface BaseRendererProps {
  action: ToolAction;
  actionIndex: number;
  messageId: string;
  isActionClicked: boolean;
  isActiveGroup?: boolean;
  isLastMessage?: boolean;
  isLastItemInList?: boolean;
  isRestored?: boolean;
  toolOutputs?: ToolOutputs;
  allMessages?: Message[];
  fileStatsMap: Record<string, { lines: number; loading: boolean }>;
  onToolClick: (
    action: ToolAction,
    messageId: string,
    index: number,
    type: (typeof TOOL_ACTION_TYPES)[keyof typeof TOOL_ACTION_TYPES],
  ) => void;
  conversationId?: string;
}

/**
 * Props for renderers that support merged actions (write, replace)
 */
export interface MergedRendererProps extends BaseRendererProps {
  mergedItems?: { action: ToolAction; index: number }[];
  singleLineReviewActions?: Record<string, { action: any; actionId: string; messageId: string }>;
  onConfirmSingleLineAction?: (actionId: string) => void;
  onRejectSingleLineAction?: (actionId: string) => void;
  rejectedActions?: Set<string>;
}

/**
 * Diagnostic information from language server
 */
export interface Diagnostic {
  severity: string;
  message: string;
  line: number;
  column: number;
  source?: string;
  code?: string | number;
}

/**
 * Diff statistics for replace/revert operations
 */
export interface DiffStats {
  added: number;
  removed: number;
}

/**
 * File tree node structure
 */
export interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
}
