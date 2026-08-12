/**
 * ------------------------------------------------------------------
 * FooterBar
 * ------------------------------------------------------------------
 * Status bar displayed at the bottom of the Code editor module.
 * Shows LSP (Language Server Protocol) status for the active file,
 * including install prompts, initialization progress, and connection state.
 *
 * Main features:
 * - Detects and displays the LSP server for the current file type
 * - Shows install prompt (⚠) for detected but not installed LSP servers
 * - Shows checkmark for installed and active LSP servers
 * - Displays real-time LSP initialization progress bar with percentage
 * - Auto-hides progress bar after diagnostics are ready
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useState, useEffect, useCallback } from 'react';

// ── UI ──
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

// ── Hooks ──
import { useCodeStore } from '../hooks/useCodeStore';

// ── Services ──
import {
  getLSPServer,
  isLSPInstalled,
  isLSPDismissed,
  type LSPServer,
} from '../services/lsp.service';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';

// ─── Interfaces ─────────────────────────────────────────────────────────
interface FooterBarProps {
  className?: string;
}

interface LSPInitStatus {
  isInitializing: boolean;
  progress: number; // 0-100
  currentFile: string | null;
  language: string | null;
}

// ─── Component ──────────────────────────────────────────────────────────
export function FooterBar({ className }: FooterBarProps) {
  // ── State ──
  const [activeLSP, setActiveLSP] = useState<LSPServer | null>(null);
  const [pendingLSP, setPendingLSP] = useState(false);
  const [lspInitStatus, setLspInitStatus] = useState<LSPInitStatus>({
    isInitializing: false,
    progress: 0,
    currentFile: null,
    language: null,
  });

  // ── Store ──
  const projects = useCodeStore((s) => s.projects);
  const currentProjectId = useCodeStore((s) => s.currentProjectId);
  const setForceShowLSPOverlay = useCodeStore((s) => s.setForceShowLSPOverlay);

  // ── Derived ──
  const project = projects.find((p) => p.id === currentProjectId);
  const activeFileTabId = project?.activeFileTabId ?? null;
  const fileDisplayNames = project?.fileDisplayNames ?? {};

  // ── Callbacks ──
  const checkLSP = useCallback(() => {
    if (!activeFileTabId) {
      setActiveLSP(null);
      setPendingLSP(false);
      return;
    }

    const filename = fileDisplayNames[activeFileTabId] || activeFileTabId;
    const detected = getLSPServer(filename);

    if (!detected) {
      setActiveLSP(null);
      setPendingLSP(false);
      return;
    }

    setActiveLSP(detected);
    setPendingLSP(!isLSPInstalled(detected.id) && !isLSPDismissed(detected.id));
  }, [activeFileTabId, fileDisplayNames]);

  // ── Effects ──
  useEffect(() => {
    const timer = setTimeout(checkLSP, 1500);
    return () => clearTimeout(timer);
  }, [checkLSP]);

  useEffect(() => {
    const handleLSPInitStart = (event: CustomEvent) => {
      const { language, file } = event.detail || {};
      setLspInitStatus({
        isInitializing: true,
        progress: 0,
        currentFile: file || null,
        language: language || null,
      });
    };

    const handleLSPInitProgress = (event: CustomEvent) => {
      const { progress } = event.detail || {};
      setLspInitStatus((prev) => ({
        ...prev,
        progress: Math.min(progress || 0, 100),
      }));
    };

    const handleLSPInitComplete = () => {
      setLspInitStatus((prev) => ({
        ...prev,
        isInitializing: false,
        progress: 100,
      }));
    };

    const handleDiagnosticsReady = () => {
      setTimeout(() => {
        setLspInitStatus({
          isInitializing: false,
          progress: 0,
          currentFile: null,
          language: null,
        });
      }, 500);
    };

    window.addEventListener('lsp:init:start', handleLSPInitStart as EventListener);
    window.addEventListener('lsp:init:progress', handleLSPInitProgress as EventListener);
    window.addEventListener('lsp:init:complete', handleLSPInitComplete as EventListener);
    window.addEventListener('lsp:diagnostics:ready', handleDiagnosticsReady as EventListener);

    return () => {
      window.removeEventListener('lsp:init:start', handleLSPInitStart as EventListener);
      window.removeEventListener('lsp:init:progress', handleLSPInitProgress as EventListener);
      window.removeEventListener('lsp:init:complete', handleLSPInitComplete as EventListener);
      window.removeEventListener('lsp:diagnostics:ready', handleDiagnosticsReady as EventListener);
    };
  }, []);

  // ── Handlers ──
  const handleLSPClick = () => {
    if (pendingLSP) {
      setForceShowLSPOverlay(true);
    }
  };

  // ── Render ──
  return (
    <div
      className={cn(
        'h-8 border-t border-border bg-sidebar-background/80 backdrop-blur-sm px-4 flex items-center justify-between text-[10px] text-text-secondary select-none shrink-0 w-full',
        className,
      )}
    >
      <div className="flex items-center gap-4 flex-1">
        {/* LSP Status */}
        {activeLSP && (
          <>
            {pendingLSP ? (
              <button
                onClick={handleLSPClick}
                className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 transition-colors cursor-pointer bg-transparent border-none p-0"
                title={`Install ${activeLSP.name}`}
              >
                <AlertTriangle className="w-3 h-3" strokeWidth={2} />
                <span className="font-medium">{activeLSP.language}</span>
              </button>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-400/70">
                <CheckCircle className="w-3 h-3" strokeWidth={2} />
                <span className="font-medium">{activeLSP.language}</span>
              </span>
            )}
          </>
        )}

        {/* LSP Initialization Progress */}
        {lspInitStatus.isInitializing && (
          <div className="flex items-center gap-2 ml-auto mr-4">
            <Loader2 className="w-3 h-3 animate-spin text-blue-400" strokeWidth={2} />
            <span className="text-text-secondary">
              Initializing {lspInitStatus.language || 'LSP'}...
            </span>
            <div className="w-32 h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300 ease-out"
                style={{ width: `${lspInitStatus.progress}%` }}
              />
            </div>
            <span className="text-text-secondary/70 font-mono text-[9px] min-w-[2rem] text-right">
              {Math.round(lspInitStatus.progress)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
