import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  busy?: boolean;
  left?: ReactNode;
  header: ReactNode;
  footer: ReactNode;
  right: ReactNode;
  children: ReactNode;
  width?: number | string;
}

export function ModalShell({ open, onClose, busy, left, header, footer, right, children, width }: ModalShellProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={busy ? undefined : onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ gridTemplateColumns: left ? '340px minmax(0,1fr) 480px' : 'minmax(0,1fr) 420px', ...(width !== undefined && { width }) }}
            className={
              left
                ? 'relative grid h-[min(92vh,max(780px,100vh))] w-[90vw] min-w-[1040px] max-w-full overflow-hidden rounded-2xl border border-border bg-background shadow-2xl'
                : 'relative grid h-auto max-h-[92vh] min-h-[480px] w-[1320px] max-w-[95vw] overflow-hidden rounded-2xl border border-border bg-background shadow-2xl'
            }
          >
            {left && (
              <aside className="relative flex min-h-0 flex-col border-r border-border bg-card-background">{left}</aside>
            )}
            <div className="flex min-h-0 min-w-0 flex-col">
              <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5">{header}</header>
              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">{children}</div>
              <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-5 py-3.5">{footer}</footer>
            </div>
            <aside className="flex min-h-0 min-w-0 flex-col border-l border-border">{right}</aside>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export default ModalShell;