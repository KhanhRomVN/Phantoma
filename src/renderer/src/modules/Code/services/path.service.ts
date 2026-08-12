/**
 * ------------------------------------------------------------------
 * Path Service
 * ------------------------------------------------------------------
 * Manages context path resolution for the Code module. In the Electron
 * renderer environment, uses localStorage key prefixes instead of
 * filesystem paths for project-scoped data storage.
 *
 * Main functions:
 * - getInstance()          : Get the singleton PathService instance
 * - getContextRoot()       : Return the context root prefix for localStorage
 * - getProjectContextDir() : Return the localStorage key for a specific project
 * ------------------------------------------------------------------
 */

// ─── Class ──────────────────────────────────────────────────────────────
export class PathService {
  private static instance: PathService;

  private constructor() {}

  public static getInstance(): PathService {
    if (!PathService.instance) {
      PathService.instance = new PathService();
    }
    return PathService.instance;
  }

  public getContextRoot(): string {
    return 'code_context';
  }

  public getProjectContextDir(projectPath: string): string {
    const sanitized = projectPath
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
    return `${this.getContextRoot()}:${sanitized}`;
  }
}
