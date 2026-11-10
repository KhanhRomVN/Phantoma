/**
 * ------------------------------------------------------------------
 * Confirm Delete File Modal
 * ------------------------------------------------------------------
 * Confirmation dialog before permanently deleting files or folders
 * from the file explorer. Supports single and multi-item deletion
 * with a centered warning layout matching ConfirmDeleteProjectModal.
 *
 * Main features:
 * - Single item: shows filename highlighted in the description
 * - Multi item: summary count + fixed-height scrollable list with icons
 * - Centered alert badge + title + description
 * - Split Cancel / Delete footer buttons
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── UI 
import { AlertTriangle, Trash2 } from 'lucide-react';
// ── Components ──
import { Modal } from '@renderer/components/ui/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';
// ── Utils ──
import { getFileIconPath, getFolderIconPath } from '@renderer/utils/file-icon';

// ─── Interfaces ─────────────────────────────────────────────────────────
export interface DeleteItem {
  name: string;
  path: string;
  isFolder: boolean;
}

interface ConfirmDeleteFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  items: DeleteItem[];
}

// ─── Helpers ────────────────────────────────────────────────────────────
const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

// ─── Component ─────────────────────────────────────────────────────────
export function ConfirmDeleteFileModal({
  isOpen,
  onClose,
  onConfirm,
  items,
}: ConfirmDeleteFileModalProps) {
  // ── Derived ──
  const count = items.length;
  const isMulti = count > 1;
  const folderCount = items.filter((i) => i.isFolder).length;
  const fileCount = count - folderCount;
  const summary = [fileCount > 0 && plural(fileCount, 'file'), folderCount > 0 && plural(folderCount, 'folder')]
    .filter(Boolean)
    .join(', ');
  const title = isMulti ? `Delete ${count} items?` : items[0]?.isFolder ? 'Delete folder?' : 'Delete file?';

  // ── Render ──
  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdropClick={false} className="max-w-[400px]">
      <ModalBody className="py-6 px-5">
        {/* Centered vertical stack: Badge Icon → Title → Description → Item list */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-error/10 border border-error/20 grid place-items-center text-error shrink-0">
            <AlertTriangle className="w-5 h-5" strokeWidth={1.8} />
          </div>

          <h3 className="text-base font-semibold text-text-primary leading-snug">{title}</h3>

          <p className="text-xs text-text-secondary leading-relaxed max-w-[280px]">
            Are you sure you want to delete{' '}
            <b className="font-medium text-text-primary break-all">
              {isMulti ? summary : `"${items[0]?.name || ''}"`}
            </b>
            ? This action cannot be undone.
          </p>

          {isMulti && (
            <div className="w-full max-h-48 overflow-y-auto bg-card-background rounded-md p-1.5 mt-1 text-left">
              {items.map((item, i) => (
                <div
                  key={`${item.path}-${i}`}
                  className="flex items-center gap-2 py-1 px-1.5 text-[12px] text-text-secondary"
                  title={item.path || item.name}
                >
                  <img
                    src={item.isFolder ? getFolderIconPath(item.name) : getFileIconPath(item.name)}
                    alt=""
                    className="w-4 h-4 shrink-0"
                  />
                  <span className="truncate">{item.name}</span>
                </div>
              ))}
            </div>
          )}
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
          Delete
        </button>
      </ModalFooter>
    </Modal>
  );
}

export default ConfirmDeleteFileModal;