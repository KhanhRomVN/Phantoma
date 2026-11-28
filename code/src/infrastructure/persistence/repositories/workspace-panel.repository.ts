import { getDb } from '../sqlite/connection';
import { mapWorkspacePanel, type Row } from '../mappers/mappers';
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

export const workspacePanelRepository = {
  listAll: (): WorkspacePanelRecord[] =>
    (getDb().prepare('SELECT * FROM workspace_panels ORDER BY session_id, sort_order').all() as Row[]).map(
      mapWorkspacePanel,
    ),

  listBySession: (sessionId: string): WorkspacePanelRecord[] =>
    (
      getDb()
        .prepare('SELECT * FROM workspace_panels WHERE session_id = ? ORDER BY sort_order')
        .all(sessionId) as Row[]
    ).map(mapWorkspacePanel),

  replaceForSession: (sessionId: string, panels: WorkspacePanelInput[]): void => {
    const db = getDb();
    const insert = db.prepare(
      `INSERT OR REPLACE INTO workspace_panels
        (id, session_id, type, title, content, file_path, cwd, provider_id, zencli_conversation_id, zencli_last_active_at, agent_conversation_id, agent_title, workflow_agent_id, pinned, sort_order)
       VALUES (@id, @session_id, @type, @title, @content, @file_path, @cwd, @provider_id, @zencli_conversation_id, @zencli_last_active_at, @agent_conversation_id, @agent_title, @workflow_agent_id, @pinned, @sort_order)`,
    );
    db.transaction(() => {
      db.prepare('DELETE FROM workspace_panels WHERE session_id = ?').run(sessionId);
      panels.forEach((p, index) => {
        insert.run({
          id: p.id,
          session_id: sessionId,
          type: p.type,
          title: p.title ?? '',
          content: p.content ?? null,
          file_path: p.filePath ?? null,
          cwd: p.cwd ?? null,
          provider_id: p.providerId ?? null,
          zencli_conversation_id: p.zencliConversationId ?? null,
          zencli_last_active_at: p.zencliLastActiveAt ?? null,
          agent_conversation_id: p.agentConversationId ?? null,
          agent_title: p.agentTitle ?? null,
          workflow_agent_id: p.workflowAgentId ?? null,
          pinned: p.pinned ? 1 : 0,
          sort_order: index,
        });
      });
    })();
  },
};