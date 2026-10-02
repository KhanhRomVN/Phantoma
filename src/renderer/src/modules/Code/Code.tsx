/**
 * ------------------------------------------------------------------
 * Code
 * ------------------------------------------------------------------
 * Main layout component for the Code editor module.
 * Orchestrates the project tabs, service tabs, activity panel,
 * content panel (Monaco editor), bottom panel, and footer bar.
 * Handles global keyboard shortcuts and coordinates LSP notifications.
 *
 * Main features:
 * - Project & service tab navigation
 * - Keyboard shortcuts: Ctrl+O (open), Ctrl+N (new), Ctrl+P (quick open),
 *   Ctrl+S (save), Ctrl+Shift+S (save-as), Ctrl+W (close tab),
 *   Ctrl+` (toggle bottom panel), Ctrl+Shift+` (new terminal)
 * - Unsaved changes guard on browser close
 * - Auto-restores project file trees from localStorage on startup
 * - Bridges Code state to Agent feature context
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import { logger } from '@renderer/utils/logger';
// ── React ──
import { useEffect, useRef, useState } from 'react';

// ── Hooks & Types ──
import { useCodeStore, type FileNode } from './hooks/useCodeStore';

// ── Components ──
import { ContentPanel } from './components/ContentPanel';
import { ActivityPanel } from './components/ActivityPanel';
import { ToastContainer } from './components/common/ToastContainer';
import { FooterBar } from './components/FooterBar';
import { ProjectPanel } from './components/ProjectPanel/ProjectPanel';

// ─── Directory Scanner ─────────────────────────────────────────────────

interface DirEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  mtime: number;
}

let scanIdCounter = 0;

/** Recursively scans a directory via IPC and builds a FileNode tree. */
async function scanDirectory(dirPath: string, depth = 0): Promise<FileNode[]> {
  if (depth > 8) return []; // safety cap against runaway recursion
  let entries: DirEntry[];
  try {
    entries = await window.api.invoke('fs:list-dir', dirPath);
  } catch {
    return [];
  }
  if (!Array.isArray(entries)) return [];

  const nodes: FileNode[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const node: FileNode = {
      id: `scan_${++scanIdCounter}`,
      name: entry.name,
      type: entry.isDirectory ? 'folder' : 'file',
      path: entry.path,
    };
    if (entry.isDirectory) {
      node.children = await scanDirectory(entry.path, depth + 1);
    }
    nodes.push(node);
  }
  return nodes;
}

// ─── Component ──────────────────────────────────────────────────────────
export function Code() {
  // ── Store ──
  const {
    setProjectManagerOpen,
    setNewProjectOpen,
    projects,
    hydrateProjectFiles,
    hasUnsavedChanges,
  } = useCodeStore();
  // ── State ──
  const [, setQuickOpenOpen] = useState(false);

  // ── Refs ──
  const hydratedRef = useRef(false);

  // ── Effects ──
  // Prevent closing app with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Restore project files from localStorage on startup
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    projects.forEach((project) => {
      if (project.path && project.files.length === 0) {
        scanDirectory(project.path)
          .then((files: FileNode[]) => {
            hydrateProjectFiles(project.id, files);
          })
          .catch((err: unknown) => {
            logger.error('[Code] Failed to scan directory:', err);
          });
      }
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ctrl+O: Open project
      if (e.ctrlKey && e.key === 'o') {
        e.preventDefault();
        setProjectManagerOpen(true);
        return;
      }
      // Ctrl+N: New project
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        setNewProjectOpen(true);
        return;
      }
      // Ctrl+P: Quick Open file
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        setQuickOpenOpen(true);
        return;
      }

      // Shortcuts that need active file
      const state = useCodeStore.getState();
      const project = state.projects.find((p) => p.id === state.currentProjectId);
      const activeFileId = project?.activeFileTabId;
      const fileNode = activeFileId ? project?.fileNodeMap[activeFileId] : null;

      // Ctrl+S: Save current file
      if (e.ctrlKey && !e.shiftKey && e.key === 's') {
        e.preventDefault();
        if (!activeFileId || !fileNode) return;
        try {
          const monaco = (window as any).monaco;
          if (monaco && fileNode.path) {
            const uri = monaco.Uri.parse('file://' + fileNode.path);
            const model = monaco.editor.getModel(uri);
            if (model) {
              const content = model.getValue();
              state.markFileAsUnsaved(activeFileId, content);
            }
          }
          await state.saveFile(activeFileId);
        } catch (err) {
          logger.error('[Code] Ctrl+S save failed:', err);
        }
        return;
      }

      // Ctrl+Shift+S: Save as new file
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        if (!activeFileId || !fileNode) return;
        try {
          const monaco = (window as any).monaco;
          let content = fileNode.content || '';
          if (monaco && fileNode.path) {
            const uri = monaco.Uri.parse('file://' + fileNode.path);
            const model = monaco.editor.getModel(uri);
            if (model) {
              content = model.getValue();
            }
          }
          const currentPath = fileNode.path || '';
          const dir = currentPath.includes('/')
            ? currentPath.substring(0, currentPath.lastIndexOf('/'))
            : '';
          const baseName = currentPath.includes('/')
            ? currentPath.substring(currentPath.lastIndexOf('/') + 1)
            : currentPath;
          const dotIdx = baseName.lastIndexOf('.');
          const stem = dotIdx > 0 ? baseName.substring(0, dotIdx) : baseName;
          const ext = dotIdx > 0 ? baseName.substring(dotIdx) : '';
          const defaultPath = dir ? dir + '/' + stem + '_copy' + ext : stem + '_copy' + ext;

          const result = await window.api.invoke('showSaveDialog', { defaultPath });
          if (!result || result.canceled || !result.filePath) return;
          await window.api.invoke('fs:write-file', result.filePath, content);
        } catch (err) {
          logger.error('[Code] Ctrl+Shift+S save-as failed:', err);
        }
        return;
      }

      // Ctrl+W: Close active tab
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        if (activeFileId) {
          state.closeFile(activeFileId);
        }
        return;
      }

      // BottomPanel removed — keyboard shortcuts for toggle/terminal no longer needed
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setProjectManagerOpen, setNewProjectOpen]);

  // ── Render ──
  return (
    <div className="flex flex-col h-full w-full bg-background relative">
      <div className="flex flex-1 min-h-0">
        <ProjectPanel />
        <div className="flex-1 flex flex-col min-w-0 relative">
          <ContentPanel />
          <ToastContainer />
        </div>
        <ActivityPanel />
      </div>
      <FooterBar />
    </div>
  );
}

export default Code;
