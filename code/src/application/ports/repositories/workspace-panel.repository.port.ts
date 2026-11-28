import type { WorkspacePanelRecord } from '../../../domain/session/session.types';

export interface WorkspacePanelInput {
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

export interface WorkspacePanelRepositoryPort {
  listAll(): WorkspacePanelRecord[];
  listBySession(sessionId: string): WorkspacePanelRecord[];
  replaceForSession(sessionId: string, panels: WorkspacePanelInput[]): void;
}