/**
 * ------------------------------------------------------------------
 * File Tab Bar
 * ------------------------------------------------------------------
 * Horizontal tab bar for open files within the current project.
 * Each tab shows a file-type icon, display name, and unsaved indicator.
 * Right-click context menu provides Close, Close Others, Close to the
 * Right, Close All, and Copy Path actions. Unsaved files trigger a
 * save-check guard before closing.
 *
 * Main features:
 * - Open file tabs with file-type icons
 * - Unsaved indicator (dot) that transforms to X on hover
 * - Right-click context menu with 5 actions
 * - Save-check guard for unsaved files before close
 * - Hides entirely when no files are open
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useState, useCallback } from 'react';

// ── UI ──
import { X, CircleDot, Copy, Plus } from 'lucide-react';

// ── Hooks ──
import { useCodeStore } from '../../hooks/useCodeStore';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';
import { getFileIconPath } from '@renderer/shared/utils/fileIconMapper';

// ── Components ──
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from '@renderer/components/ui/Dropdown';

// ─── Component ──────────────────────────────────────────────────────────
export function FileTabBar() {
  console.log('[DEBUG|FileTabBar] render');
  // ── Store — select riêng fields thay vì toàn bộ projects array ──
  const openFiles = useCodeStore((s) => {
    const p = s.projects.find((p) => p.id === s.currentProjectId);
    return p?.openFiles ?? [];
  });
  const fileDisplayNames = useCodeStore((s) => {
    const p = s.projects.find((p) => p.id === s.currentProjectId);
    return p?.fileDisplayNames ?? {};
  });
  const activeFileTabId = useCodeStore((s) => {
    const p = s.projects.find((p) => p.id === s.currentProjectId);
    return p?.activeFileTabId ?? null;
  });
  const fileNodeMap = useCodeStore((s) => {
    const p = s.projects.find((p) => p.id === s.currentProjectId);
    return p?.fileNodeMap ?? {};
  });
  const unsavedFiles = useCodeStore((s) => {
    const p = s.projects.find((p) => p.id === s.currentProjectId);
    return p?.unsavedFiles ?? new Set<string>();
  });
  const setActiveFileTab = useCodeStore((s) => s.setActiveFileTab);
  const closeFile = useCodeStore((s) => s.closeFile);
  const executeWithSaveCheck = useCodeStore((s) => s.executeWithSaveCheck);

  // ── State ──
  const [contextMenuTabId, setContextMenuTabId] = useState<string | null>(null);

  // ── Derived ──
  if (openFiles.length === 0) {
    return null;
  }

  // ── Callbacks ──
  const handleClose = useCallback(
    (fileId: string) => {
      const isUnsaved = unsavedFiles.has(fileId);
      if (isUnsaved) {
        executeWithSaveCheck(() => closeFile(fileId));
      } else {
        closeFile(fileId);
      }
    },
    [closeFile, executeWithSaveCheck, unsavedFiles],
  );

  const handleCloseOthers = useCallback(
    (fileId: string) => {
      openFiles.forEach((id) => {
        if (id !== fileId) {
          if (unsavedFiles.has(id)) {
            executeWithSaveCheck(() => closeFile(id));
          } else {
            closeFile(id);
          }
        }
      });
    },
    [openFiles, closeFile, executeWithSaveCheck, unsavedFiles],
  );

  const handleCloseToTheRight = useCallback(
    (fileId: string) => {
      const idx = openFiles.indexOf(fileId);
      if (idx === -1) return;
      for (let i = idx + 1; i < openFiles.length; i++) {
        const id = openFiles[i];
        if (unsavedFiles.has(id)) {
          executeWithSaveCheck(() => closeFile(id));
        } else {
          closeFile(id);
        }
      }
    },
    [openFiles, closeFile, executeWithSaveCheck, unsavedFiles],
  );

  const handleCloseAll = useCallback(() => {
    openFiles.forEach((id) => {
      if (unsavedFiles.has(id)) {
        executeWithSaveCheck(() => closeFile(id));
      } else {
        closeFile(id);
      }
    });
  }, [openFiles, closeFile, executeWithSaveCheck, unsavedFiles]);

  const handleCopyPath = useCallback(
    (fileId: string) => {
      const node = fileNodeMap[fileId];
      if (node?.path) {
        navigator.clipboard.writeText(node.path).catch(() => {});
      }
    },
    [fileNodeMap],
  );

  // ── Render ──
  return (
    <div className="flex items-center h-9 bg-sidebar-background border-b border-divider px-1 overflow-x-auto flex-shrink-0 gap-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {openFiles.map((fileId) => {
        const displayName = fileDisplayNames[fileId] || fileId;
        const isActive = activeFileTabId === fileId;
        const isUnsaved = unsavedFiles.has(fileId);

        return (
          <Dropdown
            key={fileId}
            open={contextMenuTabId === fileId}
            onOpenChange={(open) => setContextMenuTabId(open ? fileId : null)}
            trigger="contextmenu"
          >
            <DropdownTrigger asChild>
              <button
                onClick={() => {
                  setActiveFileTab(fileId);
                }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 h-full text-[13px] whitespace-nowrap transition-colors group',
                  'border-t-2',
                  isActive
                    ? 'text-text-primary border-t-primary bg-background'
                    : 'text-text-secondary border-t-transparent hover:text-text-secondary hover:border-t-divider hover:bg-sidebar-item-hover/30',
                )}
              >
                <img
                  src={getFileIconPath(displayName)}
                  alt=""
                  className="w-4 h-4 shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span>{displayName}</span>

                {/* Unsaved indicator / Close button */}
                {isUnsaved ? (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      executeWithSaveCheck(() => closeFile(fileId));
                    }}
                    className={cn(
                      'p-0.5 rounded text-warning hover:text-error transition-colors ml-0.5 group/close',
                      isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                    )}
                    title="File has unsaved changes"
                  >
                    <CircleDot
                      className="w-3 h-3 group-hover/close:hidden"
                      strokeWidth={2}
                      fill="currentColor"
                    />
                    <Plus
                      className="w-3 h-3 hidden group-hover/close:block rotate-45"
                      strokeWidth={2.5}
                    />
                  </span>
                ) : (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      closeFile(fileId);
                    }}
                    className={cn(
                      'p-0.5 rounded text-text-primary hover:text-error transition-colors ml-0.5',
                      isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                    )}
                  >
                    <X className="w-3 h-3" strokeWidth={1.5} />
                  </span>
                )}
              </button>
            </DropdownTrigger>
            <DropdownContent className="min-w-[180px]">
              <DropdownItem onClick={() => handleClose(fileId)}>Close</DropdownItem>
              <DropdownItem onClick={() => handleCloseOthers(fileId)}>Close Others</DropdownItem>
              <DropdownItem onClick={() => handleCloseToTheRight(fileId)}>
                Close to the Right
              </DropdownItem>
              <DropdownItem onClick={handleCloseAll}>Close All</DropdownItem>
              <DropdownSeparator />
              <DropdownItem
                icon={<Copy className="w-3.5 h-3.5" />}
                onClick={() => handleCopyPath(fileId)}
              >
                Copy Path
              </DropdownItem>
            </DropdownContent>
          </Dropdown>
        );
      })}
    </div>
  );
}