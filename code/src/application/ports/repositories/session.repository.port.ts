import type { Session } from '../../../domain/session/session.types';

export interface SessionRecordInput {
  id: string;
  worktreeId: string;
  title: string;
}

export interface SessionRepositoryPort {
  listAll(): Session[];
  get(id: string): Session | null;
  getByWorktree(worktreeId: string): Session | null;
  insert(s: SessionRecordInput): void;
  update(id: string, patch: { title?: string }): boolean;
  saveLayout(id: string, layout: unknown, activePanelId: string | null): boolean;
  remove(id: string): boolean;
  removeByWorktree(worktreeId: string): number;
  transaction<T>(fn: () => T): T;
}