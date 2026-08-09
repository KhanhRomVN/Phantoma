/**
 * Monaco Adapter Service
 *
 * Decoupled adapter layer between diagnostics data and Monaco Editor.
 * Responsible ONLY for syncing markers to Monaco for inline display.
 *
 * Separation of concerns:
 * - DiagnosticsStore: Single source of truth
 * - MonacoAdapter: View layer sync (this file)
 * - LSPManager: Orchestrator
 */

import type { Diagnostic } from '../stores/diagnosticsStore';

class MonacoAdapter {
  /**
   * Sync diagnostics to Monaco editor markers
   * This enables inline squiggles, hover tooltips, and quick fixes
   */
  syncMarkers(uri: string, diagnostics: Diagnostic[]): void {
    if (typeof window === 'undefined' || !window.monaco) {
      console.warn('[MonacoAdapter] Monaco not available, skipping marker sync');
      return;
    }

    try {
      const model = window.monaco.editor.getModel(window.monaco.Uri.parse(uri));

      if (!model) {
        console.warn(`[MonacoAdapter] Model not found for ${uri}, skipping marker sync`);
        return;
      }

      const monacoMarkers = diagnostics.map((diag) => ({
        severity: this.convertDiagnosticSeverity(diag.severity),
        startLineNumber: diag.range.start.line + 1,
        startColumn: diag.range.start.character + 1,
        endLineNumber: diag.range.end.line + 1,
        endColumn: diag.range.end.character + 1,
        message: diag.message,
        source: diag.source || 'lsp',
        code: diag.code?.toString(),
      }));

      // Use 'lsp' as owner (not language-specific) to avoid conflicts
      window.monaco.editor.setModelMarkers(model, 'lsp', monacoMarkers);
    } catch (error) {
      console.error('[MonacoAdapter] ❌ Failed to sync markers:', error);
    }
  }

  /**
   * Clear all markers for a file
   */
  clearMarkers(uri: string): void {
    if (typeof window === 'undefined' || !window.monaco) return;

    try {
      const model = window.monaco.editor.getModel(window.monaco.Uri.parse(uri));
      if (model) {
        window.monaco.editor.setModelMarkers(model, 'lsp', []);
      }
    } catch (error) {
      console.error('[MonacoAdapter] ❌ Failed to clear markers:', error);
    }
  }

  /**
   * Convert LSP diagnostic severity to Monaco marker severity
   */
  private convertDiagnosticSeverity(severity: number): number {
    if (!window.monaco) return 8; // Error as default

    const MarkerSeverity = window.monaco.MarkerSeverity;

    switch (severity) {
      case 1:
        return MarkerSeverity.Error;
      case 2:
        return MarkerSeverity.Warning;
      case 3:
        return MarkerSeverity.Info;
      case 4:
        return MarkerSeverity.Hint;
      default:
        return MarkerSeverity.Error;
    }
  }
}

// ─── Singleton Instance ─────────────────────────────────────────────────────

export const monacoAdapter = new MonacoAdapter();
