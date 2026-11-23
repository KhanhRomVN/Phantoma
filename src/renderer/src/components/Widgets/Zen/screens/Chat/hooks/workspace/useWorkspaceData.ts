/**
 * ------------------------------------------------------------------
 * useWorkspaceData
 * ------------------------------------------------------------------
 * Hook quản lý dữ liệu workspace (files, folders, rules). Gọi IPC
 * `workspace:get-files` để lấy dữ liệu từ main process.
 *
 * Main returns:
 * - availableFiles   : Danh sách files trong workspace
 * - availableFolders : Danh sách folders trong workspace
 * - availableRules   : Danh sách rules từ localStorage
 * ------------------------------------------------------------------
 */

// ── React ──
import { useState, useEffect } from 'react';

// ── Types ──
import { Rule, WorkspaceItem } from '../../types/workspace';

// ─── Hook ───────────────────────────────────────────────────────────────
export const useWorkspaceData = (rootPath?: string | null) => {
  const [availableFiles, setAvailableFiles] = useState<WorkspaceItem[]>([]);
  const [availableFolders, setAvailableFolders] = useState<WorkspaceItem[]>([]);
  const [availableRules, setAvailableRules] = useState<Rule[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch workspace files/folders via IPC
  useEffect(() => {
    if (!rootPath) {
      setAvailableFiles([]);
      setAvailableFolders([]);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        const api = (window as any).api;
        if (!api?.invoke) return;
        const res = await api.invoke('workspace:get-files', rootPath);
        if (cancelled) return;
        if (res?.success) {
          setAvailableFiles((res.files ?? []) as WorkspaceItem[]);
          setAvailableFolders((res.folders ?? []) as WorkspaceItem[]);
        }
      } catch (err) {
        console.warn('[useWorkspaceData] Failed to fetch workspace:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rootPath]);

  // Load rules from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('zen-rules');
    if (stored) {
      try {
        const rules = JSON.parse(stored);
        setAvailableRules(rules);
      } catch (error) {
        console.warn('[useWorkspaceData] Failed to parse rules:', error);
      }
    }
  }, []);

  return {
    availableFiles,
    availableFolders,
    availableRules,
    isLoading,
  };
};