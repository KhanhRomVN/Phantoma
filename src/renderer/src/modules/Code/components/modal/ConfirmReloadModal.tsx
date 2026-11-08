import { useState } from 'react';
import { RefreshCw, Save } from 'lucide-react';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';
import { Button } from '@renderer/components/ui/Button';

interface ConfirmReloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAndReload: () => Promise<void> | void;
  onReloadWithoutSaving: () => void;
  unsavedCount: number;
}

export function ConfirmReloadModal({
  isOpen,
  onClose,
  onSaveAndReload,
  onReloadWithoutSaving,
  unsavedCount,
}: ConfirmReloadModalProps) {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveAndReload();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[420px]">
      <ModalBody className="py-6 px-5">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-warn/10 border border-warn/20 grid place-items-center text-warn shrink-0">
            <RefreshCw className="w-5 h-5" strokeWidth={1.8} />
          </div>

          <h3 className="text-base font-semibold text-text-primary leading-snug">
            Reload with unsaved changes?
          </h3>

          <p className="text-xs text-text-secondary leading-relaxed max-w-[300px]">
            <b className="font-medium text-text-primary">{unsavedCount}</b> file(s) have unsaved
            changes. Save them before reloading the app?
          </p>
        </div>
      </ModalBody>

      <ModalFooter className="gap-0 p-0 border-t border-divider">
        <Button
          onClick={onClose}
          disabled={saving}
          className="flex-1 h-[42px] text-xs font-medium bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/20 hover:text-text-primary active:bg-text-secondary/30 border-r border-divider rounded-none disabled:opacity-50"
        >
          Cancel
        </Button>
        <Button
          onClick={onReloadWithoutSaving}
          disabled={saving}
          className="flex-1 h-[42px] text-xs font-medium bg-error/10 text-error hover:bg-error hover:text-text-primary active:bg-error/80 transition-colors border-r border-divider rounded-none flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Don't Save
        </Button>
        <Button
          onClick={() => void handleSave()}
          disabled={saving}
          className="flex-1 h-[42px] text-xs font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-text-primary active:bg-primary/80 transition-colors rounded-none flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          Save All
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default ConfirmReloadModal;