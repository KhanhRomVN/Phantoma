import type React from 'react';
import type { BranchInfo, MenuPosition, ProcessInteractHandler } from './session.types';

// ─── Types ──────────────────────────────────────────────────────────────

export interface ProjectExtended {
  id: string;
  name: string;
  /** Ảnh vuông user chọn làm logo (đường dẫn tuyệt đối) */
  logoPath?: string | null;
  hidden: boolean;
  /** Accent color of the project icon (hex) */
  color: string;
  /** Group the project belongs to (null = ungrouped) */
  groupId: string | null;
  branches: BranchInfo[];
  /** Branch 'default' duy nhất của repo */
  defaultBranch?: string;
}

export interface ProjectCardProps {
  project: ProjectExtended;
  /** Whether the project card is expanded (shows branch blocks) */
  isSelected: boolean;
  /** Whether this project is the CURRENTLY ACTIVE project in the store */
  isProjectSelected?: boolean;
  /** Tên các branch của project đang được một cửa sổ KHÁC thao tác */
  busyBranchNames?: ReadonlySet<string>;
  /** Yêu cầu cửa sổ khác bỏ chọn branch này */
  onReleaseElsewhere?: (projectId: string, branchName: string) => void;
  /** Chuyển focus sang cửa sổ đang giữ branch này */
  onFocusElsewhere?: (projectId: string, branchName: string) => void;
  /** Select this project as active (without toggling expansion) */
  onSelectProject?: (projectId: string) => void;
  selectedSessionId: string | null;
  /** Whether the Task Manager view is currently active for THIS project */
  isTaskManagerActive: boolean;
  /** Whether the Git view is currently active for THIS project */
  isGitActive?: boolean;
  /** Whether the project folder has a .git repo (undefined = still checking) */
  hasGit?: boolean;
  /** Toggle Git view for this project */
  onToggleGit?: (projectId: string) => void;
  /** Whether the Pull Request view is currently active for THIS project */
  isPullRequestActive?: boolean;
  /** Toggle Pull Request view for this project */
  onTogglePullRequest?: (projectId: string) => void;
  /** Project drag is only enabled with Manual sort */
  draggable: boolean;
  /** True if ANY item in the list is being dragged — forces visual collapse */
  isGlobalDragging?: boolean;
  /** Click on the top row: toggle expand/collapse */
  onToggleProject: (projectId: string) => void;
  /** Click on the collapsed tree: expand only */
  onOpenProject: (projectId: string) => void;
  onSelectSession: (sessionId: string) => void;
  onOpenDropdown: (
    kind: 'project' | 'branch',
    projectId: string,
    branchName?: string,
    pos?: MenuPosition,
  ) => void;
  onOpenTaskMenu: (sessionId: string, pos: MenuPosition) => void;
  /** Toggle Task Manager view for this project */
  onToggleTaskManager: (projectId: string) => void;
  onNewSession: (projectId: string, branchName: string) => void;
  onProcessInteract: ProcessInteractHandler;
  onSessionContextMenu?: (e: React.MouseEvent, sessionId: string) => void;
  // Drag & Drop Handlers passed from Parent
  onDragStart: (
    e: React.DragEvent,
    type: 'project' | 'branch',
    projectId: string,
    branchName?: string,
  ) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}
