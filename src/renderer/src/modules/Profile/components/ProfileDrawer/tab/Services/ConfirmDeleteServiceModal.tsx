import { Trash2 } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Button } from '@renderer/components/ui/Button';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';
import { TONE_CLASS } from '../../../../constants/tone';

interface ConfirmDeleteServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  name: string;
}

export function ConfirmDeleteServiceModal({ isOpen, onClose, onConfirm, name }: ConfirmDeleteServiceModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdropClick={false} className="max-w-[400px]">
      <ModalBody className="py-6 px-5">
        <div className="flex flex-col items-center text-center gap-3">
          <div className={cn('w-11 h-11 rounded-xl grid place-items-center shrink-0', TONE_CLASS.error.icon)}>
            <Trash2 className="w-5 h-5" strokeWidth={1.8} />
          </div>
          <h3 className="text-base font-semibold text-text-primary leading-snug">Delete {name}?</h3>
          <p className="text-xs text-text-secondary leading-relaxed max-w-[300px]">
            This service and all its stored values will be removed from the profile vault and the source backup. This
            cannot be undone.
          </p>
        </div>
      </ModalBody>

      <ModalFooter className="gap-0 p-0 border-t border-border">
        <Button
          onClick={onClose}
          className="flex-1 h-[42px] rounded-none bg-primary/10 text-xs font-medium text-text-secondary hover:bg-primary/20 hover:text-text-primary active:bg-primary/30"
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          className="flex-1 h-[42px] rounded-none bg-error/10 text-xs font-semibold text-error hover:bg-error/20 active:bg-error/30"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default ConfirmDeleteServiceModal;