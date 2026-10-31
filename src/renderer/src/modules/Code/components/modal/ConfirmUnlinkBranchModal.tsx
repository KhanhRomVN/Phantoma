import { Unlink } from 'lucide-react';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';

interface ConfirmUnlinkBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  branchName: string;
  projectName: string;
  branchPath: string;
}

export function ConfirmUnlinkBranchModal({
  isOpen,
  onClose,
  onConfirm,
  branchName,
  projectName,
  branchPath,
}: ConfirmUnlinkBranchModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[400px]">
      <ModalBody className="py-6 px-5">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-error/10 border border-error/20 grid place-items-center text-error shrink-0">
            <Unlink className="w-5 h-5" strokeWidth={1.8} />
          </div>

          <h3 className="text-base font-semibold text-text-primary leading-snug">Remove link?</h3>

          <p className="text-xs text-text-secondary leading-relaxed max-w-[300px]">
            <b className="font-medium text-text-primary">{branchName}</b> will be removed from{' '}
            <b className="font-medium text-text-primary">{projectName}</b>. Its sessions will no longer be
            listed here. The folder{' '}
            <span className="font-mono text-text-primary break-all">{branchPath}</span> and the git branch stay
            untouched on your machine.
          </p>
        </div>
      </ModalBody>

      <ModalFooter className="gap-0 p-0 border-t border-divider">
        <button
          onClick={onClose}
          className="flex-1 h-[42px] text-xs font-medium text-text-secondary hover:bg-white/[0.03] hover:text-text-primary transition-colors border-r border-divider"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          className="flex-1 h-[42px] text-xs font-semibold text-error hover:bg-error/[0.06] transition-colors flex items-center justify-center gap-1.5"
        >
          <Unlink className="w-3.5 h-3.5" />
          Remove link
        </button>
      </ModalFooter>
    </Modal>
  );
}

export default ConfirmUnlinkBranchModal;