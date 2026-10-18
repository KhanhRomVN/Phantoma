import { Archive } from 'lucide-react';
import { $ } from '@renderer/utils/color';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';

interface ConfirmArchiveTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  taskTitle: string;
}

export function ConfirmArchiveTaskModal({
  isOpen,
  onClose,
  onConfirm,
  taskTitle,
}: ConfirmArchiveTaskModalProps) {
  const warn = '--warn';
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[400px]">
      <ModalBody className="py-6 px-5">
        <div className="flex flex-col items-center text-center gap-3">
          <div
            className="w-11 h-11 rounded-xl border grid place-items-center shrink-0"
            style={{
              color: $(warn),
              backgroundColor: $(warn, 0.1),
              borderColor: $(warn, 0.2),
            }}
          >
            <Archive className="w-5 h-5" strokeWidth={1.8} />
          </div>

          <h3 className="text-base font-semibold text-text-primary leading-snug">Archive Task?</h3>

          <p className="text-xs text-text-secondary leading-relaxed max-w-[280px]">
            Move <b className="font-medium text-text-primary">{taskTitle}</b> to the archive? You can
            restore it any time from the archive list.
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
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className="flex-1 h-[42px] text-xs font-semibold hover:bg-white/[0.03] transition-colors flex items-center justify-center gap-1.5"
          style={{ color: $(warn) }}
        >
          <Archive className="w-3.5 h-3.5" />
          Archive
        </button>
      </ModalFooter>
    </Modal>
  );
}

export default ConfirmArchiveTaskModal;