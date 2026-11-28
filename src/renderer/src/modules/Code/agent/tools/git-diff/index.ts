/**
 * ------------------------------------------------------------------
 * Git Diff Tool Barrel
 * ------------------------------------------------------------------
 * Re-export executor, parser và renderer của tool git_diff.
 *
 * Main exports:
 * - executeGitDiff  : Executor của tool
 * - parseGitDiff    : Parser của tool
 * - GitDiffRenderer : Renderer của tool
 * ------------------------------------------------------------------
 */

// ─── Exports ─────────────────────────────────────────────────────────────────
export * from './git-diff.executor';
export * from './git-diff.parser';
export * from './git-diff.renderer';
