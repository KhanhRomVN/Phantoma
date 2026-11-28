// ─── Imports ─────────────────────────────────────────────────────────────────
// ── React ──
import { memo } from 'react';

// ── UI ──
import { MoreVertical, MonitorUp, PowerOff, Unlink } from 'lucide-react';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from '@renderer/components/ui/Dropdown';

// ── Components ──
import { toBranchTargetId } from '../ProjectPanel/modals/ProjectConflictModal';

// ── Hooks ──
import { closeTargetOwner } from '@renderer/hooks/useTargetLock';

// ─── Component ───────────────────────────────────────────────────────────────
export const DefaultBadge = memo(function DefaultBadge() {
  return (
    <span className="inline-flex items-center h-[18px] px-1.5 rounded-[5px] shrink-0 text-[9.5px] font-medium text-primary bg-primary/10">
      default
    </span>
  );
});

// ─── Constants ───────────────────────────────────────────────────────────────
export const NO_BRANCH_NAME = 'no-branch';

export const NO_GIT_NAME = 'no-git';

export const TempBranchBadge = memo(function TempBranchBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center h-[18px] px-1.5 rounded-[5px] shrink-0 text-[9.5px] font-medium text-text-secondary bg-text-secondary/10">
      {name === NO_GIT_NAME ? 'no git' : 'no branch'}
    </span>
  );
});

export const RemoteGoneBadge = memo(function RemoteGoneBadge() {
  return (
    <span
      className="inline-flex items-center h-[18px] px-1.5 rounded-[5px] shrink-0 text-[9.5px] font-medium text-red-500 bg-red-500/10"
      title="Remote branch was deleted. Local changes are still in this folder."
    >
      remote deleted
    </span>
  );
});

/** Badge: branch đang được một cửa sổ KHÁC mở */
export const BusyBadge = memo(function BusyBadge({
  projectId,
  branchName,
  onFocus,
  onRelease,
}: {
  projectId: string;
  branchName: string;
  onFocus: () => void;
  onRelease: () => void;
}) {
  return (
    <div className="inline-flex items-center h-[18px] rounded-[5px] shrink-0 text-[9.5px] font-medium text-amber-500 bg-amber-500/10">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onFocus();
        }}
        className="inline-flex items-center gap-1 h-full pl-1.5 pr-1 cursor-pointer hover:bg-amber-500/20 transition-colors"
        title="Open in another window — click to switch to it"
      >
        <MonitorUp className="w-3 h-3" />
        Other window
      </button>
      <span onClick={(e) => e.stopPropagation()}>
        <Dropdown strategy="fixed" side="bottom" align="end" sideOffset={4}>
          <DropdownTrigger asChild>
            <button
              className="inline-flex items-center justify-center h-[18px] px-1 rounded-r-[5px] cursor-pointer hover:bg-amber-500/20 transition-colors"
              title="More actions"
            >
              <MoreVertical className="w-3 h-3" />
            </button>
          </DropdownTrigger>
          <DropdownContent>
            <DropdownItem icon={<MonitorUp className="w-3.5 h-3.5" />} onClick={onFocus}>
              Switch to that window
            </DropdownItem>
            <DropdownItem icon={<Unlink className="w-3.5 h-3.5" />} onClick={onRelease}>
              Unselect branch in that window
            </DropdownItem>
            <DropdownSeparator />
            <DropdownItem
              variant="error"
              icon={<PowerOff className="w-3.5 h-3.5" />}
              onClick={() => closeTargetOwner('code', toBranchTargetId(projectId, branchName))}
            >
              Close that window
            </DropdownItem>
          </DropdownContent>
        </Dropdown>
      </span>
    </div>
  );
});
