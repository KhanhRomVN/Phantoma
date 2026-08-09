/**
 * LSP Manager Service
 *
 * Pure orchestrator for LSP diagnostics flow.
 * Receives IPC events → Updates Store → Syncs Monaco
 *
 * Architecture (Single Direction):
 * Main Process → IPC Events → LSP Manager → Store (Single Source) → UI
 *                                         └→ Monaco Adapter (View Sync)
 *
 * Responsibilities:
 * - Transform IPC events to store format
 * - Update DiagnosticsStore (single source of truth)
 * - Delegate Monaco sync to adapter
 * - Manage server lifecycle
 *
 * NOT responsible for:
 * - Direct Monaco manipulation (delegated to adapter)
 * - UI rendering (components read from store)
 * - Data aggregation (handled by store selectors)
 */

import { useDiagnosticsStore, type Diagnostic } from '../stores/diagnosticsStore';
import { monacoAdapter } from './monaco-adapter.service';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LSPServerStatus {
  language: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  pid?: number;
  error?: string;
  startedAt?: number;
}

export interface DiagnosticsEvent {
  uri: string;
  diagnostics: Diagnostic[];
  timestamp: number;
}

type DiagnosticsListener = (event: DiagnosticsEvent) => void;

// ─── LSP Manager ────────────────────────────────────────────────────────────

class LSPManager {
  private servers: Map<string, LSPServerStatus> = new Map();
  private diagnosticsListeners: Map<string, Set<DiagnosticsListener>> = new Map();
  private isInitialized = false;
  private diagnosticsReadyDispatched = false;

  /**
   * Initialize LSP Manager
   * Sets up IPC listeners for all LSP events
   */
  initialize() {
    if (this.isInitialized) {
      console.warn('[LSPManager] Already initialized');
      return;
    }

    // Listen for diagnostics from ALL languages
    this.setupDiagnosticsListeners();

    // Listen for server lifecycle events
    this.setupServerLifecycleListeners();

    this.isInitialized = true;
  }

  /**
   * Setup diagnostics listeners for all supported languages
   */
  private setupDiagnosticsListeners() {
    const languages = [
      'typescript',
      'javascript',
      'python',
      'go',
      'rust',
      'java',
      'cpp',
      'c',
      'csharp',
      'php',
      'ruby',
    ];

    languages.forEach((language) => {
      const eventName = `lsp:diagnostics:${language}`;

      // ✅ FIX: IPC callback receives (ipcEvent, ...args) but we only need the data payload
      window.api.on(eventName, (_ipcEvent: any, eventData: any) => {
        this.handleDiagnosticsEvent(language, eventData);
      });
    });
  }

  /**
   * Setup server lifecycle listeners
   */
  private setupServerLifecycleListeners() {
    // Server started
    window.api.on('lsp:server:started', (_ipcEvent: any, eventData: any) => {
      const { language, pid } = eventData;
      this.servers.set(language, {
        language,
        status: 'running',
        pid,
        startedAt: Date.now(),
      });
    });

    // Server stopped
    window.api.on('lsp:server:stopped', (_ipcEvent: any, eventData: any) => {
      const { language } = eventData;
      this.servers.set(language, {
        language,
        status: 'stopped',
      });
    });

    // Server error
    window.api.on('lsp:server:error', (_ipcEvent: any, eventData: any) => {
      const { language, error } = eventData;
      console.error(`[LSPManager] ❌ Server error: ${language}`, error);

      this.servers.set(language, {
        language,
        status: 'error',
        error,
      });
    });
  }

  /**
   * Handle incoming diagnostics event
   * This is called when LSP server sends publishDiagnostics
   *
   * ✨ OPTIMIZATION: Debounce rapid diagnostics updates to prevent unnecessary re-renders
   */
  private handleDiagnosticsEvent(language: string, event: any) {
    const handleStart = performance.now();
    const { uri, diagnostics } = event;

    // Process immediately — diagnostics appear in Problems with minimal delay
    this.processDiagnostics(uri, diagnostics, handleStart);
  }

  /**
   * Process diagnostics (called after debounce delay)
   */
  private processDiagnostics(uri: string, diagnostics: Diagnostic[], startTime: number) {
    // Create diagnostics event
    const diagEvent: DiagnosticsEvent = {
      uri,
      diagnostics,
      timestamp: Date.now(),
    };

    // 1. Update store (single source of truth)
    useDiagnosticsStore.getState().setDiagnostics(uri, diagnostics);

    // Signal FooterBar: diagnostics are ready, hide progress bar
    if (!this.diagnosticsReadyDispatched && diagnostics.length > 0) {
      this.diagnosticsReadyDispatched = true;
      window.dispatchEvent(new CustomEvent('lsp:diagnostics:ready'));
    }

    // 2. Sync to Monaco for inline display
    monacoAdapter.syncMarkers(uri, diagnostics);

    // 3. Notify file-specific listeners (optional)
    this.notifyListeners(uri, diagEvent);

    // Log summary (only for non-empty diagnostics)
    if (diagnostics.length > 0) {
      console.groupCollapsed(
        `[LSPManager] 📋 ${diagnostics.length} diagnostic(s) for ${this.getFileName(uri)}`,
      );
      console.groupEnd();
    }
  }

  /**
   * Subscribe to diagnostics for a specific file
   * Returns unsubscribe function
   */
  subscribeToDiagnostics(uri: string, listener: DiagnosticsListener): () => void {
    if (!this.diagnosticsListeners.has(uri)) {
      this.diagnosticsListeners.set(uri, new Set());
    }

    this.diagnosticsListeners.get(uri)!.add(listener);

    // Return unsubscribe function
    return () => {
      const listeners = this.diagnosticsListeners.get(uri);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.diagnosticsListeners.delete(uri);
        }
      }
    };
  }

  /**
   * Notify all listeners for a specific file
   */
  private notifyListeners(uri: string, event: DiagnosticsEvent) {
    const listeners = this.diagnosticsListeners.get(uri);
    if (listeners && listeners.size > 0) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error('[LSPManager] ❌ Listener error:', error);
        }
      });
    }
  }

  /**
   * Get server status
   */
  getServerStatus(language: string): LSPServerStatus | undefined {
    return this.servers.get(language);
  }

  /**
   * Get all server statuses
   */
  getAllServerStatuses(): LSPServerStatus[] {
    return Array.from(this.servers.values());
  }

  /**
   * Get diagnostics for a file (from store)
   */
  getDiagnosticsForFile(uri: string): Diagnostic[] {
    return useDiagnosticsStore.getState().getDiagnosticsForFile(uri);
  }

  /**
   * Clear diagnostics for a file
   */
  clearDiagnostics(uri: string) {
    useDiagnosticsStore.getState().clearDiagnostics(uri);
    monacoAdapter.clearMarkers(uri);
  }

  /**
   * Clear all diagnostics
   */
  clearAllDiagnostics() {
    useDiagnosticsStore.getState().clearAll();
    // Monaco markers will be cleared when models are disposed
  }

  /**
   * Helper: Extract filename from URI
   */
  private getFileName(uri: string): string {
    try {
      const url = new URL(uri);
      return url.pathname.split('/').pop() || uri;
    } catch {
      return uri;
    }
  }
}

// ─── Singleton Instance ─────────────────────────────────────────────────────

export const lspManager = new LSPManager();

// Auto-initialize on import
if (typeof window !== 'undefined') {
  lspManager.initialize();
}
