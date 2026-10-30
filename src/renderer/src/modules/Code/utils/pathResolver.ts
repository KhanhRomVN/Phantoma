/**
 * ------------------------------------------------------------------
 * Workspace Path Resolver
 * ------------------------------------------------------------------
 * Resolve relative paths against the active Code-module project root.
 * All file handlers (read/write/replace/delete/find/revert/stat/history)
 * MUST use this so relative paths hit the same place regardless of the
 * Electron main process CWD.
 * ------------------------------------------------------------------
 */

export function isAbsoluteWorkspacePath(p: string): boolean {
  return p.startsWith('/') || p.startsWith('file://') || /^[A-Za-z]:[\\/]/.test(p);
}

function joinWorkspacePath(base: string, relative: string): string {
  return base.endsWith('/') ? base + relative : base + '/' + relative;
}

/**
 * Resolve a possibly-relative path against the active project root.
 * Priority: explicit basePath → project.explorerRoot → project.path.
 * Returns the input unchanged if it is already absolute or no base is found.
 */
export async function resolveWorkspacePath(
  input: string,
  basePath?: string | null,
): Promise<string> {
  if (!input || isAbsoluteWorkspacePath(input)) return input;

  let base = basePath || undefined;
  if (!base) {
    const { useCodeStore } = await import('../hooks/useCodeStore');
    const state = useCodeStore.getState();
    const project = state.projects.find((p) => p.id === state.currentProjectId);
    base = project?.explorerRoot ?? project?.path;
  }

  if (!base) return input;
  return joinWorkspacePath(base, input);
}