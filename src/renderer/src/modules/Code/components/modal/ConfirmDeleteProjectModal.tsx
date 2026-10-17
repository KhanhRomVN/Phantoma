import { AlertTriangle, Trash2 } from 'lucide-react';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';

interface ConfirmDeleteProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  projectName: string;
  projectPath?: string;
}

export function ConfirmDeleteProjectModal({
  isOpen,
  onClose,
  onConfirm,
  projectName,
}: ConfirmDeleteProjectModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[400px]">
      <ModalBody className="py-6 px-5">
        {/* Centered vertical stack: Badge Icon → Title → Description */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-error/10 border border-error/20 grid place-items-center text-error shrink-0">
            <AlertTriangle className="w-5 h-5" strokeWidth={1.8} />
          </div>

          <h3 className="text-base font-semibold text-text-primary leading-snug">
            Remove Project?
          </h3>

          <p className="text-xs text-text-secondary leading-relaxed max-w-[280px]">
            Are you sure you want to remove{' '}
            <b className="font-medium text-text-primary">{projectName}</b> from the project list?
          </p>
        </div>
      </ModalBody>

      {/* Two buttons split at 1/2 width each */}
      <ModalFooter className="gap-0 p-0 border-t border-divider">
        <button
          onClick={onClose}
          className="flex-1 h-[42px] text-xs font-medium text-text-secondary hover:bg-white/[0.03] hover:text-text-primary transition-colors border-r border-divider"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className="flex-1 h-[42px] text-xs font-semibold text-error hover:bg-error/[0.06] transition-colors flex items-center justify-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Remove
        </button>
      </ModalFooter>
    </Modal>
  );
}

export default ConfirmDeleteProjectModal;
