import { Unlink } from 'lucide-react';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';
import { Button } from '@renderer/components/ui/Button';

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
        <Button
          onClick={onClose}
          className="flex-1 h-[42px] text-xs font-medium bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/20 hover:text-text-primary active:bg-text-secondary/30 border-r border-divider rounded-none"
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          className="flex-1 h-[42px] text-xs font-semibold bg-error/10 text-error hover:bg-error hover:text-text-primary active:bg-error/80 transition-colors rounded-none flex items-center justify-center gap-1.5"
        >
          <Unlink className="w-3.5 h-3.5" />
          Remove link
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default ConfirmUnlinkBranchModal;