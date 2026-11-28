import path from 'path';
import { AppError } from '../../errors/app.error';
import type { GitBranchPort } from '../../ports/git-branch.port';
import type { IdGeneratorPort } from '../../ports/id-generator.port';
import type { ProjectRepositoryPort } from '../../ports/repositories/project.repository.port';
import type { SessionRepositoryPort } from '../../ports/repositories/session.repository.port';
import type {
  WorkspacePanelInput,
  WorkspacePanelRepositoryPort,
} from '../../ports/repositories/workspace-panel.repository.port';
import type { WorktreeRepositoryPort } from '../../ports/repositories/worktree.repository.port';
import { found, requireString } from '../../validation/validation';

export interface SessionInput {
  id?: string;
  worktreeId?: string;
  projectId?: string;
  worktreePath?: string;
  title?: string;
}

export class SessionService {
  constructor(
    private readonly projects: ProjectRepositoryPort,
    private readonly sessions: SessionRepositoryPort,
    private readonly panels: WorkspacePanelRepositoryPort,
    private readonly worktrees: WorktreeRepositoryPort,
    private readonly git: GitBranchPort,
    private readonly ids: IdGeneratorPort,
  ) {}

  // ASSUMED: worktree chưa kịp sync (saveAll debounce) thì tự tạo theo (projectId, worktreePath)
  private async resolveWorktreeId(input: SessionInput): Promise<string> {
    if (input.worktreeId) return found(this.worktrees.get(input.worktreeId), 'worktree').id;
    const projectId = requireString(input.projectId, 'projectId');
    const resolved = path.resolve(requireString(input.worktreePath, 'worktreePath'));
    found(this.projects.get(projectId), 'project');
    const existing = this.worktrees.findByPath(resolved);
    if (existing) {
      if (existing.projectId !== projectId)
        throw new AppError('worktree belongs to another project', 409);
      return existing.id;
    }
    const id = this.ids.newId();
    this.worktrees.insert({
      id,
      projectId,
      path: resolved,
      branch: await this.git.detectBranch(resolved),
      visible: true,
      searchTerm: '',
    });
    return id;
  }

  list = () => this.sessions.listAll();

  get = (id: string) => found(this.sessions.get(id), 'session');

  // Mỗi worktree chỉ có 1 session: tạo mới sẽ thay thế session cũ
  create = async (input: SessionInput) => {
    const worktreeId = await this.resolveWorktreeId(input);
    const id = input.id ?? this.ids.newId();
    this.sessions.transaction(() => {
      this.sessions.removeByWorktree(worktreeId);
      this.sessions.insert({ id, worktreeId, title: input.title || 'New session' });
    });
    return this.get(id);
  };

  update = (id: string, input: SessionInput) => {
    found(this.sessions.get(id), 'session');
    this.sessions.update(id, { title: input.title });
    return this.get(id);
  };

  saveWorkspace = (
    id: string,
    input: { panels?: WorkspacePanelInput[]; layout?: unknown; activePanelId?: string | null },
  ) => {
    const session = found(this.sessions.get(id), 'session');
    if (input.panels !== undefined && !Array.isArray(input.panels)) {
      throw new AppError('panels must be an array', 400);
    }
    this.sessions.transaction(() => {
      if (input.panels) {
        for (const p of input.panels) {
          requireString(p.id, 'panel.id');
          requireString(p.type, 'panel.type');
        }
        this.panels.replaceForSession(id, input.panels);
      }
      this.sessions.saveLayout(
        id,
        input.layout === undefined ? session.layout : input.layout,
        input.activePanelId === undefined ? session.activePanelId : input.activePanelId,
      );
    });
    return { ...this.get(id), panels: this.panels.listBySession(id) };
  };

  remove = (id: string) => {
    found(this.sessions.get(id), 'session');
    return { deleted: this.sessions.remove(id) };
  };
}