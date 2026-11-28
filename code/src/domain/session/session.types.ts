export interface Session {
  id: string;
  worktreeId: string;
  title: string;
  layout: unknown;
  activePanelId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspacePanelRecord {
  id: string;
  sessionId: string;
  type: string;
  title: string;
  content: string | null;
  filePath: string | null;
  cwd: string | null;
  providerId: string | null;
  zencliConversationId: string | null;
  zencliLastActiveAt: number | null;
  agentConversationId: string | null;
  agentTitle: string | null;
  workflowAgentId: string | null;
  pinned: boolean;
  sortOrder: number;
}