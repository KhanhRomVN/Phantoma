import path from 'path';
import { projectRepository } from '../repositories/project.repository';
import { sessionRepository } from '../repositories/session.repository';
import {
  workspacePanelRepository,
  type WorkspacePanelInput,
} from '../repositories/workspace-panel.repository';
import { worktreeRepository } from '../repositories/worktree.repository';
import { found, requireString } from '../utils/guard';
import { AppError, newId } from '../utils/http';
import { detectBranch } from './worktree.service';

export interface SessionInput {
  id?: string;
  worktreeId?: string;
  projectId?: string;
  worktreePath?: string;
  title?: string;
}

// ASSUMED: worktree chưa kịp sync (saveAll debounce) thì tự tạo theo (projectId, worktreePath)
async function resolveWorktreeId(input: SessionInput): Promise<string> {
  if (input.worktreeId) return found(worktreeRepository.get(input.worktreeId), 'worktree').id;
  const projectId = requireString(input.projectId, 'projectId');
  const resolved = path.resolve(requireString(input.worktreePath, 'worktreePath'));
  found(projectRepository.get(projectId), 'project');
  const existing = worktreeRepository.findByPath(resolved);
  if (existing) {
    if (existing.projectId !== projectId)
      throw new AppError('worktree belongs to another project', 409);
    return existing.id;
  }
  const id = newId();
  worktreeRepository.insert({
    id,
    projectId,
    path: resolved,
    branch: await detectBranch(resolved),
    visible: true,
    searchTerm: '',
  });
  return id;
}

export const sessionService = {
  list: () => sessionRepository.listAll(),

  get: (id: string) => found(sessionRepository.get(id), 'session'),

  // Mỗi worktree chỉ có 1 session: tạo mới sẽ thay thế session cũ
  create: async (input: SessionInput) => {
    const worktreeId = await resolveWorktreeId(input);
    const id = input.id ?? newId();
    sessionRepository.transaction(() => {
      sessionRepository.removeByWorktree(worktreeId);
      sessionRepository.insert({ id, worktreeId, title: input.title || 'New session' });
    });
    return sessionService.get(id);
  },

  update: (id: string, input: SessionInput) => {
    found(sessionRepository.get(id), 'session');
    sessionRepository.update(id, { title: input.title });
    return sessionService.get(id);
  },

  saveWorkspace: (
    id: string,
    input: { panels?: WorkspacePanelInput[]; layout?: unknown; activePanelId?: string | null },
  ) => {
    const session = found(sessionRepository.get(id), 'session');
    if (input.panels !== undefined && !Array.isArray(input.panels)) {
      throw new AppError('panels must be an array', 400);
    }
    sessionRepository.transaction(() => {
      if (input.panels) {
        for (const p of input.panels) {
          requireString(p.id, 'panel.id');
          requireString(p.type, 'panel.type');
        }
        workspacePanelRepository.replaceForSession(id, input.panels);
      }
      sessionRepository.saveLayout(
        id,
        input.layout === undefined ? session.layout : input.layout,
        input.activePanelId === undefined ? session.activePanelId : input.activePanelId,
      );
    });
    return { ...sessionService.get(id), panels: workspacePanelRepository.listBySession(id) };
  },

  remove: (id: string) => {
    found(sessionRepository.get(id), 'session');
    return { deleted: sessionRepository.remove(id) };
  },
};
