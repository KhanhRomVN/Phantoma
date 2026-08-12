/**
 * ------------------------------------------------------------------
 * Save Confirm Modal
 * ------------------------------------------------------------------
 * Modal dialog prompting the user to save unsaved files before
 * performing a destructive action (close tab, switch project, etc.).
 * Lists all unsaved files with icons and truncated paths. Offers
 * Save All, Don't Save, and Cancel (X) actions.
 *
 * Main features:
 * - Lists unsaved files with file-type icons and truncated paths
 * - Scrollable list when more than 3 files
 * - Save All button with loading spinner
 * - Don't Save button to discard changes and continue
 * - Error display on save failure
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useState, useMemo } from 'react';

// ── UI ──
import { Save } from 'lucide-react';

// ── Components ──
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@renderer/components/ui/Modal';

// ── Hooks ──
import { useCodeStore } from '../../hooks/useCodeStore';

// ── Utils ──
import { getFileIconPath } from '@renderer/shared/utils/fileIconMapper';

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Truncate a path by keeping the head and tail, replacing the middle with "..."
 * Example: "src/renderer/src/modules/Code/Code.tsx" → "src/.../modules/Code/Code.tsx"
 */
function truncatePathMiddle(path: string, maxLen: number): string {
  if (path.length <= maxLen) return path;
  const headLen = Math.floor(maxLen / 3);
  const tailLen = maxLen - headLen - 3;
  if (tailLen <= 0) return '...' + path.slice(-(maxLen - 3));
  return path.slice(0, headLen) + '...' + path.slice(-tailLen);
}

// ─── Component ──────────────────────────────────────────────────────────
export function SaveConfirmModal() {
  // ── Store ──
  const {
    isSaveConfirmModalOpen,
    setSaveConfirmModalOpen,
    pendingAction,
    setPendingAction,
    getUnsavedFiles,
    saveAllFiles,
    projects,
    currentProjectId,
  } = useCodeStore();

  // ── State ──
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Derived ──
  const currentProject = projects.find((p) => p.id === currentProjectId);

  const unsavedFiles = useMemo(() => {
    const ids = getUnsavedFiles();
    return ids.map((id) => {
      const displayName = currentProject?.fileDisplayNames[id] || id;
      const filePath = currentProject?.fileNodeMap[id]?.path || '';
      return { id, displayName, filePath };
    });
  }, [getUnsavedFiles, currentProject]);

  const unsavedCount = unsavedFiles.length;
  const hasOverflow = unsavedCount > 3;

  // ── Handlers ──
  const handleSaveAndContinue = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await saveAllFiles();
      if (pendingAction) pendingAction();
      setSaveConfirmModalOpen(false);
      setPendingAction(null);
    } catch (err) {
      setError('Failed to save some files. Please try again.');
      console.error('[SaveConfirmModal] Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardAndContinue = () => {
    if (pendingAction) pendingAction();
    setSaveConfirmModalOpen(false);
    setPendingAction(null);
  };

  const handleClose = () => {
    setSaveConfirmModalOpen(false);
    setPendingAction(null);
    setError(null);
  };

  if (!isSaveConfirmModalOpen) return null;

  // ── Render ──
  return (
    <Modal isOpen={isSaveConfirmModalOpen} onClose={handleClose} className="w-full max-w-lg">
      {/* Header with built-in X button, no description (custom below) */}
      <ModalHeader title="Unsaved Changes" onClose={handleClose} showCloseButton />

      {/* Description with highlighted count */}
      <p className="px-5 text-xs text-text-secondary -mt-1 mb-1">
        You have <span className="text-text-primary font-semibold">{unsavedCount}</span> unsaved{' '}
        {unsavedCount === 1 ? 'file' : 'files'}. Do you want to save before continuing?
      </p>

      {/* Body — file list */}
      <ModalBody className="px-5 py-3">
        <div className="border border-border rounded-lg overflow-hidden">
          <div className={hasOverflow ? 'max-h-[120px] overflow-y-auto' : ''}>
            {unsavedFiles.map((file) => {
              const truncatedPath = truncatePathMiddle(file.filePath, 50);
              return (
                <div
                  key={file.id}
                  className="flex items-center gap-2 px-3 py-2 text-sm border-b border-divider last:border-b-0"
                >
                  <img
                    src={getFileIconPath(file.displayName)}
                    alt=""
                    className="w-4 h-4 shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span className="text-text-primary font-medium shrink-0">{file.displayName}</span>
                  <span className="text-text-secondary truncate">({truncatedPath})</span>
                </div>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-error/10 border border-error/20 rounded-lg">
            <p className="text-sm text-error">{error}</p>
          </div>
        )}
      </ModalBody>

      {/* Footer — no Cancel button (X in header already) */}
      <ModalFooter className="px-4 py-3 border-t border-border flex items-center justify-end gap-2">
        <button
          onClick={handleDiscardAndContinue}
          disabled={isSaving}
          className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-sidebar-item-hover rounded-lg transition-colors disabled:opacity-50"
        >
          Don't Save
        </button>
        <button
          onClick={handleSaveAndContinue}
          disabled={isSaving}
          className="px-4 py-2 text-sm bg-primary text-white hover:bg-primary/90 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" strokeWidth={2} />
              Save All
            </>
          )}
        </button>
      </ModalFooter>
    </Modal>
  );
}