import { execFileSync } from 'child_process';
import path from 'path';
import { projectRepository } from '../repositories/project.repository';
import { worktreeRepository } from '../repositories/worktree.repository';
import { found, requireString } from '../utils/guard';
import { AppError, newId } from '../utils/http';

export interface WorktreeInput {
  path?: string;
  branch?: string;
  visible?: boolean;
  searchTerm?: string;
}

export function detectBranch(cwd: string): string {
  try {
    const out = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
      env: { ...process.env, GIT_CEILING_DIRECTORIES: path.dirname(cwd) },
    }).trim();
    return out === 'HEAD' ? '' : out;
  } catch {
    return '';
  }
}

function ownedBy(projectId: string, id: string) {
  const worktree = found(worktreeRepository.get(id), 'worktree');
  if (worktree.projectId !== projectId) throw new AppError('worktree not found', 404);
  return worktree;
}

export const worktreeService = {
  list: (projectId: string) => {
    found(projectRepository.get(projectId), 'project');
    return worktreeRepository.listByProject(projectId);
  },

  get: (projectId: string, id: string) => ownedBy(projectId, id),

  create: (projectId: string, input: WorktreeInput) => {
    found(projectRepository.get(projectId), 'project');
    const id = newId();
    const resolved = path.resolve(requireString(input.path, 'path'));
    worktreeRepository.insert({
      id,
      projectId,
      path: resolved,
      branch: input.branch || detectBranch(resolved),
      visible: input.visible ?? true,
      searchTerm: input.searchTerm ?? '',
    });
    return found(worktreeRepository.get(id), 'worktree');
  },

  update: (projectId: string, id: string, input: WorktreeInput) => {
    ownedBy(projectId, id);
    const patch: Record<string, unknown> = { ...input };
    if (input.path !== undefined) patch.path = path.resolve(requireString(input.path, 'path'));
    worktreeRepository.update(id, patch);
    return found(worktreeRepository.get(id), 'worktree');
  },

  remove: (projectId: string, id: string) => {
    ownedBy(projectId, id);
    return { deleted: worktreeRepository.remove(id) };
  },
};