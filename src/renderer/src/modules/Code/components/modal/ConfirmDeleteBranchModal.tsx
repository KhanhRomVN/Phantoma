import { useState } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';

interface ConfirmDeleteBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<{ error?: string } | void>;
  branchName: string;
  projectName: string;
}

export function ConfirmDeleteBranchModal({
  isOpen,
  onClose,
  onConfirm,
  branchName,
  projectName,
}: ConfirmDeleteBranchModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    if (submitting) return;
    setError('');
    onClose();
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await onConfirm();
      if (res && res.error) {
        setError(res.error);
        return;
      }
      onClose();
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-[400px]">
      <ModalBody className="py-6 px-5">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-error/10 border border-error/20 grid place-items-center text-error shrink-0">
            <AlertTriangle className="w-5 h-5" strokeWidth={1.8} />
          </div>

          <h3 className="text-base font-semibold text-text-primary leading-snug">
            Delete Branch?
          </h3>

          <p className="text-xs text-text-secondary leading-relaxed max-w-[300px]">
            Are you sure you want to permanently delete{' '}
            <b className="font-medium text-text-primary">{branchName}</b> from{' '}
            <b className="font-medium text-text-primary">{projectName}</b>? The git branch and its
            worktree folder will be removed, including any uncommitted changes. This cannot be undone.
          </p>

          {error && <p className="text-xs text-error leading-relaxed max-w-[300px]">{error}</p>}
        </div>
      </ModalBody>

      <ModalFooter className="gap-0 p-0 border-t border-divider">
        <button
          onClick={handleClose}
          disabled={submitting}
          className="flex-1 h-[42px] text-xs font-medium text-text-secondary hover:bg-white/[0.03] hover:text-text-primary transition-colors border-r border-divider disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={submitting}
          className="flex-1 h-[42px] text-xs font-semibold text-error hover:bg-error/[0.06] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
          Delete
        </button>
      </ModalFooter>
    </Modal>
  );
}

export default ConfirmDeleteBranchModal;