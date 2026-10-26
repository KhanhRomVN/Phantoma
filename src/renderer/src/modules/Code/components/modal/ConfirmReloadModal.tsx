import { useState } from 'react';
import { RefreshCw, Save } from 'lucide-react';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';

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
          <div className="w-11 h-11 rounded-xl bg-warning/10 border border-warning/20 grid place-items-center text-warning shrink-0">
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
        <button
          onClick={onClose}
          disabled={saving}
          className="flex-1 h-[42px] text-xs font-medium text-text-secondary hover:bg-white/[0.03] hover:text-text-primary transition-colors border-r border-divider disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onReloadWithoutSaving}
          disabled={saving}
          className="flex-1 h-[42px] text-xs font-medium text-error hover:bg-error/[0.06] transition-colors border-r border-divider flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Don't Save
        </button>
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="flex-1 h-[42px] text-xs font-semibold text-primary hover:bg-primary/[0.06] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          Save All
        </button>
      </ModalFooter>
    </Modal>
  );
}

export default ConfirmReloadModal;