import type { Scope } from '../../../domain/scope/scope.types';

export interface ScopeRecordInput {
  id: string;
  worktreeId: string;
  path: string;
}

export interface ScopeRepositoryPort {
  listByWorktree(worktreeId: string): Scope[];
  get(id: string): Scope | null;
  insert(s: ScopeRecordInput): void;
  remove(id: string): boolean;
  removeByWorktree(worktreeId: string): number;
}