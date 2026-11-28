import path from 'path';
import type { Worktree } from '../../../domain/project/project.types';
import type { ProjectWithWorktrees, WorktreeWithSession } from '../../models/project.read-models';
import type { WorkspacePanelRecord } from '../../../domain/session/session.types';
import type { GitBranchPort } from '../../ports/git-branch.port';
import type { IdGeneratorPort } from '../../ports/id-generator.port';
import type { ProjectStoragePort } from '../../ports/project-storage.port';
import type { ProjectRepositoryPort } from '../../ports/repositories/project.repository.port';
import type { SessionRepositoryPort } from '../../ports/repositories/session.repository.port';
import type { WorkspacePanelRepositoryPort } from '../../ports/repositories/workspace-panel.repository.port';
import type { WorktreeRepositoryPort } from '../../ports/repositories/worktree.repository.port';
import { found, requireString } from '../../validation/validation';
import type { WorktreeInput } from './worktree.service';

export interface ProjectInput {
  id?: string;
  name?: string;
  logo?: string | null;
  repositoryUrl?: string | null;
  groupId?: string | null;
  sortOrder?: number;
  worktrees?: WorktreeInput[];
}

export class ProjectService {
  constructor(
    private readonly projects: ProjectRepositoryPort,
    private readonly sessions: SessionRepositoryPort,
    private readonly panels: WorkspacePanelRepositoryPort,
    private readonly worktrees: WorktreeRepositoryPort,
    private readonly git: GitBranchPort,
    private readonly ids: IdGeneratorPort,
    private readonly storage: ProjectStoragePort,
  ) {}

  private attachSessions(list: Worktree[]): WorktreeWithSession[] {
    const byWorktree = new Map(this.sessions.listAll().map((s) => [s.worktreeId, s]));
    const panelsBySession = new Map<string, WorkspacePanelRecord[]>();
    for (const p of this.panels.listAll()) {
      panelsBySession.set(p.sessionId, [...(panelsBySession.get(p.sessionId) ?? []), p]);
    }
    return list.map((w) => {
      const s = byWorktree.get(w.id);
      return { ...w, session: s ? { ...s, panels: panelsBySession.get(s.id) ?? [] } : null };
    });
  }

  private withWorktrees(id: string): ProjectWithWorktrees {
    const project = found(this.projects.get(id), 'project');
    return { ...project, worktrees: this.attachSessions(this.worktrees.listByProject(id)) };
  }

  private async detectBranches(items: WorktreeInput[]): Promise<Map<string, string>> {
    const branches = new Map<string, string>();
    for (const item of items) {
      const resolved = path.resolve(requireString(item.path, 'worktree.path'));
      if (!item.branch) branches.set(resolved, await this.git.detectBranch(resolved));
    }
    return branches;
  }

  private syncWorktrees(projectId: string, items: WorktreeInput[], branches: Map<string, string>): void {
    const keep = new Set<string>();
    for (const item of items) {
      const resolved = path.resolve(requireString(item.path, 'worktree.path'));
      const existing = this.worktrees.findByPath(resolved);
      if (existing && existing.projectId !== projectId) continue;
      if (existing) {
        this.worktrees.update(existing.id, {
          branch: item.branch ?? (existing.branch || branches.get(resolved) || ''),
          visible: item.visible,
          searchTerm: item.searchTerm,
        });
        keep.add(existing.id);
      } else {
        const id = this.ids.newId();
        this.worktrees.insert({
          id,
          projectId,
          path: resolved,
          branch: item.branch || branches.get(resolved) || '',
          visible: item.visible ?? true,
          searchTerm: item.searchTerm ?? '',
        });
        keep.add(id);
      }
    }
    for (const w of this.worktrees.listByProject(projectId)) {
      if (!keep.has(w.id)) this.worktrees.remove(w.id);
    }
  }

  list = (): ProjectWithWorktrees[] => {
    const byProject = new Map<string, Worktree[]>();
    for (const w of this.worktrees.listAll()) {
      byProject.set(w.projectId, [...(byProject.get(w.projectId) ?? []), w]);
    }
    const all = this.attachSessions(this.worktrees.listAll());
    const withSessions = new Map(all.map((w) => [w.id, w]));
    return this.projects.list().map((p) => ({
      ...p,
      worktrees: (byProject.get(p.id) ?? []).map((w) => withSessions.get(w.id)!),
    }));
  };

  get = (id: string) => this.withWorktrees(id);

  create = async (input: ProjectInput) => {
    const id = input.id ?? this.ids.newId();
    const branches = await this.detectBranches(input.worktrees ?? []);
    this.projects.transaction(() => {
      this.projects.insert({
        id,
        name: requireString(input.name, 'name'),
        logo: input.logo ?? null,
        repositoryUrl: input.repositoryUrl ?? null,
        groupId: input.groupId ?? null,
        sortOrder: input.sortOrder ?? this.projects.nextSortOrder(),
      });
      if (input.worktrees?.length) this.syncWorktrees(id, input.worktrees, branches);
    });
    return this.withWorktrees(id);
  };

  update = async (id: string, input: ProjectInput) => {
    found(this.projects.get(id), 'project');
    const branches = await this.detectBranches(input.worktrees ?? []);
    this.projects.transaction(() => {
      this.projects.update(id, { name: input.name, logo: input.logo, repositoryUrl: input.repositoryUrl, groupId: input.groupId, sortOrder: input.sortOrder });
      if (input.worktrees) this.syncWorktrees(id, input.worktrees, branches);
    });
    return this.withWorktrees(id);
  };

  saveAll = async (items: ProjectInput[]) => {
    const branches = await this.detectBranches(items.flatMap((item) => item.worktrees ?? []));
    this.projects.transaction(() => {
      const keep = new Set<string>();
      items.forEach((item, index) => {
        const id = item.id ?? this.ids.newId();
        keep.add(id);
        const patch = { name: item.name, logo: item.logo, repositoryUrl: item.repositoryUrl, groupId: item.groupId, sortOrder: item.sortOrder ?? index + 1 };
        if (this.projects.exists(id)) this.projects.update(id, patch);
        else this.projects.insert({ id, name: requireString(item.name, 'name'), logo: item.logo ?? null, repositoryUrl: item.repositoryUrl ?? null, groupId: item.groupId ?? null, sortOrder: patch.sortOrder });
        if (item.worktrees) this.syncWorktrees(id, item.worktrees, branches);
      });
      for (const p of this.projects.list()) {
        if (keep.has(p.id)) continue;
        this.projects.remove(p.id);
        this.storage.removeProjectDir(p.id);
      }
    });
    return this.list();
  };

  remove = (id: string) => {
    found(this.projects.get(id), 'project');
    const deleted = this.projects.remove(id);
    this.storage.removeProjectDir(id);
    return { deleted };
  };
}