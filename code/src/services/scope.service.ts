import { scopeRepository } from '../repositories/scope.repository';
import { worktreeRepository } from '../repositories/worktree.repository';
import { found, requireString } from '../utils/guard';
import { newId } from '../utils/http';
import { resolveDefaultBranch } from './git/default-branch';
import type { Scope } from '../domain/mappers';

export interface ScopeInput {
  path: string;
}

/**
 * Default branch không cần scope: nếu worktree đang ở default branch mà có scope thì xóa hết.
 * Trả về true nếu worktree là default branch.
 */
const purgeIfDefaultBranch = async (worktreeId: string): Promise<boolean> => {
  const worktree = found(worktreeRepository.get(worktreeId), 'worktree');
  const { name } = await resolveDefaultBranch(worktree.path);
  const isDefault = !!name && name === worktree.branch;
  if (isDefault) {
    const removed = scopeRepository.removeByWorktree(worktreeId);
  }
  return isDefault;
};

export const scopeService = {
  list: async (worktreeId: string): Promise<Scope[]> => {
    found(worktreeRepository.get(worktreeId), 'worktree');
    await purgeIfDefaultBranch(worktreeId);
    return scopeRepository.listByWorktree(worktreeId);
  },

  get: (worktreeId: string, scopeId: string): Scope => {
    found(worktreeRepository.get(worktreeId), 'worktree');
    const scope = found(scopeRepository.get(scopeId), 'scope');
    if (scope.worktreeId !== worktreeId) {
      throw new Error('scope does not belong to this worktree');
    }
    return scope;
  },

  set: async (worktreeId: string, paths: string[]): Promise<Scope[]> => {
    found(worktreeRepository.get(worktreeId), 'worktree');
    if (await purgeIfDefaultBranch(worktreeId)) return [];
    const keep = new Set<string>();
    for (const p of paths) {
      const path = requireString(p, 'path');
      const existing = scopeRepository.listByWorktree(worktreeId).find((s) => s.path === path);
      if (existing) {
        keep.add(existing.id);
      } else {
        const id = newId();
        scopeRepository.insert({ id, worktreeId, path });
        keep.add(id);
      }
    }
    for (const s of scopeRepository.listByWorktree(worktreeId)) {
      if (!keep.has(s.id)) scopeRepository.remove(s.id);
    }
    return scopeRepository.listByWorktree(worktreeId);
  },

  remove: (worktreeId: string, scopeId: string) => {
    found(worktreeRepository.get(worktreeId), 'worktree');
    const scope = found(scopeRepository.get(scopeId), 'scope');
    if (scope.worktreeId !== worktreeId) {
      throw new Error('scope does not belong to this worktree');
    }
    const deleted = scopeRepository.remove(scopeId);
    return { deleted };
  },

  purgeAllDefaultBranches: async (): Promise<number> => {
    let count = 0;
    for (const w of worktreeRepository.listAll()) {
      if (await purgeIfDefaultBranch(w.id).catch(() => false)) count++;
    }
    return count;
  },
};
