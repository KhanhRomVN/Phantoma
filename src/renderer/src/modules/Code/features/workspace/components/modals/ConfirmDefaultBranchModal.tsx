import { TriangleAlert } from 'lucide-react';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';
import { Button } from '@renderer/components/ui/Button';

interface ConfirmDefaultBranchModalProps {
  isOpen: boolean;
  branchName: string;
  onClose: () => void;
  onContinue: () => void;
}

export function ConfirmDefaultBranchModal({
  isOpen,
  branchName,
  onClose,
  onContinue,
}: ConfirmDefaultBranchModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[420px]">
      <ModalBody className="py-6 px-5">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-warn/10 border border-warn/20 grid place-items-center text-warn shrink-0">
            <TriangleAlert className="w-5 h-5" strokeWidth={1.8} />
          </div>

          <h3 className="text-base font-semibold text-text-primary leading-snug">
            Editing the default branch?
          </h3>

          <p className="text-xs text-text-secondary leading-relaxed max-w-[320px]">
            <b className="font-medium text-text-primary">{branchName}</b> is the default local
            branch. You should not edit code here — create a new branch to work on instead. Are you
            sure you want to continue?
          </p>
        </div>
      </ModalBody>

      <ModalFooter className="gap-0 p-0 border-t border-border">
        <Button
          onClick={onClose}
          className="flex-1 h-[42px] text-xs font-medium bg-primary/10 text-text-secondary hover:bg-primary/20 hover:text-text-primary active:bg-primary/30 border-r border-border rounded-none"
        >
          Cancel
        </Button>
        <Button
          onClick={onContinue}
          className="flex-1 h-[42px] text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30 rounded-none"
        >
          Continue anyway
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default ConfirmDefaultBranchModal;