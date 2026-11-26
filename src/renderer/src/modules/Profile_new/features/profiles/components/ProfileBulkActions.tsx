import { ArrowRightLeft, FolderInput, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@renderer/components/ui/Button';

const SOFT_BTN =
  'rounded-md bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/15 hover:text-text-primary active:bg-text-secondary/20';
const SOFT_ERROR_BTN = 'rounded-md bg-error/15 text-error hover:bg-error/20 active:bg-error/25';

interface ProfileBulkActionsProps {
  count: number;
  canTransfer: boolean;
  onGroup: () => void;
  onTransfer: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export function ProfileBulkActions({
  count,
  canTransfer,
  onGroup,
  onTransfer,
  onDelete,
  onClear,
}: ProfileBulkActionsProps) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          key="bulk-actions"
          initial={{ opacity: 0, y: 12, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 12, x: '-50%' }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="absolute bottom-4 left-1/2 z-20 flex items-center gap-2 rounded-md border border-dashed border-primary bg-background px-3 py-2 shadow-lg"
        >
          <span className="px-1 text-xs font-medium tabular-nums text-text-primary">
            {count} selected
          </span>
          <span className="h-4 w-px bg-border" />
          <Button className={SOFT_BTN} onClick={onGroup}>
            <FolderInput className="h-3.5 w-3.5" />
            Group
          </Button>
          {canTransfer && (
            <Button className={SOFT_BTN} onClick={onTransfer}>
              <ArrowRightLeft className="h-3.5 w-3.5" />
              Duplicate/Move to source
            </Button>
          )}

          <Button className={SOFT_ERROR_BTN} onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
          <button
            type="button"
            aria-label="Clear selection"
            onClick={onClear}
            className="flex h-7 w-7 items-center justify-center rounded-md bg-text-secondary/10 text-text-secondary transition-colors hover:bg-text-secondary/15 hover:text-text-primary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
