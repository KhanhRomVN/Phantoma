import path from 'path';
import { runGit } from '../infra/git-runner';
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

export async function detectBranch(cwd: string): Promise<string> {
  const res = await runGit(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
  if (res.error) return '';
  const out = res.stdout.trim();
  return out === 'HEAD' ? '' : out;
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

  create: async (projectId: string, input: WorktreeInput) => {
    found(projectRepository.get(projectId), 'project');
    const id = newId();
    const resolved = path.resolve(requireString(input.path, 'path'));
    const branch = input.branch || (await detectBranch(resolved));
    worktreeRepository.insert({
      id,
      projectId,
      path: resolved,
      branch,
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