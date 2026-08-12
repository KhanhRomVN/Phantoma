/**
 * ------------------------------------------------------------------
 * useDiagnostics
 * ------------------------------------------------------------------
 * Hook for accessing LSP diagnostic data from the diagnostics store.
 * Supports both file-specific queries (by path) and global summaries.
 * Also exposes static helper methods for stats map and per-file checks.
 *
 * Main features:
 * - File-specific diagnostics with error/warning counts
 * - Global diagnostics summary across all files
 * - Static statsMap() for FileTabBar badge rendering
 * - Static hasIssues() for quick per-file diagnostic check
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Stores ──
import { useDiagnosticsStore } from '../stores/diagnosticsStore';

// ─── Hook ───────────────────────────────────────────────────────────────
export function useDiagnostics(filePath?: string) {
  const store = useDiagnosticsStore();

  if (filePath) {
    // File-specific diagnostics
    const diagnostics = store.getDiagnosticsForFile(filePath);
    const stats = store.getStatsForFile(filePath);

    return {
      diagnostics,
      stats,
      hasErrors: stats.errors > 0,
      hasWarnings: stats.warnings > 0,
      hasIssues: stats.total > 0,
    };
  }

  // Global diagnostics
  return {
    allDiagnostics: store.getAllDiagnostics(),
    totalErrors: store.getTotalErrorCount(),
    totalWarnings: store.getTotalWarningCount(),
    diagnosticsByFile: store.diagnostics,
  };
}

/**
 * Hook to get stats map for all files
 * Useful for FileTabBar to show badges on all tabs
 */
useDiagnostics.statsMap = () => {
  return useDiagnosticsStore((s) => s.getStatsCache());
};

/**
 * Hook to check if a file has diagnostics
 */
useDiagnostics.hasIssues = (filePath: string) => {
  const stats = useDiagnosticsStore((s) => s.getStatsForFile(filePath));
  return stats.total > 0;
};