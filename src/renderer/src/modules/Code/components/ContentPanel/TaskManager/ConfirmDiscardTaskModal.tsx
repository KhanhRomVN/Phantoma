import { AlertTriangle, Save } from 'lucide-react';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';
import { Button } from '@renderer/components/ui/Button';

interface ConfirmDiscardTaskModalProps {
  isOpen: boolean;
  canSave: boolean;
  onClose: () => void;
  onDiscard: () => void;
  onSave: () => void;
}

export function ConfirmDiscardTaskModal({
  isOpen,
  canSave,
  onClose,
  onDiscard,
  onSave,
}: ConfirmDiscardTaskModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[480px]">
      <ModalBody className="py-6 px-5">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-warn/10 border border-warn/20 grid place-items-center text-warn shrink-0">
            <AlertTriangle className="w-5 h-5" strokeWidth={1.8} />
          </div>
          <h3 className="text-base font-semibold text-text-primary leading-snug">
            Save this task before closing?
          </h3>
          <p className="text-xs text-text-secondary leading-relaxed max-w-[400px]">
            You have unsaved content in this new task. Save it now, or discard it and close.
            {!canSave && ' A valid title is required to save.'}
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
          onClick={onDiscard}
          className="flex-1 h-[42px] text-xs font-medium bg-error/10 text-error hover:bg-error hover:text-text-primary active:bg-error/80 transition-colors border-r border-divider rounded-none"
        >
          Discard
        </Button>
        <Button
          onClick={onSave}
          disabled={!canSave}
          className="flex-1 h-[42px] text-xs font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-text-primary active:bg-primary/80 transition-colors rounded-none flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:hover:bg-primary/10 disabled:hover:text-primary disabled:cursor-not-allowed"
        >
          <Save className="w-3.5 h-3.5" />
          Save and close
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default ConfirmDiscardTaskModal;