import { useState } from 'react';
import { RefreshCw, Save } from 'lucide-react';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';
import type { UnsavedGroup } from '@renderer/shared/unsaved/unsavedRegistry';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: UnsavedGroup[];
  hasSaveError: boolean;
  onSaveAll: () => Promise<void> | void;
  onDiscard: () => void;
}

export function UnsavedChangesModal({
  isOpen,
  onClose,
  groups,
  hasSaveError,
  onSaveAll,
  onDiscard,
}: UnsavedChangesModalProps) {
  const [saving, setSaving] = useState(false);
  const unsavedCount = groups.reduce((n, g) => n + g.items.length, 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveAll();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[420px]">
      <ModalBody className="pt-8 pb-6 px-5">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="relative w-11 h-11 rounded-xl bg-error/15 grid place-items-center text-error shrink-0">
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 44 44"
              fill="none"
            >
              <rect
                x="0.5"
                y="0.5"
                width="43"
                height="43"
                rx="11.5"
                stroke="currentColor"
                strokeOpacity="0.5"
                strokeWidth="1"
                strokeDasharray="4 3"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="0"
                  to="-7"
                  dur="0.8s"
                  repeatCount="indefinite"
                />
              </rect>
            </svg>
            <RefreshCw className="w-5 h-5" strokeWidth={1.8} />
          </div>

          <h3 className="text-base font-semibold text-text-primary leading-snug">
            Reload with unsaved changes?
          </h3>

          <p className="text-xs text-text-secondary leading-relaxed max-w-[300px]">
            <b className="font-medium text-text-primary">{unsavedCount}</b> file(s) have unsaved
            changes. Save them before reloading the app?
          </p>

          {hasSaveError && (
            <p className="text-xs text-error leading-relaxed">
              Some files could not be saved. Please check them and try again.
            </p>
          )}
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
          onClick={onDiscard}
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

export default UnsavedChangesModal;
