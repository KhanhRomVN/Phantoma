import { AnimatePresence, motion } from 'framer-motion';
import { Activity, Trash2, X } from 'lucide-react';
import type { Proxy } from '../../shared/types/proxy-domain.types';

interface ProxyBulkActionsProps {
  /** The checked proxies; the bar is only shown while there is at least one. */
  checked: Proxy[];
  onTest: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export function ProxyBulkActions({ checked, onTest, onDelete, onClear }: ProxyBulkActionsProps) {
  return (
    <AnimatePresence>
      {checked.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.18 }}
          className="absolute bottom-7 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-dashed border-primary bg-background px-3 py-2 shadow-lg"
        >
          <span className="pr-1 text-xs font-medium text-text-primary">
            {checked.length} selected
          </span>
          <button
            type="button"
            onClick={onTest}
            className="flex h-7 items-center gap-1.5 rounded-md bg-primary/10 px-2.5 text-xs font-medium text-primary hover:bg-primary/20 active:bg-primary/30"
          >
            <Activity className="h-3.5 w-3.5" />
            Test
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex h-7 items-center gap-1.5 rounded-md bg-error/15 px-2.5 text-xs font-medium text-error hover:bg-error/20 active:bg-error/25"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
          <button
            type="button"
            onClick={onClear}
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary hover:bg-text-secondary/15 hover:text-text-primary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
