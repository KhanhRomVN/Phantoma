/**
 * ------------------------------------------------------------------
 * Session API Types
 * ------------------------------------------------------------------
 * Kiểu dữ liệu session và workspace panel của Code server.
 *
 * Main types:
 * - CodeWorkspacePanel / CodeWorkspaceInput : Panel và input workspace
 * - CodeSession / CodeSessionInput          : Session và input tạo/cập nhật
 * ------------------------------------------------------------------
 */

// ─── Types ───────────────────────────────────────────────────────────────────
export interface CodeWorkspacePanel {
  id: string;
  type: string;
  title?: string;
  content?: string | null;
  filePath?: string | null;
  cwd?: string | null;
  providerId?: string | null;
  zencliConversationId?: string | null;
  zencliLastActiveAt?: number | null;
  agentConversationId?: string | null;
  agentTitle?: string | null;
  workflowAgentId?: string | null;
  pinned?: boolean;
}

export interface CodeWorkspaceInput {
  panels?: CodeWorkspacePanel[];
  layout?: unknown;
  activePanelId?: string | null;
}

export interface CodeSession {
  id: string;
  worktreeId: string;
  title: string;
  layout: unknown;
  activePanelId: string | null;
  panels?: CodeWorkspacePanel[];
  createdAt: string;
  updatedAt: string;
}

export interface CodeSessionInput {
  id?: string;
  worktreeId?: string;
  projectId?: string;
  worktreePath?: string;
  title?: string;
}