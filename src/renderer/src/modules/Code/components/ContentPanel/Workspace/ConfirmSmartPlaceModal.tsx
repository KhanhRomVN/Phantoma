import { Sparkles } from 'lucide-react';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';
import type { PaneId } from '../../../utils/workspaceLayout';

const PANE_LABELS: Record<PaneId, string> = {
  tl: 'Top left',
  tr: 'Top right',
  bl: 'Bottom left',
  br: 'Bottom right',
};

interface ConfirmSmartPlaceModalProps {
  isOpen: boolean;
  panelLabel: string;
  currentPane: PaneId;
  targetPane: PaneId;
  onClose: () => void;
  onKeep: () => void;
  onArrange: () => void;
}

export function ConfirmSmartPlaceModal({
  isOpen,
  panelLabel,
  currentPane,
  targetPane,
  onClose,
  onKeep,
  onArrange,
}: ConfirmSmartPlaceModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[400px]">
      <ModalBody className="py-6 px-5">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center text-primary shrink-0">
            <Sparkles className="w-5 h-5" strokeWidth={1.8} />
          </div>

          <h3 className="text-base font-semibold text-text-primary leading-snug">
            Arrange tab automatically?
          </h3>

          <p className="text-xs text-text-secondary leading-relaxed max-w-[300px]">
            Your layout places{' '}
            <b className="font-medium text-text-primary">{panelLabel}</b> tabs in{' '}
            <b className="font-medium text-primary">{PANE_LABELS[targetPane]}</b>. Open this tab there
            instead of <b className="font-medium text-text-primary">{PANE_LABELS[currentPane]}</b>?
          </p>
        </div>
      </ModalBody>

      <ModalFooter className="gap-0 p-0 border-t border-divider">
        <button
          onClick={onKeep}
          className="flex-1 h-[42px] text-xs font-medium text-text-secondary hover:bg-white/[0.03] hover:text-text-primary transition-colors border-r border-divider"
        >
          Keep here
        </button>
        <button
          onClick={onArrange}
          className="flex-1 h-[42px] text-xs font-semibold text-primary hover:bg-primary/[0.08] transition-colors flex items-center justify-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Arrange
        </button>
      </ModalFooter>
    </Modal>
  );
}

export default ConfirmSmartPlaceModal;