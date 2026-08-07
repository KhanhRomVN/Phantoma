import { useEffect, useCallback, useRef } from 'react';
import { useCodeStore } from './useCodeStore';
import {
  getLSPServer,
  isLSPInstalled,
  isLSPDismissed,
  markLSPInstalled,
  dismissLSP,
  type LSPServer,
} from '../services/lsp.service';
import { toastService } from '../services/toast.service';

const LSP_TOAST_ID = 'lsp-install';

export function useLSPNotifier() {
  const projects = useCodeStore((s) => s.projects);
  const currentProjectId = useCodeStore((s) => s.currentProjectId);
  const forceShowLSPOverlay = useCodeStore((s) => s.forceShowLSPOverlay);
  const setForceShowLSPOverlay = useCodeStore((s) => s.setForceShowLSPOverlay);

  const project = projects.find((p) => p.id === currentProjectId);
  const activeFileTabId = project?.activeFileTabId ?? null;
  const fileDisplayNames = project?.fileDisplayNames ?? {};

  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const serverRef = useRef<LSPServer | null>(null);

  // ── Progress simulation ──────────────────────────────────────────────────

  const startProgressSimulation = useCallback(() => {
    let progress = 0;
    toastService.update(LSP_TOAST_ID, { progress: 0 });
    progressIntervalRef.current = setInterval(() => {
      progress += Math.random() * 16 + 6;
      if (progress >= 100) {
        progress = 100;
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      }
      toastService.update(LSP_TOAST_ID, { progress });
    }, 220);
  }, []);

  // ── Install handler ──────────────────────────────────────────────────────

  const handleInstall = useCallback(async () => {
    const server = serverRef.current;
    if (!server) return;

    toastService.update(LSP_TOAST_ID, { variant: 'loading', actions: [] });
    startProgressSimulation();

    try {
      await window.api.invoke('shell:exec', `npm install -g ${server.npmPackage}`);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      markLSPInstalled(server.id);
      toastService.update(LSP_TOAST_ID, {
        progress: 100,
        variant: 'success',
        title: server.name,
        description: 'Cài đặt hoàn tất.',
        actions: [
          {
            label: 'Done',
            onClick: () => {
              toastService.dismiss(LSP_TOAST_ID);
              setForceShowLSPOverlay(false);
            },
            variant: 'primary',
          },
        ],
      });
    } catch {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      toastService.update(LSP_TOAST_ID, {
        variant: 'error',
        title: server.name,
        description: 'Cài đặt thất bại. Vui lòng thử lại.',
        progress: undefined,
        actions: [
          { label: 'Retry', onClick: () => handleInstall(), variant: 'primary' },
          {
            label: 'Cancel',
            onClick: () => {
              toastService.dismiss(LSP_TOAST_ID);
              setForceShowLSPOverlay(false);
            },
            variant: 'ghost',
          },
        ],
      });
    }
  }, [startProgressSimulation, setForceShowLSPOverlay]);

  // ── Show toast ───────────────────────────────────────────────────────────

  const showLSPToast = useCallback(
    (server: LSPServer) => {
      serverRef.current = server;
      const actions: Array<{
        label: string;
        onClick: () => void;
        variant: 'primary' | 'secondary' | 'ghost';
      }> = [];

      // Nút Install
      actions.push({ label: 'Install', onClick: () => handleInstall(), variant: 'primary' });

      // Nút Cancel
      actions.push({
        label: 'Cancel',
        onClick: () => {
          dismissLSP(server.id);
          toastService.dismiss(LSP_TOAST_ID);
          setForceShowLSPOverlay(false);
        },
        variant: 'ghost',
      });

      // Nút Homepage (nếu có)
      if (server.homepage) {
        actions.push({
          label: 'Homepage',
          onClick: () => window.api.invoke('openFolder', { path: server.homepage }),
          variant: 'ghost',
        });
      }

      toastService.show({
        id: LSP_TOAST_ID,
        title: server.name,
        description: server.description,
        variant: 'info',
        source: 'npm registry',
        actions: actions.slice(0, 3),
        onClose: () => setForceShowLSPOverlay(false),
      });
    },
    [handleInstall, setForceShowLSPOverlay],
  );

  // ── Watch file changes ──────────────────────────────────────────────────

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!activeFileTabId) {
        toastService.dismiss(LSP_TOAST_ID);
        return;
      }

      const filename = fileDisplayNames[activeFileTabId] || activeFileTabId;
      const detected = getLSPServer(filename);

      if (!detected) {
        toastService.dismiss(LSP_TOAST_ID);
        return;
      }

      if (forceShowLSPOverlay) {
        showLSPToast(detected);
        return;
      }

      if (isLSPInstalled(detected.id) || isLSPDismissed(detected.id)) {
        toastService.dismiss(LSP_TOAST_ID);
        return;
      }

      showLSPToast(detected);
    }, 1500);

    return () => clearTimeout(timer);
  }, [activeFileTabId, fileDisplayNames, forceShowLSPOverlay, showLSPToast]);

  // ── Cleanup ──────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);
}