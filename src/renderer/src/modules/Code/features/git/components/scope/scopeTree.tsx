// ─── Imports ─────────────────────────────────────────────────────────────────
// ── React ──
import { memo, type ReactNode } from 'react';

// ── Stores ──
import {
  SCOPE_DIFF_DOT,
  SCOPE_DIFF_RING,
  type ScopeCategory,
} from '../../../../shared/stores/scope-stats.store';
import { isInScope } from '../../../../shared/stores/branch-scope.store';

// ── Utils ──
import { cn } from '@renderer/utils/cn';
import { SCOPE_BADGE_META, BRANCH_BADGE_PALETTE, BRANCH_TEXT_PALETTE } from './scopeBadges';

// ─── Interfaces ──────────────────────────────────────────────────────────────
export interface BranchScopeEntry {
  branch: string;
  paths: string[];
}

// ─── Functions ───────────────────────────────────────────────────────────────
export function scopeRootOwners(
  rows: { node: { path: string; isDir?: boolean; files?: string[] }; depth: number }[],
  index: number,
  branchScopes: BranchScopeEntry[],
  currentBranch: string,
  withCollapsed = false,
): string[] {
  const { node, depth } = rows[index];
  const collapsed =
    withCollapsed &&
    !!node.isDir &&
    !!node.files?.length &&
    !(rows[index + 1] && rows[index + 1].depth > depth);
  let parent: string | null = null;
  for (let j = index - 1; j >= 0; j--) {
    if (rows[j].depth < depth) {
      parent = rows[j].node.path;
      break;
    }
  }
  return branchScopes
    .filter((o) =>
      o.paths.some(
        (p) =>
          (isInScope(node.path, [p]) && !(parent !== null && isInScope(parent, [p]))) ||
          (collapsed && node.files!.some((f) => isInScope(f, [p]))),
      ),
    )
    .map((o) => o.branch)
    .sort((a, b) => Number(b === currentBranch) - Number(a === currentBranch));
}

export function branchColors(
  branch: string,
  branchScopes: BranchScopeEntry[],
  currentBranch = '',
) {
  if (currentBranch && branch === currentBranch) {
    return { outline: 'outline-primary', badge: 'bg-primary/15 text-primary' };
  }
  const i = Math.max(
    0,
    branchScopes.findIndex((o) => o.branch === branch),
  );
  return {
    outline: BRANCH_BADGE_PALETTE[i % BRANCH_BADGE_PALETTE.length],
    badge: BRANCH_TEXT_PALETTE[i % BRANCH_TEXT_PALETTE.length],
  };
}

// ─── Constants ───────────────────────────────────────────────────────────────
const DOT_ORDER: ScopeCategory[] = ['error', 'diff', 'warn', 'primary'];

const DOT_STYLE: Record<ScopeCategory, { dot: string; ring: string }> = {
  error: { dot: 'bg-error', ring: 'border-error' },
  diff: { dot: SCOPE_DIFF_DOT, ring: SCOPE_DIFF_RING },
  warn: { dot: 'bg-warn', ring: 'border-warn' },
  primary: { dot: 'bg-primary', ring: 'border-primary' },
};

export type ScopeCounts = Partial<Record<ScopeCategory, number>>;

export function categoryCounts(paths: string[], categoryOf: Map<string, ScopeCategory>) {
  const out: ScopeCounts = {};
  for (const p of paths) {
    const c = categoryOf.get(p);
    if (c) out[c] = (out[c] ?? 0) + 1;
  }
  return out;
}

export function groupScopeBlocks(
  rows: { node: { path: string }; depth: number }[],
  rendered: ReactNode[],
  branchScopes: BranchScopeEntry[],
  currentBranch: string,
): ReactNode[] {
  const out: ReactNode[] = [];
  let i = 0;
  while (i < rows.length) {
    const owners = scopeRootOwners(rows, i, branchScopes, currentBranch);
    if (owners.length === 0) {
      out.push(rendered[i]);
      i++;
      continue;
    }
    let end = i + 1;
    while (end < rows.length && rows[end].depth > rows[i].depth) end++;
    out.push(
      <div
        key={`scope-block-${rows[i].node.path}`}
        className={cn(
          'my-1 rounded-md outline-dashed outline-1 -outline-offset-1',
          branchColors(owners[0], branchScopes, currentBranch).outline,
        )}
      >
        {rendered.slice(i, end)}
      </div>,
    );
    i = end;
  }
  return out;
}

// ─── Component ───────────────────────────────────────────────────────────────
export const ScopeDots = memo(function ScopeDots({
  counts,
  deleted = false,
}: {
  counts: ScopeCounts;
  deleted?: boolean;
}) {
  const shown = DOT_ORDER.filter((id) => (counts[id] ?? 0) > 0);
  if (shown.length === 0) return null;
  const title = shown
    .map((id) => `${counts[id]} file(s) · ${SCOPE_BADGE_META[id].label}`)
    .join(' · ');
  return (
    <span className="flex shrink-0 items-center gap-1 px-1" title={title}>
      {shown.map((id) =>
        deleted ? (
          <span
            key={id}
            className={cn(
              'inline-flex shrink-0 rounded-[4px] border border-dashed p-[2px]',
              DOT_STYLE[id].ring,
            )}
          >
            <span className={cn('h-2 w-2 shrink-0 rounded-full', DOT_STYLE[id].dot)} />
          </span>
        ) : (
          <span key={id} className={cn('h-2 w-2 shrink-0 rounded-full', DOT_STYLE[id].dot)} />
        ),
      )}
    </span>
  );
});