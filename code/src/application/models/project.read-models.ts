import type { Project, Worktree } from '../../domain/project/project.types';
import type { Session, WorkspacePanelRecord } from '../../domain/session/session.types';
import type { Scope } from '../../domain/scope/scope.types';

// Read models for query results

export type SessionWithWorkspace = Session & { panels: WorkspacePanelRecord[] };
export type WorktreeWithSession = Worktree & { session: SessionWithWorkspace | null };
export type ProjectWithWorktrees = Project & { worktrees: WorktreeWithSession[] };
export type WorktreeWithScopes = Worktree & { scopes: Scope[] };