import { memo, useState } from 'react';
import { Bell, FileWarning } from 'lucide-react';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';
import { useScopeStats } from '../../../stores/useScopeStatsStore';
import { CommitSyncedFilesModal } from './CommitSyncedFilesModal';

export const ScopeWarnBell = memo(function ScopeWarnBell({
  projectId,
  projectPath,
  onDone,
}: {
  projectId: string;
  projectPath: string;
  onDone: () => void;
}) {
  const warn = useScopeStats(projectId).warn;
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  if (warn.length === 0 && !modalOpen) return null;

  return (
    <>
      <Dropdown open={open} onOpenChange={setOpen} side="bottom" align="end">
        <DropdownTrigger asChild>
          <span
            className="relative inline-flex items-center h-6 px-1 rounded cursor-pointer transition-colors text-text-secondary hover:text-text-primary hover:bg-card-hover"
            title="Notifications"
          >
            <Bell className="w-3.5 h-3.5" strokeWidth={1.5} />
            {warn.length > 0 && (
              <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-warn" />
            )}
          </span>
        </DropdownTrigger>
        <DropdownContent className="min-w-[280px]" size="sm">
          <DropdownItem
            noPadding
            className="px-3 py-2"
            onClick={() => {
              setOpen(false);
              setModalOpen(true);
            }}
          >
            <span className="flex items-center gap-2.5 w-full">
              <span className="flex items-center justify-center w-8 h-8 rounded-md shrink-0 bg-warn/15 text-warn">
                <FileWarning className="w-4 h-4" strokeWidth={1.5} />
              </span>
              <span className="flex flex-col flex-1 min-w-0 gap-1">
                <span className="text-[13px] leading-[16px] text-text-primary truncate">
                  {warn.length} file(s) outside scope
                </span>
                <span className="text-[11px] leading-[14px] text-text-secondary truncate">
                  Same as default branch · click to commit sync
                </span>
              </span>
            </span>
          </DropdownItem>
        </DropdownContent>
      </Dropdown>
      <CommitSyncedFilesModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onDone={onDone}
        projectPath={projectPath}
        files={warn}
      />
    </>
  );
});