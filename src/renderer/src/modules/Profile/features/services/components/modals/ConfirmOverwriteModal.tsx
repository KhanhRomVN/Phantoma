import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Button } from '@renderer/components/ui/Button';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';
import { TONE_CLASS } from '../../../../shared/constants/tone.constants';

interface ConfirmOverwriteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
}

export function ConfirmOverwriteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Overwrite',
}: ConfirmOverwriteModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdropClick={false} className="max-w-[400px]">
      <ModalBody className="py-6 px-5">
        <div className="flex flex-col items-center text-center gap-3">
          <div className={cn('w-11 h-11 rounded-xl grid place-items-center shrink-0', TONE_CLASS.warn.icon)}>
            <AlertTriangle className="w-5 h-5" strokeWidth={1.8} />
          </div>
          <h3 className="text-base font-semibold text-text-primary leading-snug">{title}</h3>
          <p className="text-xs text-text-secondary leading-relaxed max-w-[280px]">{description}</p>
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
          className="flex-1 h-[42px] rounded-none bg-primary/10 text-xs font-semibold text-primary hover:bg-primary/20 active:bg-primary/30"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default ConfirmOverwriteModal;