import { create } from 'zustand';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Diagnostic {
  uri: string; // file:///path/to/file.ts
  severity: 1 | 2 | 3 | 4; // 1=Error, 2=Warning, 3=Info, 4=Hint
  message: string;
  source?: string; // e.g., "typescript", "eslint"
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  code?: string | number;
  relatedInformation?: any[];
}

export interface DiagnosticsByFile {
  [uri: string]: Diagnostic[];
}

export interface FileDiagnosticStats {
  errors: number;
  warnings: number;
  infos: number;
  hints: number;
  total: number;
}

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Convert URI to file path
 * file:///home/user/file.ts → /home/user/file.ts
 */
function uriToPath(uri: string): string {
  try {
    const url = new URL(uri);
    return url.pathname;
  } catch {
    // If not a valid URI, assume it's already a path
    return uri.replace('file://', '');
  }
}

/**
 * Convert file path to URI
 * /home/user/file.ts → file:///home/user/file.ts
 */
function pathToUri(path: string): string {
  if (path.startsWith('file://')) return path;
  return `file://${path}`;
}

/**
 * Calculate stats from diagnostics array
 */
function calculateStats(diagnostics: Diagnostic[]): FileDiagnosticStats {
  return {
    errors: diagnostics.filter((d) => d.severity === 1).length,
    warnings: diagnostics.filter((d) => d.severity === 2).length,
    infos: diagnostics.filter((d) => d.severity === 3).length,
    hints: diagnostics.filter((d) => d.severity === 4).length,
    total: diagnostics.length,
  };
}

// ─── Store ──────────────────────────────────────────────────────────────────

interface DiagnosticsState {
  // Raw data (key = URI format: file:///...)
  diagnostics: DiagnosticsByFile;

  // Cached/derived data (for performance & React stability)
  _statsCache: Map<string, FileDiagnosticStats>;

  // Actions
  setDiagnostics: (uri: string, diagnostics: Diagnostic[]) => void;
  clearDiagnostics: (uri: string) => void;
  clearAll: () => void;

  // Selectors (memoized getters)
  getDiagnosticsForFile: (filePathOrUri: string) => Diagnostic[];
  getStatsForFile: (filePathOrUri: string) => FileDiagnosticStats;
  getStatsCache: () => Map<string, FileDiagnosticStats>;
  getAllDiagnostics: () => Diagnostic[];
  getTotalErrorCount: () => number;
  getTotalWarningCount: () => number;
}

export const useDiagnosticsStore = create<DiagnosticsState>((set, get) => ({
  diagnostics: {},
  _statsCache: new Map(),

  // ── Actions ─────────────────────────────────────────────────────────────

  setDiagnostics: (uri: string, diagnostics: Diagnostic[]) => {
    set((state) => {
      // Update diagnostics
      const newDiagnostics = {
        ...state.diagnostics,
        [uri]: diagnostics,
      };

      // Rebuild stats cache
      const newStatsCache = new Map<string, FileDiagnosticStats>();
      Object.entries(newDiagnostics).forEach(([uri, diags]) => {
        if (diags.length === 0) return;

        const filePath = uriToPath(uri);
        const stats = calculateStats(diags);

        // Only cache files with errors or warnings
        if (stats.errors > 0 || stats.warnings > 0) {
          newStatsCache.set(filePath, stats);
        }
      });

      return {
        diagnostics: newDiagnostics,
        _statsCache: newStatsCache,
      };
    });
  },

  clearDiagnostics: (uri: string) => {
    set((state) => {
      const newDiagnostics = { ...state.diagnostics };
      delete newDiagnostics[uri];

      // Rebuild stats cache
      const newStatsCache = new Map<string, FileDiagnosticStats>();
      Object.entries(newDiagnostics).forEach(([uri, diags]) => {
        if (diags.length === 0) return;

        const filePath = uriToPath(uri);
        const stats = calculateStats(diags);

        if (stats.errors > 0 || stats.warnings > 0) {
          newStatsCache.set(filePath, stats);
        }
      });

      return {
        diagnostics: newDiagnostics,
        _statsCache: newStatsCache,
      };
    });
  },

  clearAll: () => {
    set({
      diagnostics: {},
      _statsCache: new Map(),
    });
  },

  // ── Selectors ───────────────────────────────────────────────────────────

  /**
   * Get diagnostics for a file by path or URI
   * Supports both formats:
   * - /home/user/file.ts
   * - file:///home/user/file.ts
   */
  getDiagnosticsForFile: (filePathOrUri: string) => {
    const { diagnostics } = get();

    // Normalize to URI format
    const uri = filePathOrUri.startsWith('file://') ? filePathOrUri : pathToUri(filePathOrUri);

    return diagnostics[uri] || [];
  },

  /**
   * Get diagnostic statistics for a file
   */
  getStatsForFile: (filePathOrUri: string) => {
    const diagnostics = get().getDiagnosticsForFile(filePathOrUri);
    return calculateStats(diagnostics);
  },

  /**
   * Get cached stats map (for FileTabBar)
   * Returns the SAME Map reference until diagnostics change
   * This prevents infinite re-renders in React
   */
  getStatsCache: () => {
    return get()._statsCache;
  },

  /**
   * Get all diagnostics across all files
   */
  getAllDiagnostics: () => {
    const { diagnostics } = get();
    return Object.entries(diagnostics).flatMap(([uri, diags]) => diags.map((d) => ({ ...d, uri })));
  },

  /**
   * Get total error count across all files
   */
  getTotalErrorCount: () => {
    return get()
      .getAllDiagnostics()
      .filter((d) => d.severity === 1).length;
  },

  /**
   * Get total warning count across all files
   */
  getTotalWarningCount: () => {
    return get()
      .getAllDiagnostics()
      .filter((d) => d.severity === 2).length;
  },
}));
