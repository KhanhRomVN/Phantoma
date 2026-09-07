/**
 * ------------------------------------------------------------------
 * useLSP Notifier
 * ------------------------------------------------------------------
 * Hook that monitors the active file and automatically installs the
 * corresponding LSP server if detected but not yet installed.
 * No toast notifications are shown — installation runs silently.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import { useEffect, useCallback, useRef } from 'react';

// ── Hooks ──
import { useCodeStore } from './useCodeStore';

// ── Services ──
import {
  getLSPServer,
  isLSPInstalled,
  markLSPInstalled,
  type LSPServer,
} from '../services/lsp.service';

// ─── Hook ───────────────────────────────────────────────────────────────
export function useLSPNotifier() {
  // ── Store ──
  const projects = useCodeStore((s) => s.projects);
  const currentProjectId = useCodeStore((s) => s.currentProjectId);

  // ── Derived ──
  const project = projects.find((p) => p.id === currentProjectId);
  const activeFileTabId = project?.activeFileTabId ?? null;
  const fileDisplayNames = project?.fileDisplayNames ?? {};

  // ── Refs ──
  const installingRef = useRef<Set<string>>(new Set());

  // ── Callbacks ──

  const autoInstallLSP = useCallback(async (server: LSPServer) => {
    if (installingRef.current.has(server.id)) return;
    installingRef.current.add(server.id);

    try {
      await window.api.invoke('shell:exec', `npm install -g ${server.npmPackage}`);
      markLSPInstalled(server.id);
    } catch {
      // silently ignore — user can install from ActivityPanel later
    } finally {
      installingRef.current.delete(server.id);
    }
  }, []);

  // ── Effects ──

  // Watch file changes and auto-install missing LSP servers
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!activeFileTabId) return;

      const filename = fileDisplayNames[activeFileTabId] || activeFileTabId;
      const detected = getLSPServer(filename);

      if (!detected || isLSPInstalled(detected.id)) return;

      void autoInstallLSP(detected);
    }, 1500);

    return () => clearTimeout(timer);
  }, [activeFileTabId, fileDisplayNames, autoInstallLSP]);
}