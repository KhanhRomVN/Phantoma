import { scopeRepository } from '../repositories/scope.repository';
import { worktreeRepository } from '../repositories/worktree.repository';
import { found, requireString } from '../utils/guard';
import { newId } from '../utils/http';
import type { Scope } from '../domain/mappers';

export interface ScopeInput {
  path: string;
}

export const scopeService = {
  list: (worktreeId: string): Scope[] => {
    found(worktreeRepository.get(worktreeId), 'worktree');
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

  set: (worktreeId: string, paths: string[]): Scope[] => {
    found(worktreeRepository.get(worktreeId), 'worktree');
    const keep = new Set<string>();
    for (const p of paths) {
      const path = requireString(p, 'path');
      const existing = scopeRepository
        .listByWorktree(worktreeId)
        .find((s) => s.path === path);
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
};