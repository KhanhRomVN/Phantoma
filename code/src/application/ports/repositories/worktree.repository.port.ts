import type { Worktree } from '../../../domain/project/project.types';

export interface WorktreeRecordInput {
  id: string;
  projectId: string;
  path: string;
  branch: string;
  visible: boolean;
  searchTerm: string;
}

export interface WorktreeRepositoryPort {
  listAll(): Worktree[];
  listByProject(projectId: string): Worktree[];
  get(id: string): Worktree | null;
  findByPath(p: string): Worktree | null;
  insert(w: WorktreeRecordInput): void;
  update(id: string, patch: Record<string, unknown>): boolean;
  remove(id: string): boolean;
}