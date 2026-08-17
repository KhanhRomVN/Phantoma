import React from 'react';
import { createPortal } from 'react-dom';

interface RevertConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
}

const RevertConfirmModal: React.FC<RevertConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Revert conversation?',
  description = 'This will restore all modified files to their state before this message. Messages after this point will be removed.',
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-[var(--vscode-editor-background)] border border-[var(--vscode-panel-border)] rounded-lg p-5 min-w-[300px] max-w-[400px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-semibold text-sm mb-2">{title}</div>
        <div className="text-xs text-[var(--vscode-descriptionForeground)] mb-4">{description}</div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded text-xs cursor-pointer bg-transparent border border-[var(--vscode-panel-border)] text-[var(--vscode-foreground)]"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onClose();
              onConfirm();
            }}
            className="px-3.5 py-1.5 rounded text-xs cursor-pointer bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] font-semibold border-none"
          >
            Revert
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default RevertConfirmModal;