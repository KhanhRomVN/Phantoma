import type { IdGeneratorPort } from '../../ports/id-generator.port';
import type { GitBranchPort } from '../../ports/git-branch.port';
import type { ScopeRepositoryPort } from '../../ports/repositories/scope.repository.port';
import type { WorktreeRepositoryPort } from '../../ports/repositories/worktree.repository.port';
import { found, requireString } from '../../validation/validation';
import type { Scope } from '../../../domain/scope/scope.types';

export interface ScopeInput {
  path: string;
}

export class ScopeService {
  constructor(
    private readonly scopes: ScopeRepositoryPort,
    private readonly worktrees: WorktreeRepositoryPort,
    private readonly git: GitBranchPort,
    private readonly ids: IdGeneratorPort,
  ) {}

  /**
   * Default branch không cần scope: nếu worktree đang ở default branch mà có scope thì xóa hết.
   * Trả về true nếu worktree là default branch.
   */
  private async purgeIfDefaultBranch(worktreeId: string): Promise<boolean> {
    const worktree = found(this.worktrees.get(worktreeId), 'worktree');
    const { name } = await this.git.resolveDefaultBranch(worktree.path);
    const isDefault = !!name && name === worktree.branch;
    if (isDefault) {
      this.scopes.removeByWorktree(worktreeId);
    }
    return isDefault;
  }

  list = async (worktreeId: string): Promise<Scope[]> => {
    found(this.worktrees.get(worktreeId), 'worktree');
    await this.purgeIfDefaultBranch(worktreeId);
    return this.scopes.listByWorktree(worktreeId);
  };

  get = (worktreeId: string, scopeId: string): Scope => {
    found(this.worktrees.get(worktreeId), 'worktree');
    const scope = found(this.scopes.get(scopeId), 'scope');
    if (scope.worktreeId !== worktreeId) {
      throw new Error('scope does not belong to this worktree');
    }
    return scope;
  };

  set = async (worktreeId: string, paths: string[]): Promise<Scope[]> => {
    found(this.worktrees.get(worktreeId), 'worktree');
    if (await this.purgeIfDefaultBranch(worktreeId)) return [];
    const keep = new Set<string>();
    for (const p of paths) {
      const path = requireString(p, 'path');
      const existing = this.scopes.listByWorktree(worktreeId).find((s) => s.path === path);
      if (existing) {
        keep.add(existing.id);
      } else {
        const id = this.ids.newId();
        this.scopes.insert({ id, worktreeId, path });
        keep.add(id);
      }
    }
    for (const s of this.scopes.listByWorktree(worktreeId)) {
      if (!keep.has(s.id)) this.scopes.remove(s.id);
    }
    return this.scopes.listByWorktree(worktreeId);
  };

  remove = (worktreeId: string, scopeId: string) => {
    found(this.worktrees.get(worktreeId), 'worktree');
    const scope = found(this.scopes.get(scopeId), 'scope');
    if (scope.worktreeId !== worktreeId) {
      throw new Error('scope does not belong to this worktree');
    }
    const deleted = this.scopes.remove(scopeId);
    return { deleted };
  };

  purgeAllDefaultBranches = async (): Promise<number> => {
    let count = 0;
    for (const w of this.worktrees.listAll()) {
      if (await this.purgeIfDefaultBranch(w.id).catch(() => false)) count++;
    }
    return count;
  };
}