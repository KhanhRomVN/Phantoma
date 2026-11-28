// ─── Exports ─────────────────────────────────────────────────────────────────
export { GitView } from './components/GitView';
export { FileSection, parseDiff } from './components/DiffView';
export { avatarColor, avatarUrl, initials } from './utils/graph.util';
export { BranchScopeModal } from './components/modals/BranchScopeModal';
export {
  SyncBranchModal,
  SyncDiffPanel,
  buildTree,
  flatten,
  Checkbox,
  Counts,
  STATUS_META,
  BRANCH_PILL,
  type SyncFile,
  type TreeNode,
} from './components/modals/SyncBranchModal';
export { CreateBranchModal, type CreatedBranchResult } from './components/modals/CreateBranchModal';
export { ConfirmDeleteBranchModal } from './components/modals/ConfirmDeleteBranchModal';
export { ConfirmUnlinkBranchModal } from './components/modals/ConfirmUnlinkBranchModal';