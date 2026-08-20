/**
 * ------------------------------------------------------------------
 * useWorkspaceData
 * ------------------------------------------------------------------
 * Hook quản lý dữ liệu workspace (files, folders, rules).
 * Lắng nghe responses từ VSCode extension và load rules từ localStorage.
 *
 * Main returns:
 * - availableFiles   : Danh sách files trong workspace
 * - availableFolders : Danh sách folders trong workspace
 * - availableRules   : Danh sách rules từ localStorage
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Utils ──
import { logger } from '@renderer/utils/logger';

// ── React ──
import { useState, useEffect, useRef } from 'react';

// ── Types ──
import { Rule, WorkspaceItem } from '../../types/workspace';

// ─── Hook ───────────────────────────────────────────────────────────────
export const useWorkspaceData = () => {
  const renderCountRef = useRef(0);
  const filesUpdateCountRef = useRef(0);
  const foldersUpdateCountRef = useRef(0);

  renderCountRef.current += 1;

  const [availableFiles, setAvailableFiles] = useState<WorkspaceItem[]>([]);
  const [availableFolders, setAvailableFolders] = useState<WorkspaceItem[]>([]);
  const [availableRules, setAvailableRules] = useState<Rule[]>([]);

  // Listen for workspace files/folders responses from extension
  useEffect(() => {
    const handleWorkspaceResponse = (event: MessageEvent) => {
      const data = event.data;

      if (data.command === 'workspaceFilesResponse') {
        if (data.files && !data.error) {
          filesUpdateCountRef.current += 1;
          setAvailableFiles(data.files);
        }
      } else if (data.command === 'workspaceFoldersResponse') {
        if (data.folders && !data.error) {
          foldersUpdateCountRef.current += 1;
          setAvailableFolders(data.folders);
        }
      }
    };

    window.addEventListener('message', handleWorkspaceResponse);

    // Eagerly fetch workspace folders to ensure we have a fallback path
    const vscodeApi = (window as any).vscodeApi;
    if (vscodeApi) {
      vscodeApi.postMessage({ command: 'getWorkspaceFolders' });
    }

    return () => {
      window.removeEventListener('message', handleWorkspaceResponse);
    };
  }, []);

  // Load rules from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('zen-rules');

    if (stored) {
      try {
        const rules = JSON.parse(stored);
        setAvailableRules(rules);
      } catch (error) {
        logger.warn('[useWorkspaceData] Failed to parse rules:', error);
      }
    }
  }, []);

  return {
    availableFiles,
    availableFolders,
    availableRules,
  };
};
