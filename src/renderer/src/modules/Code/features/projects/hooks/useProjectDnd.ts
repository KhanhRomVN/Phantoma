import { useRef, useState, useCallback } from 'react';
import type { Dispatch, DragEvent as ReactDragEvent, SetStateAction } from 'react';
import { getVisibleBranches } from '../utils/project-card.util';
import type { ProjectExtended, GroupInfo } from '../types/project-panel.types';
import {
  clearDragMarks,
  attachProjectDragImage,
  attachGroupDragGhost,
} from '../utils/dnd.util';
import { UNGROUP_ID } from './useProjectGroups';

interface UseProjectDndArgs {
  projects: ProjectExtended[];
  shownProjects: ProjectExtended[];
  groups: GroupInfo[];
  setGroups: Dispatch<SetStateAction<GroupInfo[]>>;
  setProjects: Dispatch<SetStateAction<ProjectExtended[]>>;
  patchProject: (id: string, fn: (p: ProjectExtended) => ProjectExtended) => void;
  showToast: (msg: string) => void;
  ungroupIndex: number;
  setUngroupIndex: Dispatch<SetStateAction<number>>;
}

export function useProjectDnd({
  projects,
  shownProjects,
  groups,
  setGroups,
  setProjects,
  patchProject,
  showToast,
  ungroupIndex,
  setUngroupIndex,
}: UseProjectDndArgs) {
  const dragRef = useRef<{
    type: 'project' | 'branch' | 'group';
    projectId?: string;
    branchName?: string;
    groupId?: string;
    el: HTMLElement | null;
  } | null>(null);

  const [isGlobalDragging, setIsGlobalDragging] = useState(false);

  const handleDragStart = useCallback(
    (
      e: ReactDragEvent,
      type: 'project' | 'branch' | 'group',
      idOrPid: string,
      secondaryArg?: string,
    ) => {
      let count = 0;
      if (type === 'project') {
        count = shownProjects.length;
      } else if (type === 'group') {
        count = groups.length + 1;
      } else if (type === 'branch') {
        const proj = projects.find((p) => p.id === idOrPid);
        count = proj ? getVisibleBranches(proj).length : 0;
      }

      if (count < 2) {
        e.preventDefault();
        return;
      }

      const el = e.currentTarget as HTMLElement;

      let projectId: string | undefined;
      let branchName: string | undefined;
      let groupId: string | undefined;

      if (type === 'project') {
        projectId = idOrPid;
      } else if (type === 'branch') {
        projectId = idOrPid;
        branchName = secondaryArg;
      } else if (type === 'group') {
        groupId = idOrPid;
      }

      dragRef.current = { type, projectId, branchName, groupId, el };
      e.dataTransfer.setData('text/plain', idOrPid);
      e.dataTransfer.effectAllowed = 'move';
      e.stopPropagation();
      el.classList.add('pp-dragging');

      if (type === 'project') attachProjectDragImage(el, e);
      if (type === 'group') attachGroupDragGhost(el, e);

      // Defer collapse: changing layout inside dragstart makes the browser cancel the drag for cards below the first one
      setTimeout(() => {
        if (!dragRef.current) return;
        el.style.opacity = '0.4';
        setIsGlobalDragging(true);
      }, 0);
    },
    [shownProjects, groups, projects],
  );

  const handleDragEnd = useCallback(() => {
    dragRef.current?.el?.classList.remove('pp-dragging');
    if (dragRef.current?.el) dragRef.current.el.style.opacity = '';
    dragRef.current = null;
    clearDragMarks();
    setIsGlobalDragging(false);
  }, []);

  const handleDragOver = useCallback((e: ReactDragEvent) => {
    const drag = dragRef.current;
    if (!drag) return;

    const target = e.currentTarget as HTMLElement;

    const zoneEl = target.closest('[data-gid], [data-pid], [data-branch]') as HTMLElement | null;

    if (!zoneEl) return;

    const targetGroupId = zoneEl.dataset.gid;
    const targetProjectId = zoneEl.dataset.pid;
    const targetBranchName = zoneEl.dataset.branch;

    let isValidDrop = false;

    if (drag.type === 'branch') {
      isValidDrop = !!targetBranchName && targetProjectId === drag.projectId && zoneEl !== drag.el;
    } else if (drag.type === 'project') {
      if (targetProjectId) {
        isValidDrop = zoneEl !== drag.el;
      } else if (targetGroupId) {
        isValidDrop = true;
      }
    } else if (drag.type === 'group') {
      if (targetGroupId) {
        isValidDrop = zoneEl !== drag.el;
      }
    }

    if (!isValidDrop) return;

    e.preventDefault();
    clearDragMarks();
    zoneEl.classList.add('pp-dragover');
    const isReorder = drag.type === 'branch' || drag.type === 'group' || !!targetProjectId;
    if (isReorder) {
      const r = zoneEl.getBoundingClientRect();
      zoneEl.dataset.dropPos = e.clientY > r.top + r.height / 2 ? 'after' : 'before';
    }
  }, []);

  const handleDrop = useCallback(
    (e: ReactDragEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      e.preventDefault();
      clearDragMarks();
      drag.el?.classList.remove('pp-dragging');
      if (drag.el) drag.el.style.opacity = '';
      dragRef.current = null;
      setIsGlobalDragging(false);

      const target = e.currentTarget as HTMLElement;
      const zoneEl = target.closest('[data-gid], [data-pid], [data-branch]') as HTMLElement | null;
      if (!zoneEl) return;

      const targetGroupId = zoneEl.dataset.gid;
      const targetProjectId = zoneEl.dataset.pid;
      const targetBranchName = zoneEl.dataset.branch;

      const dropRect = zoneEl.getBoundingClientRect();
      const dropAfter = e.clientY > dropRect.top + dropRect.height / 2;

      if (drag.type === 'branch' && targetBranchName && targetProjectId === drag.projectId) {
        patchProject(drag.projectId!, (p) => {
          const src = p.branches.findIndex((b) => b.name === drag.branchName);
          const dst = p.branches.findIndex((b) => b.name === targetBranchName);
          if (src < 0 || dst < 0 || src === dst) return p;
          const branches = [...p.branches];
          const [movedBranch] = branches.splice(src, 1);
          const at = branches.findIndex((b) => b.name === targetBranchName);
          branches.splice(at + (dropAfter ? 1 : 0), 0, movedBranch);
          return { ...p, branches };
        });
        return;
      }

      if (drag.type === 'project' && targetGroupId) {
        patchProject(drag.projectId!, (p) => ({
          ...p,
          groupId: targetGroupId === UNGROUP_ID ? null : targetGroupId,
        }));
        showToast(`Moved "${projects.find((pr) => pr.id === drag.projectId)?.name}" to group`);
        return;
      }

      if (drag.type === 'project' && targetProjectId) {
        setProjects((prev) => {
          const srcIdx = prev.findIndex((p) => p.id === drag.projectId);
          const tgtIdx = prev.findIndex((p) => p.id === targetProjectId);

          if (srcIdx < 0 || tgtIdx < 0 || srcIdx === tgtIdx) return prev;

          const next = [...prev];
          const [picked] = next.splice(srcIdx, 1);
          const moved = { ...picked, groupId: prev[tgtIdx].groupId ?? null };
          const newTgtIdx = next.findIndex((p) => p.id === targetProjectId);
          next.splice(newTgtIdx + (dropAfter ? 1 : 0), 0, moved);
          return next;
        });
        return;
      }

      if (drag.type === 'group' && targetGroupId) {
        const ids = groups.map((g) => g.id);
        ids.splice(Math.min(Math.max(ungroupIndex, 0), ids.length), 0, UNGROUP_ID);
        const srcIdx = ids.indexOf(drag.groupId!);
        const tgtIdx = ids.indexOf(targetGroupId);
        if (srcIdx < 0 || tgtIdx < 0 || srcIdx === tgtIdx) return;
        ids.splice(srcIdx, 1);
        const at = ids.indexOf(targetGroupId);
        ids.splice(at + (dropAfter ? 1 : 0), 0, drag.groupId!);
        const byId = new Map(groups.map((g) => [g.id, g]));
        setGroups(ids.filter((id) => id !== UNGROUP_ID).map((id) => byId.get(id)!));
        setUngroupIndex(ids.indexOf(UNGROUP_ID));
        return;
      }
    },
    [patchProject, projects, showToast, setProjects, setGroups, groups, ungroupIndex],
  );

  return {
    dragRef,
    isGlobalDragging,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop,
  };
}