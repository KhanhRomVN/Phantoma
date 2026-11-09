import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';
import { Button } from '@renderer/components/ui/Button';
import { TreeUIPreview } from './TreeUIPreview';

interface ConfirmDeleteBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (opts: { deleteRemote: boolean }) => Promise<{ error?: string } | void>;
  branchName: string;
  projectName: string;
  projectPath: string;
  branchPath: string;
  logoPath?: string | null;
  projectBranch?: string;
  hasRemote?: boolean;
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
  hasRemote = false,
}: ConfirmDeleteBranchModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [deleteRemote, setDeleteRemote] = useState(false);

  const { folderName, targetDir } = useMemo(() => {
    const trimmed = branchPath.replace(/\/+$/, '');
    const i = trimmed.lastIndexOf('/');
    return { folderName: trimmed.slice(i + 1), targetDir: i <= 0 ? '/' : trimmed.slice(0, i) };
  }, [branchPath]);

  useEffect(() => {
    if (!isOpen) {
      setConfirmText('');
      setError('');
      setDeleteRemote(false);
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
      const res = await onConfirm({ deleteRemote });
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

          {hasRemote && (
          <button
            type="button"
            role="switch"
            aria-checked={deleteRemote}
            disabled={submitting}
            onClick={() => setDeleteRemote((v) => !v)}
            className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-md border border-divider bg-input-background/40 px-3 py-2.5 text-left outline-none transition-colors hover:bg-input-background/60 disabled:opacity-50"
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-xs font-medium text-text-primary">
                Also delete <span className="font-mono">origin/{branchName}</span> on remote
              </span>
              <span className="text-[11px] text-text-secondary">
                Runs git push origin --delete. Other people lose this branch too.
              </span>
            </span>
            <span
              className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${deleteRemote ? 'bg-error' : 'bg-text-secondary/30'}`}
            >
              <span
                className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${deleteRemote ? 'left-[14px]' : 'left-0.5'}`}
              />
            </span>
          </button>
          )}

          {error && <p className="text-xs text-error leading-relaxed">{error}</p>}
        </div>
      </ModalBody>

      <ModalFooter className="gap-0 p-0 border-t border-divider">
        <Button
          onClick={handleClose}
          disabled={submitting}
          className="flex-1 h-[42px] text-xs font-medium bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/20 hover:text-text-primary active:bg-text-secondary/30 border-r border-divider rounded-none disabled:opacity-50"
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!canDelete}
          className="flex-1 h-[42px] text-xs font-semibold bg-error/10 text-error hover:bg-error hover:text-text-primary active:bg-error/80 transition-colors rounded-none flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:hover:bg-error/10 disabled:hover:text-error disabled:cursor-not-allowed"
        >
          {submitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
          Delete folder
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default ConfirmDeleteBranchModal;