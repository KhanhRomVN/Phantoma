import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';
import { TreeUIPreview } from './TreeUIPreview';

interface ConfirmDeleteBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<{ error?: string } | void>;
  branchName: string;
  projectName: string;
  projectPath: string;
  branchPath: string;
  logoPath?: string | null;
  projectBranch?: string;
}

export function ConfirmDeleteBranchModal({
  isOpen,
  onClose,
  onConfirm,
  branchName,
  projectName,
  projectPath,
  branchPath,
  logoPath,
  projectBranch,
}: ConfirmDeleteBranchModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmText, setConfirmText] = useState('');

  const { folderName, targetDir } = useMemo(() => {
    const trimmed = branchPath.replace(/\/+$/, '');
    const i = trimmed.lastIndexOf('/');
    return { folderName: trimmed.slice(i + 1), targetDir: i <= 0 ? '/' : trimmed.slice(0, i) };
  }, [branchPath]);

  useEffect(() => {
    if (!isOpen) {
      setConfirmText('');
      setError('');
    }
  }, [isOpen]);

  const canDelete = !!folderName && confirmText === folderName && !submitting;

  const handleClose = () => {
    if (submitting) return;
    setError('');
    onClose();
  };

  const handleConfirm = async () => {
    if (!canDelete) return;
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
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-[480px]">
      <ModalBody className="py-6 px-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-error/10 border border-error/20 grid place-items-center text-error shrink-0">
              <AlertTriangle className="w-5 h-5" strokeWidth={1.8} />
            </div>
            <h3 className="text-base font-semibold text-text-primary leading-snug">
              Delete folder from this computer?
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed max-w-[400px]">
              You are about to permanently delete the folder of branch{' '}
              <b className="font-medium text-text-primary">{branchName}</b> in{' '}
              <b className="font-medium text-text-primary">{projectName}</b>.
            </p>
          </div>

          <TreeUIPreview
            projectName={projectName}
            projectPath={projectPath}
            folderName={folderName}
            targetDir={targetDir}
            logoPath={logoPath}
            projectBranch={projectBranch}
            newBranch={branchName}
            variant="delete"
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text-secondary">
              Type <b className="font-mono font-medium text-text-primary">{folderName}</b> to confirm
            </label>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirm();
              }}
              disabled={submitting}
              autoFocus
              spellCheck={false}
              placeholder={folderName}
              className="h-9 w-full rounded-md border border-divider bg-input-background/40 px-3 font-mono text-xs text-text-primary outline-none transition-colors placeholder:text-text-secondary/40 focus:border-error/60 disabled:opacity-50"
            />
          </div>

          {error && <p className="text-xs text-error leading-relaxed">{error}</p>}
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
          disabled={!canDelete}
          className="flex-1 h-[42px] text-xs font-semibold text-error hover:bg-error/[0.06] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
        >
          {submitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
          Delete folder
        </button>
      </ModalFooter>
    </Modal>
  );
}

export default ConfirmDeleteBranchModal;