// ─── Imports ─────────────────────────────────────────────────────────────────
// ── React ──
import { useState } from 'react';

// ── Components ──
import type { MergeCandidate } from '../components/modals/ConfirmLinkProjectModal';

// ── Types ──
import type { ProjectExtended } from '../types/project-panel.types';

// ─── Types ───────────────────────────────────────────────────────────────────
interface BranchTarget {
  project: ProjectExtended;
  branchName: string;
  branchPath: string;
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useProjectDialogs() {
  // ── State ──
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addToGroupId, setAddToGroupId] = useState<string | null>(null);
  const [pendingGroupAssign, setPendingGroupAssign] = useState<{
    projectId: string;
    groupId: string;
  } | null>(null);
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<ProjectExtended | null>(null);
  const [createBranchProjectId, setCreateBranchProjectId] = useState<string | null>(null);
  const [settingsProjectId, setSettingsProjectId] = useState<string | null>(null);
  const [mergeTarget, setMergeTarget] = useState<{
    newProjectId: string;
    newProjectName: string;
    newPath: string;
    branch: string;
    candidates: MergeCandidate[];
  } | null>(null);
  const [existingBranchTarget, setExistingBranchTarget] = useState<{
    projectId: string;
    branchName: string;
  } | null>(null);
  const [syncBranchTarget, setSyncBranchTarget] = useState<BranchTarget | null>(null);
  const [confirmDeleteBranchTarget, setConfirmDeleteBranchTarget] = useState<BranchTarget | null>(
    null,
  );
  const [confirmUnlinkBranchTarget, setConfirmUnlinkBranchTarget] = useState<BranchTarget | null>(
    null,
  );
  const [assignTaskTarget, setAssignTaskTarget] = useState<{
    projectId: string;
    sessionId: string | null;
    branchName: string | null;
  } | null>(null);
  const [confirmUnassign, setConfirmUnassign] = useState<{ title: string; run: () => void } | null>(
    null,
  );

  return {
    addModalOpen,
    setAddModalOpen,
    addToGroupId,
    setAddToGroupId,
    pendingGroupAssign,
    setPendingGroupAssign,
    confirmDeleteTarget,
    setConfirmDeleteTarget,
    createBranchProjectId,
    setCreateBranchProjectId,
    settingsProjectId,
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
  };
}