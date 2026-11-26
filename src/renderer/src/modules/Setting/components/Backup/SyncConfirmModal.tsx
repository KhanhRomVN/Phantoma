import { UploadCloud } from 'lucide-react';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';

interface SyncConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  changes: number;
  commitMessage: string;
}

export function SyncConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  changes,
  commitMessage,
}: SyncConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdropClick={false} className="max-w-[400px]">
      <ModalBody className="py-6 px-5">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-success/10 border border-success/20 grid place-items-center text-success shrink-0">
            <UploadCloud className="w-5 h-5" strokeWidth={1.8} />
          </div>
          <h3 className="text-base font-semibold text-text-primary leading-snug">Sync backup?</h3>
          <p className="text-xs text-text-secondary leading-relaxed max-w-[300px]">
            {changes > 0 ? `${changes} pending change${changes === 1 ? '' : 's'} will be` : 'Everything will be'}{' '}
            staged, committed as{' '}
            <span className="font-mono text-text-primary">{commitMessage}</span> and pushed to your GitHub
            repository.
          </p>
        </div>
      </ModalBody>

      <ModalFooter className="gap-0 p-0 border-t border-border">
        <button
          onClick={onClose}
          className="flex-1 h-[42px] text-xs font-medium text-text-secondary hover:bg-white/[0.03] hover:text-text-primary transition-colors border-r border-border"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 h-[42px] text-xs font-semibold text-success hover:bg-success/[0.06] transition-colors flex items-center justify-center gap-1.5"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          Sync
        </button>
      </ModalFooter>
    </Modal>
  );
}

export default SyncConfirmModal;