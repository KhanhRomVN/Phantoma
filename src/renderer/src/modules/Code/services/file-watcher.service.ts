/**
 * ------------------------------------------------------------------
 * File Watcher Service
 * ------------------------------------------------------------------
 * Monitors external file changes for all project files. Keeps watchers
 * alive even after tabs are closed, using a smart idle-time cleanup
 * strategy: 10 min idle → auto-unwatch + didClose to LSP (30 min if
 * the file has diagnostics). Supports manual unwatch as well.
 *
 * Core responsibilities:
 * - Start watching files when they are opened
 * - Keep watchers alive across tab switches/closes
 * - Notify LSP server of external changes
 * - Emit events for UI to refresh content
 * - Auto-cleanup idle files
 *
 * Main functions:
 * - initialize()         : Initialize the service (idempotent)
 * - onFileChange()       : Register a file-change listener, returns unsubscribe
 * - watchFile()          : Start watching a file for external changes
 * - unwatchFile()        : Stop watching a file, send didClose to LSP
 * - unwatchAll()         : Stop watching all files (project close)
 * - touchFile()          : Update last-access time, reset cleanup timer
 * - updateContent()      : Update known content when user edits in-app
 * - isWatching()         : Check if a file is being watched
 * - getWatchedFiles()    : Get all watched file paths
 * - getStats()           : Get debug statistics
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Services ──
import { lspClientManager } from './lsp-client.service';

// ── Stores ──
import { useDiagnosticsStore } from '../stores/diagnosticsStore';

// ─── Interfaces ─────────────────────────────────────────────────────────
interface WatchedFile {
  filePath: string;
  language: string;
  unsubscribe: () => void;
  lastContent: string;
  lastAccessTime: number;
  cleanupTimer?: NodeJS.Timeout;
}

export interface FileChangeEvent {
  filePath: string;
  content: string;
  mtime: number;
}

type FileChangeListener = (event: FileChangeEvent) => void;

// ─── Constants ──────────────────────────────────────────────────────────
const INACTIVE_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const WITH_DIAGNOSTICS_TIMEOUT = 30 * 60 * 1000; // 30 minutes for files with errors/warnings

// ─── Class ──────────────────────────────────────────────────────────────
class FileWatcherService {
  private watchedFiles: Map<string, WatchedFile> = new Map();
  private changeListeners: Set<FileChangeListener> = new Set();
  private isInitialized = false;

  initialize() {
    if (this.isInitialized) return;

    this.isInitialized = true;
  }

  /**
   * Subscribe to file change events
   * Returns unsubscribe function
   */
  onFileChange(listener: FileChangeListener): () => void {
    this.changeListeners.add(listener);
    return () => {
      this.changeListeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of a file change
   */
  private notifyListeners(event: FileChangeEvent) {
    this.changeListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('[FileWatcherService] ❌ Listener error:', err);
      }
    });
  }

  /**
   * Check if file has diagnostics (errors/warnings)
   */
  private hasImportantDiagnostics(filePath: string): boolean {
    const stats = useDiagnosticsStore.getState().getStatsForFile(filePath);
    return stats.errors > 0 || stats.warnings > 0;
  }

  /**
   * Schedule cleanup for a file
   */
  private scheduleCleanup(filePath: string) {
    const watched = this.watchedFiles.get(filePath);
    if (!watched) return;

    // Clear existing timer
    if (watched.cleanupTimer) {
      clearTimeout(watched.cleanupTimer);
    }

    // Determine timeout based on diagnostics
    const hasDiagnostics = this.hasImportantDiagnostics(filePath);
    const timeout = hasDiagnostics ? WITH_DIAGNOSTICS_TIMEOUT : INACTIVE_TIMEOUT;

    watched.cleanupTimer = setTimeout(() => {
      this.unwatchFile(filePath);
    }, timeout);
  }

  /**
   * Touch a file (update last access time and reset cleanup timer)
   * Call this when file is accessed (opened, edited, viewed)
   */
  touchFile(filePath: string) {
    const watched = this.watchedFiles.get(filePath);
    if (!watched) return;

    watched.lastAccessTime = Date.now();
    this.scheduleCleanup(filePath);
  }

  /**
   * Start watching a file for external changes
   * If already watching, just touch it and return
   */
  async watchFile(filePath: string, language: string, initialContent: string) {
    // Already watching this file - just touch it
    if (this.watchedFiles.has(filePath)) {
      this.touchFile(filePath);
      return;
    }

    // Register watcher with main process
    try {
      await window.api.invoke('fs:watch-file', filePath);
    } catch (err) {
      console.error('[FileWatcherService] ❌ Failed to start watch:', filePath, err);
      return;
    }

    // Listen for file changes
    const unsubscribe = window.api.on(
      'fs:file-changed',
      async (_event: any, data: { filePath: string; mtime: number }) => {
        if (data.filePath !== filePath) return;

        // Touch file to reset cleanup timer
        this.touchFile(filePath);

        try {
          // Read new content
          const newContent = await window.api.invoke('fs:read-file', filePath);

          const watched = this.watchedFiles.get(filePath);
          if (!watched) return;

          // Skip if content hasn't actually changed
          if (watched.lastContent === newContent) {
            return;
          }

          // Update stored content
          watched.lastContent = newContent;

          // Notify LSP server about external change
          const uri = `file://${filePath}`;

          lspClientManager.notifyDocumentChanged(language, uri, newContent, Date.now());

          // Notify UI listeners (for updating editor content)
          this.notifyListeners({
            filePath,
            content: newContent,
            mtime: data.mtime,
          });
        } catch (err) {
          console.error('[FileWatcherService] ❌ Error handling file change:', err);
        }
      },
    );

    // Store watcher info
    const watched: WatchedFile = {
      filePath,
      language,
      unsubscribe,
      lastContent: initialContent,
      lastAccessTime: Date.now(),
    };

    this.watchedFiles.set(filePath, watched);

    // Schedule initial cleanup
    this.scheduleCleanup(filePath);
  }

  /**
   * Update the last known content for a file
   * Call this when user edits the file in the app
   */
  updateContent(filePath: string, content: string) {
    const watched = this.watchedFiles.get(filePath);
    if (watched) {
      watched.lastContent = content;
      this.touchFile(filePath); // Reset cleanup timer on edit
    }
  }

  /**
   * Stop watching a specific file
   */
  async unwatchFile(filePath: string) {
    const watched = this.watchedFiles.get(filePath);
    if (!watched) return;

    // Clear cleanup timer
    if (watched.cleanupTimer) {
      clearTimeout(watched.cleanupTimer);
    }

    // Unsubscribe from IPC events
    watched.unsubscribe();

    // Unregister from main process
    try {
      await window.api.invoke('fs:unwatch-file', filePath);
    } catch (err) {
      console.error('[FileWatcherService] ❌ Error unwatching:', err);
    }

    // Send didClose to LSP server to free memory
    const uri = `file://${filePath}`;
    try {
      await lspClientManager.notifyDocumentClosed(watched.language, uri);
    } catch (err) {
      console.error('[FileWatcherService] ❌ Error sending didClose:', err);
    }
    this.watchedFiles.delete(filePath);
  }

  /**
   * Stop watching all files (e.g., when closing project)
   */
  async unwatchAll() {
    const promises = Array.from(this.watchedFiles.keys()).map((filePath) =>
      this.unwatchFile(filePath),
    );

    await Promise.all(promises);
  }

  /**
   * Check if a file is being watched
   */
  isWatching(filePath: string): boolean {
    return this.watchedFiles.has(filePath);
  }

  /**
   * Get all watched file paths
   */
  getWatchedFiles(): string[] {
    return Array.from(this.watchedFiles.keys());
  }

  /**
   * Get statistics for debugging
   */
  getStats() {
    const now = Date.now();
    const files = Array.from(this.watchedFiles.entries()).map(([path, watched]) => ({
      path,
      idleTime: Math.floor((now - watched.lastAccessTime) / 1000), // seconds
      hasDiagnostics: this.hasImportantDiagnostics(path),
    }));

    return {
      totalWatched: this.watchedFiles.size,
      files,
    };
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────
export const fileWatcherService = new FileWatcherService();

// Auto-initialize
if (typeof window !== 'undefined') {
  fileWatcherService.initialize();
}