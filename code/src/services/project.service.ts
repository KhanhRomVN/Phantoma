import fs from 'fs';
import path from 'path';
import { getConfig } from '../config/server.config';
import type {
  ProjectWithWorktrees,
  WorkspacePanelRecord,
  Worktree,
  WorktreeWithSession,
} from '../domain/mappers';
import { projectRepository } from '../repositories/project.repository';
import { sessionRepository } from '../repositories/session.repository';
import { workspacePanelRepository } from '../repositories/workspace-panel.repository';
import { worktreeRepository } from '../repositories/worktree.repository';
import { found, requireString } from '../utils/guard';
import { newId } from '../utils/http';
import { detectBranch, type WorktreeInput } from './worktree.service';

export interface ProjectInput {
  id?: string;
  name?: string;
  logo?: string | null;
  repositoryUrl?: string | null;
  groupId?: string | null;
  sortOrder?: number;
  worktrees?: WorktreeInput[];
}

function attachSessions(list: Worktree[]): WorktreeWithSession[] {
  const byWorktree = new Map(sessionRepository.listAll().map((s) => [s.worktreeId, s]));
  const panelsBySession = new Map<string, WorkspacePanelRecord[]>();
  for (const p of workspacePanelRepository.listAll()) {
    panelsBySession.set(p.sessionId, [...(panelsBySession.get(p.sessionId) ?? []), p]);
  }
  return list.map((w) => {
    const s = byWorktree.get(w.id);
    return { ...w, session: s ? { ...s, panels: panelsBySession.get(s.id) ?? [] } : null };
  });
}

function withWorktrees(id: string): ProjectWithWorktrees {
  const project = found(projectRepository.get(id), 'project');
  return { ...project, worktrees: attachSessions(worktreeRepository.listByProject(id)) };
}

function syncWorktrees(projectId: string, items: WorktreeInput[]): void {
  const keep = new Set<string>();
  for (const item of items) {
    const resolved = path.resolve(requireString(item.path, 'worktree.path'));
    const existing = worktreeRepository.findByPath(resolved);
    if (existing && existing.projectId !== projectId) continue;
    if (existing) {
      worktreeRepository.update(existing.id, {
        branch: item.branch ?? (existing.branch || detectBranch(resolved)),
        visible: item.visible,
        searchTerm: item.searchTerm,
      });
      keep.add(existing.id);
    } else {
      const id = newId();
      worktreeRepository.insert({
        id,
        projectId,
        path: resolved,
        branch: item.branch || detectBranch(resolved),
        visible: item.visible ?? true,
        searchTerm: item.searchTerm ?? '',
      });
      keep.add(id);
    }
  }
  for (const w of worktreeRepository.listByProject(projectId)) {
    if (!keep.has(w.id)) worktreeRepository.remove(w.id);
  }
}

function removeProjectDir(id: string): void {
  fs.rmSync(path.join(getConfig().dataDir, id), { recursive: true, force: true });
}

export const projectService = {
  list: (): ProjectWithWorktrees[] => {
    const byProject = new Map<string, ReturnType<typeof worktreeRepository.listAll>>();
    for (const w of worktreeRepository.listAll()) {
      byProject.set(w.projectId, [...(byProject.get(w.projectId) ?? []), w]);
    }
    const all = attachSessions(worktreeRepository.listAll());
    const withSessions = new Map(all.map((w) => [w.id, w]));
    return projectRepository.list().map((p) => ({
      ...p,
      worktrees: (byProject.get(p.id) ?? []).map((w) => withSessions.get(w.id)!),
    }));
  },

  get: (id: string) => withWorktrees(id),

  create: (input: ProjectInput) => {
    const id = input.id ?? newId();
    projectRepository.transaction(() => {
      projectRepository.insert({
        id,
        name: requireString(input.name, 'name'),
        logo: input.logo ?? null,
        repositoryUrl: input.repositoryUrl ?? null,
        groupId: input.groupId ?? null,
        sortOrder: input.sortOrder ?? projectRepository.nextSortOrder(),
      });
      if (input.worktrees?.length) syncWorktrees(id, input.worktrees);
    });
    return withWorktrees(id);
  },

  update: (id: string, input: ProjectInput) => {
    found(projectRepository.get(id), 'project');
    projectRepository.transaction(() => {
      projectRepository.update(id, { name: input.name, logo: input.logo, repositoryUrl: input.repositoryUrl, groupId: input.groupId, sortOrder: input.sortOrder });
      if (input.worktrees) syncWorktrees(id, input.worktrees);
    });
    return withWorktrees(id);
  },

  saveAll: (items: ProjectInput[]) => {
    projectRepository.transaction(() => {
      const keep = new Set<string>();
      items.forEach((item, index) => {
        const id = item.id ?? newId();
        keep.add(id);
        const patch = { name: item.name, logo: item.logo, repositoryUrl: item.repositoryUrl, groupId: item.groupId, sortOrder: item.sortOrder ?? index + 1 };
        if (projectRepository.exists(id)) projectRepository.update(id, patch);
        else projectRepository.insert({ id, name: requireString(item.name, 'name'), logo: item.logo ?? null, repositoryUrl: item.repositoryUrl ?? null, groupId: item.groupId ?? null, sortOrder: patch.sortOrder });
        if (item.worktrees) syncWorktrees(id, item.worktrees);
      });
      for (const p of projectRepository.list()) {
        if (keep.has(p.id)) continue;
        projectRepository.remove(p.id);
        removeProjectDir(p.id);
      }
    });
    return projectService.list();
  },

  remove: (id: string) => {
    found(projectRepository.get(id), 'project');
    const deleted = projectRepository.remove(id);
    removeProjectDir(id);
    return { deleted };
  },
};