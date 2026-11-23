import { useState, useEffect, useCallback } from 'react';
import { useCodeStore } from '../../../shared/stores/code.store';
import type { SessionInfo } from '../types/session.types';
import type { ProjectExtended } from '../types/project-panel.types';
import {
  LAYOUT_STORAGE_KEY,
  applyProjectLayout,
  seedProject,
} from '../services/project-layout.service';

// ASSUMED: giữ state `projects` cục bộ (chứa field UI-only) — chưa gộp vào store trong task này
export function useProjectMutations() {
  const rawProjects = useCodeStore((s) => s.projects);

  const [projects, setProjects] = useState<ProjectExtended[]>(() =>
    applyProjectLayout(rawProjects.map(seedProject)),
  );

  useEffect(() => {
    setProjects((prev) => {
      const byId = new Map(rawProjects.map((p) => [p.id, p]));
      const kept = prev
        .filter((p) => byId.has(p.id))
        .map((p) => {
          const fresh = byId.get(p.id)!;
          return {
            ...fresh,
            branches: fresh.branches ?? [],
            defaultBranch: p.defaultBranch || 'main',
            hidden: p.hidden ?? false,
            color: p.color || '#8b91a1',
            groupId: p.groupId ?? null,
            files: fresh.files ?? [],
            services: fresh.services ?? [],
            agentGroups: fresh.agentGroups ?? [],
            mcps: fresh.mcps ?? [],
            activeWorkspacePanelId: fresh.activeWorkspacePanelId ?? null,
            workspacePanels: fresh.workspacePanels ?? [],
            expandedFolderIds: fresh.expandedFolderIds ?? [],
            openFiles: fresh.openFiles ?? [],
            fileDisplayNames: fresh.fileDisplayNames ?? {},
            fileNodeMap: fresh.fileNodeMap ?? {},
            activeFileTabId: fresh.activeFileTabId ?? null,
            currentServiceId: fresh.currentServiceId ?? null,
            currentFileId: fresh.currentFileId ?? null,
            bottomPanelTab: fresh.bottomPanelTab ?? 'output',
            isBottomPanelOpen: fresh.isBottomPanelOpen ?? true,
            activityPanelTab: fresh.activityPanelTab ?? 'explore',
            unsavedFiles: new Set<string>(),
            originalContents: {},
            dirVersions: fresh.dirVersions ?? {},
            designs: fresh.designs ?? [],
          } as ProjectExtended;
        });
      const known = new Set(prev.map((p) => p.id));
      const added = rawProjects
        .map((p, i) => ({ p, i }))
        .filter(({ p }) => !known.has(p.id))
        .map(({ p, i }) => seedProject(p, i));
      return [...kept, ...applyProjectLayout(added)];
    });
  }, [rawProjects]);

  useEffect(() => {
    if (projects.length === 0) return;
    try {
      window.localStorage.setItem(
        LAYOUT_STORAGE_KEY,
        JSON.stringify({
          order: projects.map((p) => p.id),
          groupIds: Object.fromEntries(projects.map((p) => [p.id, p.groupId ?? null])),
        }),
      );
    } catch (e) {
      console.error('Failed to save project layout to storage:', e);
    }
  }, [projects]);

  const patchProject = useCallback((id: string, fn: (p: ProjectExtended) => ProjectExtended) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? fn(p) : p)));
  }, []);

  const patchSession = useCallback((sessionId: string, fn: (s: SessionInfo) => SessionInfo) => {
    setProjects((prev) =>
      prev.map((p) => ({
        ...p,
        branches: p.branches.map((b) => ({
          ...b,
          sessions: b.sessions.map((s) => (s.id === sessionId ? fn(s) : s)),
        })),
      })),
    );
  }, []);

  return { projects, setProjects, patchProject, patchSession };
}