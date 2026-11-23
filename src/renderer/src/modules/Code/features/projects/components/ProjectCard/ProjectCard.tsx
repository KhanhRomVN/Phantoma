/**
 * ------------------------------------------------------------------
 * Project Card — aligned with ProjectPanel.html mockup
 * ------------------------------------------------------------------
 * Renders a single project item in the sidebar list:
 *  - Top row: colored project icon, name, hidden tag, kebab,
 *    Task Manager button, chevron + task-status count chips
 *  - Collapsed view: compact branch tree (max 5 rows, ranked by
 *    urgency) with agent avatars / process pill + footer summary
 *  - Expanded view: branch blocks with session cards
 * Includes drag-and-drop handlers and context menu triggers.
 * ------------------------------------------------------------------
 */

import { memo, useCallback, useEffect, useState, useMemo } from 'react';
import { useCodeStore } from '../../../../shared/stores/code.store';
import { useSessionTasks } from '../../hooks/useSessionTasks';
import { taskService, type StoredTask } from '../../../../shared/services/task.service';
import { GitPullRequest, ChevronRight, ChevronDown, Kanban, GitGraph } from 'lucide-react';

// ── Utils ─
import { cn } from '@renderer/utils/cn';

// ── Local modals ──
import { AssignTaskModal } from '../ProjectPanel/modals/AssignTaskModal';
import { ConfirmUnlinkTaskModal } from '../ProjectPanel/modals/ConfirmUnlinkTaskModal';
import { getVisibleBranches } from '../../utils/project-card.util';

import { getProjectIdentity, ProjectIcon } from './ProjectIcon';
import { KebabButton } from './KebabButton';
import { ProjectCardProps } from '../../types/project-card.types';
import { BranchBlock } from './BranchBlock';

import { CollapsedTree } from './CollapsedTree';
// ─── Main Component ─────────────────────────────────────────────────────

export const ProjectCard = memo(function ProjectCard({
  project,
  isSelected,
  isProjectSelected = false,
  busyBranchNames,
  onReleaseElsewhere,
  onFocusElsewhere,
  onSelectProject,
  selectedSessionId,
  isTaskManagerActive,
  isGitActive = false,
  hasGit,
  onToggleGit,
  isPullRequestActive = false,
  onTogglePullRequest,
  draggable,
  isGlobalDragging = false,
  onToggleProject,
  onSelectSession,
  onOpenDropdown,
  onOpenTaskMenu,
  onToggleTaskManager,
  onNewSession,
  onProcessInteract,
  onSessionContextMenu,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: ProjectCardProps) {
  const projectPath = useCodeStore((s) => s.projects.find((p) => p.id === project.id)?.path ?? '');

  const projectTasks = useSessionTasks((s) => s.byPath[projectPath]);
  const loadTasks = useSessionTasks((s) => s.load);
  useEffect(() => {
    void loadTasks(projectPath);
  }, [loadTasks, projectPath]);
  const visBranches = getVisibleBranches(project);
  const identity = useMemo(
    () => getProjectIdentity(project.id + project.name),
    [project.id, project.name],
  );

  const [taskStatusModalOpen, setTaskStatusModalOpen] = useState(false);
  const [taskStatusModalBranch, setTaskStatusModalBranch] = useState<string | null>(null);
  const [confirmUnlinkTask, setConfirmUnlinkTask] = useState<StoredTask | null>(null);

  const handleOpenTaskStatusModal = useCallback((branchName: string) => {
    setTaskStatusModalBranch(branchName);
    setTaskStatusModalOpen(true);
  }, []);

  const handleCloseTaskStatusModal = useCallback(() => {
    setTaskStatusModalOpen(false);
    setTaskStatusModalBranch(null);
  }, []);

  const openMenuAt = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onOpenDropdown('project', project.id, undefined, { top: e.clientY, left: e.clientX });
    },
    [project.id, onOpenDropdown],
  );

  return (
    <div
      className={cn(
        'relative shrink-0 border-y border-border overflow-hidden transition-colors',
        project.hidden && 'opacity-50',
        // Selected project indicator — subtle accent strip + tinted background
        isProjectSelected && 'bg-primary/[0.04]',
      )}
      data-project-selected={isProjectSelected ? 'true' : undefined}
      draggable={draggable}
      data-pid={project.id}
      onDragStart={(e) => onDragStart(e, 'project', project.id)}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onContextMenu={openMenuAt}
    >
      {/* ── Top: name row + task chips ── */}
      <div
        className={cn(
          'group/top relative flex flex-col gap-1.5 px-3 pt-[9px] pb-2.5 cursor-pointer select-none transition-colors',
          !isGlobalDragging && 'hover:bg-white/[0.02]',
          isProjectSelected &&
            "before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-primary",
        )}
        onClick={() => {
          if (isGlobalDragging) return;
          // Clicking the card header selects the project AND expands it.
          onSelectProject?.(project.id);
          if (!isSelected) onToggleProject(project.id);
        }}
      >
        <div className="flex items-center gap-2" data-drag-row>
          <ProjectIcon color={identity.color} Icon={identity.Icon} logoPath={project.logoPath} />
          <span
            className={cn(
              'font-display font-semibold text-[12.5px] truncate flex-1 min-w-0 transition-colors',
              !isGlobalDragging && 'group-hover/top:text-text-primary',
              isProjectSelected
                ? 'text-text-primary'
                : isSelected
                  ? 'text-text-primary'
                  : 'text-text-secondary',
            )}
          >
            {project.name}
          </span>

          {/* Elements hidden via CSS during drag to preserve DOM structure and prevent flickering/layout shifts */}
          <div data-drag-hide className={cn('contents', isGlobalDragging && 'hidden')}>
            {project.hidden && (
              <span className="text-[9.5px] text-text-secondary/50 border border-border rounded px-[5px]">
                hidden
              </span>
            )}

            <KebabButton onClick={openMenuAt} />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleTaskManager(project.id);
              }}
              className={cn(
                'w-[22px] h-[22px] rounded-md flex items-center justify-center shrink-0 transition-colors cursor-pointer',
                isTaskManagerActive
                  ? 'text-primary bg-primary/10'
                  : 'text-text-secondary hover:bg-card-hover hover:text-text-primary',
              )}
              title={isTaskManagerActive ? 'Close Task Manager' : 'Open Task Manager'}
            >
              <Kanban className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (hasGit === false) return;
                onToggleGit?.(project.id);
              }}
              disabled={hasGit === false}
              className={cn(
                'w-[22px] h-[22px] rounded-md flex items-center justify-center shrink-0 transition-colors',
                hasGit === false
                  ? 'text-text-secondary/30 cursor-not-allowed'
                  : 'cursor-pointer ' +
                      (isGitActive
                        ? 'text-primary bg-primary/10'
                        : 'text-text-secondary hover:bg-card-hover hover:text-text-primary'),
              )}
              title={
                hasGit === false
                  ? 'Not a git repository — Git features unavailable'
                  : isGitActive
                    ? 'Close Git'
                    : 'Open Git'
              }
            >
              <GitGraph className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (hasGit === false) return;
                onTogglePullRequest?.(project.id);
              }}
              disabled={hasGit === false}
              className={cn(
                'w-[22px] h-[22px] rounded-md flex items-center justify-center shrink-0 transition-colors',
                hasGit === false
                  ? 'text-text-secondary/30 cursor-not-allowed'
                  : 'cursor-pointer ' +
                      (isPullRequestActive
                        ? 'text-primary bg-primary/10'
                        : 'text-text-secondary hover:bg-card-hover hover:text-text-primary'),
              )}
              title={
                hasGit === false
                  ? 'Not a git repository — Pull requests unavailable'
                  : isPullRequestActive
                    ? 'Close Pull requests'
                    : 'Open Pull requests'
              }
            >
              <GitPullRequest className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleProject(project.id);
              }}
              className="w-[14px] h-[14px] shrink-0 flex items-center justify-center cursor-pointer text-text-secondary hover:text-text-primary transition-colors"
              title={isSelected ? 'Collapse' : 'Expand'}
            >
              {isSelected ? (
                <ChevronDown className="w-[14px] h-[14px]" />
              ) : (
                <ChevronRight className="w-[14px] h-[14px]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── CONTENT AREA: Hidden via CSS during drag to preserve DOM structure ── */}
      <div className={cn(isGlobalDragging && 'hidden')}>
        {!isSelected && (
          <div className="flex flex-col gap-px pl-3 pr-2 pb-2.5 transition-opacity duration-150">
            <CollapsedTree
              project={project}
              selectedSessionId={selectedSessionId}
              onSelectSession={onSelectSession}
              onOpenTaskMenu={onOpenTaskMenu}
              onProcessInteract={onProcessInteract}
              onSessionContextMenu={onSessionContextMenu}
              onOpenDropdown={onOpenDropdown}
              onNewSession={onNewSession}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onExpandProject={() => onToggleProject(project.id)}
              busyBranchNames={busyBranchNames}
              onFocusElsewhere={onFocusElsewhere}
              onReleaseElsewhere={onReleaseElsewhere}
              projectTasks={projectTasks}
              onOpenTaskStatusModal={handleOpenTaskStatusModal}
            />
          </div>
        )}

        {isSelected && (
          <div className="px-3 pt-0.5 pb-3 flex flex-col gap-3.5 relative animate-in fade-in slide-in-from-top-1 duration-150">
            {visBranches.length > 0 ? (
              visBranches.map((branch) => (
                <BranchBlock
                  key={branch.name}
                  project={project}
                  branch={branch}
                  selectedSessionId={selectedSessionId}
                  onSelectSession={onSelectSession}
                  onOpenDropdown={onOpenDropdown}
                  onOpenTaskMenu={onOpenTaskMenu}
                  onNewSession={onNewSession}
                  onProcessInteract={onProcessInteract}
                  onSessionContextMenu={onSessionContextMenu}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  busyElsewhere={busyBranchNames?.has(branch.name)}
                  onFocusElsewhere={onFocusElsewhere}
                  onReleaseElsewhere={onReleaseElsewhere}
                  projectTasks={projectTasks}
                  onOpenTaskStatusModal={handleOpenTaskStatusModal}
                />
              ))
            ) : (
              <div className="text-center text-text-secondary/50 text-[11.5px] px-2.5 py-6">
                No branches shown.
                <br />
                Right-click the project to add one.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Task Status Modal */}
      <AssignTaskModal
        isOpen={taskStatusModalOpen}
        onClose={handleCloseTaskStatusModal}
        projectName={project.name}
        branchName={taskStatusModalBranch}
        tasks={(projectTasks ?? []).filter(
          (t) =>
            !t.archived &&
            t.status === 'todo' &&
            (!t.branchName || t.branchName === taskStatusModalBranch) &&
            !t.sessionId,
        )}
        inProgressTasks={(projectTasks ?? []).filter(
          (t) =>
            !t.archived && t.status === 'progress' && t.branchName === taskStatusModalBranch,
        )}
        onSelect={(t) => {
          void taskService.update(projectPath, t.id, {
            status: 'progress',
            branchName: taskStatusModalBranch,
            sessionId: null,
          });
          handleCloseTaskStatusModal();
        }}
        onSwitchProgress={(t, action) => {
          (projectTasks ?? [])
            .filter(
              (p) =>
                !p.archived && p.status === 'progress' && p.branchName === taskStatusModalBranch,
            )
            .forEach((p) => {
              void taskService.update(projectPath, p.id, { status: action });
            });
          void taskService.update(projectPath, t.id, {
            status: 'progress',
            branchName: taskStatusModalBranch,
            sessionId: null,
          });
          handleCloseTaskStatusModal();
        }}
        onUnlink={(t) => {
          setConfirmUnlinkTask(t);
          handleCloseTaskStatusModal();
        }}
      />

      {/* Confirm Unlink Task Modal */}
      <ConfirmUnlinkTaskModal
        isOpen={!!confirmUnlinkTask}
        onClose={() => setConfirmUnlinkTask(null)}
        taskTitle={confirmUnlinkTask?.title ?? ''}
        onConfirm={(newStatus) => {
          if (!confirmUnlinkTask) return;
          void taskService.update(projectPath, confirmUnlinkTask.id, {
            status: newStatus,
            branchName: null,
            sessionId: null,
          });
          setConfirmUnlinkTask(null);
        }}
      />
    </div>
  );
});

export default ProjectCard;
