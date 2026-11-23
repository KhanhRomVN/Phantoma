import type { ComponentProps } from 'react';
import type { useCodeStore } from '../../../../shared/stores/code.store';
import { taskService } from '../../../../shared/services/task.service';
import {
  SyncBranchModal,
  CreateBranchModal,
  ConfirmDeleteBranchModal,
  ConfirmUnlinkBranchModal,
} from '../../../git';
import { ConfirmForceStartTaskModal } from '../../../tasks';
import { OpenProjectModal } from '../modals/OpenProject/OpenProjectModal';
import { ConfirmDeleteProjectModal } from '../modals/ConfirmDeleteProjectModal';
import { ProjectSettingsModal } from '../modals/ProjectSettingsModal';
import { ConfirmLinkProjectModal } from '../modals/ConfirmLinkProjectModal';
import {
  ProjectConflictModal,
  toBranchTargetId,
  type ConflictProjectOption,
} from './modals/ProjectConflictModal';
import { AssignTaskModal } from './modals/AssignTaskModal';
import { ConfirmUnassignTaskModal } from './modals/ConfirmUnassignTaskModal';
import { forceReleaseTarget, focusTargetOwner } from '@renderer/hooks/useTargetLock';
import type { useProjectDialogs } from '../../hooks/useProjectDialogs';
import type { useProjectTaskActions } from '../../hooks/useProjectTaskActions';
import type { useProjectMutations } from '../../hooks/useProjectMutations';
import type { useProjectSelection } from '../../hooks/useProjectSelection';
import type { GroupInfo, ProjectExtended } from '../../types/project-panel.types';

type TaskActions = ReturnType<typeof useProjectTaskActions>;
type Selection = ReturnType<typeof useProjectSelection>;
type BranchCreatedResult = Parameters<ComponentProps<typeof CreateBranchModal>['onCreated']>[0];

interface ProjectDialogsProps {
  dialogs: ReturnType<typeof useProjectDialogs>;
  projects: ProjectExtended[];
  groups: GroupInfo[];
  settingsProject: ProjectExtended | null | undefined;
  createBranchProject: ProjectExtended | null | undefined;
  existingBranchProject: ProjectExtended | null | undefined;
  deleteBranchHasRemote: boolean;
  tasksByPath: TaskActions['tasksByPath'];
  forceStart: TaskActions['forceStart'];
  setForceStart: TaskActions['setForceStart'];
  blockedTarget: Selection['blockedTarget'];
  setBlockedTarget: Selection['setBlockedTarget'];
  conflictProject: ProjectExtended | null;
  conflictOptions: ConflictProjectOption[];
  currentBranchName: string | null | undefined;
  currentTargetId: string | null;
  setConflictOpen: (open: boolean) => void;
  patchProject: ReturnType<typeof useProjectMutations>['patchProject'];
  updateProject: ReturnType<typeof useCodeStore.getState>['updateProject'];
  showToast: (msg: string) => void;
  detectSameRepo: (projectId: string) => unknown;
  confirmMergeProject: ComponentProps<typeof ConfirmLinkProjectModal>['onConfirm'];
  confirmRemoveProject: ComponentProps<typeof ConfirmDeleteProjectModal>['onConfirm'];
  confirmDeleteBranch: ComponentProps<typeof ConfirmDeleteBranchModal>['onConfirm'];
  handleBranchCreated: (project: ProjectExtended, result: BranchCreatedResult) => void;
  unlinkBranch: (project: ProjectExtended, branchName: string) => unknown;
  handleConflictSelectProject: (projectId: string) => void;
  handleSwitchBranch: (projectId: string, branchName: string, force?: boolean) => void;
  handleUnselectProject: () => void;
}

export function ProjectDialogs({
  dialogs,
  projects,
  groups,
  settingsProject,
  createBranchProject,
  existingBranchProject,
  deleteBranchHasRemote,
  tasksByPath,
  forceStart,
  setForceStart,
  blockedTarget,
  setBlockedTarget,
  conflictProject,
  conflictOptions,
  currentBranchName,
  currentTargetId,
  setConflictOpen,
  patchProject,
  updateProject,
  showToast,
  detectSameRepo,
  confirmMergeProject,
  confirmRemoveProject,
  confirmDeleteBranch,
  handleBranchCreated,
  unlinkBranch,
  handleConflictSelectProject,
  handleSwitchBranch,
  handleUnselectProject,
}: ProjectDialogsProps) {
  const {
    addModalOpen,
    setAddModalOpen,
    addToGroupId,
    setAddToGroupId,
    setPendingGroupAssign,
    confirmDeleteTarget,
    setConfirmDeleteTarget,
    setCreateBranchProjectId,
    setSettingsProjectId,
    mergeTarget,
    setMergeTarget,
    existingBranchTarget,
    setExistingBranchTarget,
    syncBranchTarget,
    setSyncBranchTarget,
    confirmDeleteBranchTarget,
    setConfirmDeleteBranchTarget,
    confirmUnlinkBranchTarget,
    setConfirmUnlinkBranchTarget,
    assignTaskTarget,
    setAssignTaskTarget,
    confirmUnassign,
    setConfirmUnassign,
  } = dialogs;

  return (
    <>
      {/* ── Project Modals ── */}
      <OpenProjectModal
        isOpen={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setAddToGroupId(null);
        }}
        onProjectAdded={(projectId) => {
          if (addToGroupId) setPendingGroupAssign({ projectId, groupId: addToGroupId });
          void detectSameRepo(projectId);
        }}
      />

      <ConfirmLinkProjectModal
        isOpen={!!mergeTarget}
        onClose={() => setMergeTarget(null)}
        onConfirm={confirmMergeProject}
        newProjectName={mergeTarget?.newProjectName ?? ''}
        branchName={mergeTarget?.branch ?? ''}
        candidates={mergeTarget?.candidates ?? []}
      />

      {/* ── Confirm Delete Project Modal ── */}
      <ConfirmDeleteProjectModal
        isOpen={!!confirmDeleteTarget}
        onClose={() => setConfirmDeleteTarget(null)}
        onConfirm={confirmRemoveProject}
        projectName={confirmDeleteTarget?.name ?? ''}
        projectPath={confirmDeleteTarget?.path}
      />

      <ProjectSettingsModal
        isOpen={!!settingsProject}
        onClose={() => setSettingsProjectId(null)}
        project={
          settingsProject
            ? {
                id: settingsProject.id,
                name: settingsProject.name,
                path: settingsProject.path,
                color: settingsProject.color,
                logoPath: settingsProject.logoPath,
                hidden: settingsProject.hidden,
                branchCount: settingsProject.branches.length,
                groupName: groups.find((g) => g.id === settingsProject.groupId)?.name ?? null,
              }
            : null
        }
        onChange={(id, patch) => {
          const { hidden, ...storePatch } = patch;
          if (Object.keys(storePatch).length > 0) updateProject(id, storePatch);
          if (hidden !== undefined) patchProject(id, (p) => ({ ...p, hidden }));
        }}
      />

      <CreateBranchModal
        isOpen={!!createBranchProject}
        onClose={() => setCreateBranchProjectId(null)}
        projectPath={createBranchProject?.path ?? ''}
        projectName={createBranchProject?.name ?? ''}
        branches={(() => {
          const bs = createBranchProject?.branches ?? [];
          return bs.map((b) => b.name);
        })()}
        remoteBranches={(createBranchProject?.branches ?? [])
          .filter((b) => b.remote)
          .map((b) => b.name)}
        defaultSource={createBranchProject?.defaultBranch}
        projectLogoPath={createBranchProject?.logoPath}
        onCreated={(result) =>
          createBranchProject && handleBranchCreated(createBranchProject, result)
        }
      />

      <CreateBranchModal
        isOpen={!!existingBranchProject}
        onClose={() => setExistingBranchTarget(null)}
        projectPath={existingBranchProject?.path ?? ''}
        projectName={existingBranchProject?.name ?? ''}
        branches={(existingBranchProject?.branches ?? []).map((b) => b.name)}
        defaultSource={existingBranchProject?.defaultBranch}
        existingBranch={existingBranchTarget?.branchName}
        existingBranchRemote={
          !!existingBranchProject?.branches.find((b) => b.name === existingBranchTarget?.branchName)
            ?.remote
        }
        projectLogoPath={existingBranchProject?.logoPath}
        onCreated={(result) =>
          existingBranchProject && handleBranchCreated(existingBranchProject, result)
        }
      />

      <SyncBranchModal
        isOpen={!!syncBranchTarget}
        onClose={() => setSyncBranchTarget(null)}
        targetPath={syncBranchTarget?.branchPath ?? ''}
        projectName={syncBranchTarget?.project.name ?? ''}
        currentBranch={syncBranchTarget?.branchName ?? ''}
        projectId={syncBranchTarget?.project.id}
        defaultBranch={syncBranchTarget?.project.defaultBranch}
        branches={(syncBranchTarget?.project.branches ?? []).map((b) => b.name)}
        onApplied={(count, source) =>
          showToast(`Pulled ${count} file${count === 1 ? '' : 's'} from "${source}"`)
        }
      />

      <ConfirmDeleteBranchModal
        isOpen={!!confirmDeleteBranchTarget}
        onClose={() => setConfirmDeleteBranchTarget(null)}
        onConfirm={confirmDeleteBranch}
        branchName={confirmDeleteBranchTarget?.branchName ?? ''}
        projectName={confirmDeleteBranchTarget?.project.name ?? ''}
        projectPath={confirmDeleteBranchTarget?.project.path ?? ''}
        branchPath={confirmDeleteBranchTarget?.branchPath ?? ''}
        logoPath={confirmDeleteBranchTarget?.project.logoPath}
        projectBranch={confirmDeleteBranchTarget?.project.defaultBranch}
        hasRemote={deleteBranchHasRemote}
      />

      {(() => {
        const proj = projects.find((p) => p.id === assignTaskTarget?.projectId);
        const path = proj?.path ?? '';
        const sessionBranch = assignTaskTarget?.sessionId
          ? proj?.branches.find((b) => b.sessions.some((s) => s.id === assignTaskTarget.sessionId))
          : undefined;
        const targetBranchName = assignTaskTarget?.branchName ?? sessionBranch?.name ?? null;
        // ASSUMED: ngoài task chưa gán, modal cũng liệt kê task todo đã gán cho chính branch này (giống tooltip)
        const candidates = (tasksByPath[path] ?? []).filter(
          (t) =>
            !t.archived &&
            t.status === 'todo' &&
            ((!t.sessionId && !t.branchName) ||
              (!!targetBranchName && t.branchName === targetBranchName)),
        );
        const inProgressTasks = (tasksByPath[path] ?? []).filter(
          (t) =>
            !t.archived &&
            t.status === 'progress' &&
            (targetBranchName
              ? t.branchName === targetBranchName
              : !!assignTaskTarget?.sessionId && t.sessionId === assignTaskTarget.sessionId),
        );
        return (
          <AssignTaskModal
            isOpen={!!assignTaskTarget}
            onClose={() => setAssignTaskTarget(null)}
            tasks={candidates}
            inProgressTasks={inProgressTasks}
            projectName={proj?.name ?? ''}
            branchName={targetBranchName}
            onSelect={(t) => {
              if (!assignTaskTarget) return;
              void taskService.update(path, t.id, {
                sessionId: targetBranchName ? null : assignTaskTarget.sessionId,
                branchName: targetBranchName,
                ...(inProgressTasks.length === 0 ? { status: 'progress' as const } : {}),
              });
              setAssignTaskTarget(null);
            }}
            onSwitchProgress={(t, action) => {
              if (!assignTaskTarget) return;
              inProgressTasks.forEach((p) => {
                void taskService.update(path, p.id, { status: action });
              });
              void taskService.update(path, t.id, {
                sessionId: targetBranchName ? null : assignTaskTarget.sessionId,
                branchName: targetBranchName,
                status: 'progress' as const,
              });
              setAssignTaskTarget(null);
            }}
          />
        );
      })()}

      <ConfirmUnlinkBranchModal
        isOpen={!!confirmUnlinkBranchTarget}
        onClose={() => setConfirmUnlinkBranchTarget(null)}
        onConfirm={() =>
          confirmUnlinkBranchTarget &&
          unlinkBranch(confirmUnlinkBranchTarget.project, confirmUnlinkBranchTarget.branchName)
        }
        branchName={confirmUnlinkBranchTarget?.branchName ?? ''}
        projectName={confirmUnlinkBranchTarget?.project.name ?? ''}
        branchPath={confirmUnlinkBranchTarget?.branchPath ?? ''}
      />

      {conflictProject && (
        <ProjectConflictModal
          project={{ id: conflictProject.id, name: conflictProject.name }}
          branchName={currentBranchName ?? ''}
          projects={conflictOptions}
          onSelectProject={handleConflictSelectProject}
          onUnselect={handleUnselectProject}
          onTakeOver={() => {
            if (currentTargetId) forceReleaseTarget('code', currentTargetId);
            setConflictOpen(false);
          }}
          onFocusOther={() => currentTargetId && focusTargetOwner('code', currentTargetId)}
        />
      )}

      {blockedTarget && !conflictProject && (
        <ProjectConflictModal
          project={{
            id: blockedTarget.projectId,
            name: projects.find((p) => p.id === blockedTarget.projectId)?.name ?? '',
          }}
          branchName={blockedTarget.branchName}
          projects={conflictOptions}
          onSelectProject={(projectId) => {
            setBlockedTarget(null);
            handleConflictSelectProject(projectId);
          }}
          onUnselect={() => setBlockedTarget(null)}
          onTakeOver={() => {
            const { projectId, branchName } = blockedTarget;
            forceReleaseTarget('code', toBranchTargetId(projectId, branchName));
            setBlockedTarget(null);
            handleSwitchBranch(projectId, branchName, true);
          }}
          onFocusOther={() =>
            focusTargetOwner(
              'code',
              toBranchTargetId(blockedTarget.projectId, blockedTarget.branchName),
            )
          }
        />
      )}

      <ConfirmUnassignTaskModal
        isOpen={!!confirmUnassign}
        taskTitle={confirmUnassign?.title ?? ''}
        onClose={() => setConfirmUnassign(null)}
        onConfirm={() => confirmUnassign?.run()}
      />

      <ConfirmForceStartTaskModal
        isOpen={!!forceStart}
        taskTitle={forceStart?.title ?? ''}
        chain={forceStart?.chain ?? []}
        onClose={() => setForceStart(null)}
        onConfirm={() => {
          const pending = forceStart;
          if (!pending) return;
          void (async () => {
            try {
              for (const t of pending.chain) {
                await taskService.update(pending.path, t.id, {
                  status: 'done',
                  sessionId: null,
                  branchName: null,
                });
              }
              await pending.proceed();
            } catch (e: any) {
              alert(`Error updating tasks: ${e.message}`);
            }
          })();
        }}
      />
    </>
  );
}
