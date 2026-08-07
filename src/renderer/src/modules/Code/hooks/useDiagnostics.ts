/**
 * Custom hook for consuming diagnostics data
 * 
 * Provides a clean API for components to access diagnostics
 * from the single source of truth (DiagnosticsStore)
 * 
 * Usage examples:
 * 
 * // Get diagnostics for a specific file
 * const { diagnostics, stats } = useDiagnostics('/path/to/file.ts');
 * 
 * // Get all diagnostics
 * const { allDiagnostics, totalErrors, totalWarnings } = useDiagnostics();
 * 
 * // Get stats map for all files (FileTabBar use case)
 * const statsMap = useDiagnostics.statsMap();
 */

import { useDiagnosticsStore } from '../stores/diagnosticsStore';

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
