import path from 'path';
import { AppError } from '../../errors/app.error';
import type { GitBranchPort } from '../../ports/git-branch.port';
import type { IdGeneratorPort } from '../../ports/id-generator.port';
import type { ProjectRepositoryPort } from '../../ports/repositories/project.repository.port';
import type { WorktreeRepositoryPort } from '../../ports/repositories/worktree.repository.port';
import { found, requireString } from '../../validation/validation';

export interface WorktreeInput {
  path?: string;
  branch?: string;
  visible?: boolean;
  searchTerm?: string;
}

export class WorktreeService {
  constructor(
    private readonly projects: ProjectRepositoryPort,
    private readonly worktrees: WorktreeRepositoryPort,
    private readonly git: GitBranchPort,
    private readonly ids: IdGeneratorPort,
  ) {}

  private ownedBy(projectId: string, id: string) {
    const worktree = found(this.worktrees.get(id), 'worktree');
    if (worktree.projectId !== projectId) throw new AppError('worktree not found', 404);
    return worktree;
  }

  list = (projectId: string) => {
    found(this.projects.get(projectId), 'project');
    return this.worktrees.listByProject(projectId);
  };

  get = (projectId: string, id: string) => this.ownedBy(projectId, id);

  create = async (projectId: string, input: WorktreeInput) => {
    found(this.projects.get(projectId), 'project');
    const id = this.ids.newId();
    const resolved = path.resolve(requireString(input.path, 'path'));
    const branch = input.branch || (await this.git.detectBranch(resolved));
    this.worktrees.insert({
      id,
      projectId,
      path: resolved,
      branch,
      visible: input.visible ?? true,
      searchTerm: input.searchTerm ?? '',
    });
    return found(this.worktrees.get(id), 'worktree');
  };

  update = (projectId: string, id: string, input: WorktreeInput) => {
    this.ownedBy(projectId, id);
    const patch: Record<string, unknown> = { ...input };
    if (input.path !== undefined) patch.path = path.resolve(requireString(input.path, 'path'));
    this.worktrees.update(id, patch);
    return found(this.worktrees.get(id), 'worktree');
  };

  remove = (projectId: string, id: string) => {
    this.ownedBy(projectId, id);
    return { deleted: this.worktrees.remove(id) };
  };
}