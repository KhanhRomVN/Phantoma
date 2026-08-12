/**
 * ------------------------------------------------------------------
 * LSP Manager Service
 * ------------------------------------------------------------------
 * Central coordinator for the entire LSP system. Listens for diagnostics
 * from all LSP servers, syncs them into the diagnostics store (Zustand)
 * and Monaco Editor markers. Tracks per-server lifecycle state
 * (starting/running/stopped/error). Supports per-file diagnostic listeners.
 *
 * Main functions:
 * - initialize()              : Set up IPC listeners for diagnostics & server lifecycle
 * - subscribeToDiagnostics()  : Register a file-specific diagnostics listener, returns unsubscribe
 * - getServerStatus()         : Get the status of an LSP server by language
 * - getAllServerStatuses()    : Get statuses of all LSP servers
 * - getDiagnosticsForFile()   : Get diagnostics for a file (from store)
 * - clearDiagnostics()        : Clear diagnostics for a file (store + Monaco markers)
 * - clearAllDiagnostics()     : Clear all diagnostics
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Stores ──
import { useDiagnosticsStore, type Diagnostic } from '../stores/diagnosticsStore';

// ── Services ──
import { monacoAdapter } from './monaco-adapter.service';

// ─── Types ──────────────────────────────────────────────────────────────

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

// ─── Class ──────────────────────────────────────────────────────────────

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

    console.log('[LSPManager] 🔌 Initializing — registering IPC listeners for LSP diagnostics...');

    // Listen for diagnostics from ALL languages
    this.setupDiagnosticsListeners();

    // Listen for server lifecycle events
    this.setupServerLifecycleListeners();

    this.isInitialized = true;
    console.log('[LSPManager] ✅ Initialized — waiting for diagnostics...');
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
  private handleDiagnosticsEvent(_language: string, event: any) {
    const handleStart = performance.now();
    const { uri, diagnostics } = event;

    // [DEBUG] Log every incoming diagnostics event to confirm IPC is working after refresh
    console.log(
      `[LSPManager] 📨 Received diagnostics: language="${_language}", uri="${this.getFileName(uri)}", count=${diagnostics?.length ?? 0}`,
    );

    // Process immediately — diagnostics appear in Problems with minimal delay
    this.processDiagnostics(uri, diagnostics, handleStart);
  }

  /**
   * Process diagnostics (called after debounce delay)
   */
  private processDiagnostics(uri: string, diagnostics: Diagnostic[], _startTime: number) {
    // Create diagnostics event
    const diagEvent: DiagnosticsEvent = {
      uri,
      diagnostics,
      timestamp: Date.now(),
    };

    // 1. Update store (single source of truth)
    useDiagnosticsStore.getState().setDiagnostics(uri, diagnostics);

    // [DEBUG] Confirm store was updated
    const storeDiags = useDiagnosticsStore.getState().getDiagnosticsForFile(uri);
    console.log(
      `[LSPManager] 💾 Store updated: "${this.getFileName(uri)}" — stored ${storeDiags.length} diagnostic(s)`,
    );

    // Signal FooterBar: diagnostics system is ready (dispatch on first response, even if empty)
    // This fixes the refresh issue where diagnosticsReadyDispatched stays false if the first
    // publishDiagnostics is an empty array → FooterBar never hides the initializing state.
    if (!this.diagnosticsReadyDispatched) {
      this.diagnosticsReadyDispatched = true;
      window.dispatchEvent(new CustomEvent('lsp:diagnostics:ready'));
      console.log('[LSPManager] ✅ Diagnostics system ready — dispatched lsp:diagnostics:ready');
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

// ─── Singleton ──────────────────────────────────────────────────────────
export const lspManager = new LSPManager();

// Auto-initialize on import
if (typeof window !== 'undefined') {
  lspManager.initialize();
}