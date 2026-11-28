/**
 * ------------------------------------------------------------------
 * Scope Badges Util
 * ------------------------------------------------------------------
 * Metadata và class style cho các badge scope (Clash/Drift/Outside/Inside)
 * và bảng màu badge/text cho branch.
 *
 * Main constants:
 * - SCOPE_BADGE_ORDER / SCOPE_BADGE_META : Thứ tự và nhãn/hint của badge
 * - SCOPE_DOT / SCOPE_BADGE_ON / SCOPE_BADGE_OFF : Class màu theo trạng thái
 * - BRANCH_BADGE_PALETTE / BRANCH_TEXT_PALETTE : Bảng màu cho branch
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Stores ──
import { SCOPE_CATEGORIES, type ScopeCategory } from '../stores/scope-stats.store';

// ─── Constants ───────────────────────────────────────────────────────────────
export const SCOPE_BADGE_ORDER: ScopeCategory[] = ['error', 'diff', 'warn', 'primary'];

export const SCOPE_BADGE_META: Record<ScopeCategory, { label: string; hint: string }> = {
  error: {
    label: 'Clash',
    hint: 'Outside this branch scope, differs from the default branch and is also changed in another branch.',
  },
  diff: {
    label: 'Drift',
    hint: 'Outside this branch scope and differs from the default branch.',
  },
  warn: {
    label: 'Outside',
    hint: 'Outside this branch scope but identical to the default branch.',
  },
  primary: {
    label: 'Inside',
    hint: 'Inside the scope this branch is allowed to modify.',
  },
};

export const SCOPE_DOT = Object.fromEntries(SCOPE_CATEGORIES.map((c) => [c.id, c.dot])) as Record<
  ScopeCategory,
  string
>;

export const SCOPE_BADGE_ON: Record<ScopeCategory, string> = {
  error: 'bg-error/10 text-error hover:bg-error/20 active:bg-error/30',
  diff: 'bg-[#f97316]/10 text-[#f97316] hover:bg-[#f97316]/20 active:bg-[#f97316]/30',
  warn: 'bg-warn/10 text-warn hover:bg-warn/20 active:bg-warn/30',
  primary: 'bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30',
};

export const SCOPE_BADGE_OFF =
  'bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/20 hover:text-text-primary active:bg-text-secondary/30';

export const BRANCH_BADGE_PALETTE = [
  'outline-warn',
  'outline-info',
  'outline-success',
  'outline-error',
  'outline-primary',
  'outline-[#f97316]',
];

export const BRANCH_TEXT_PALETTE = [
  'bg-warn/15 text-warn',
  'bg-info/15 text-info',
  'bg-success/15 text-success',
  'bg-error/15 text-error',
  'bg-primary/15 text-primary',
  'bg-[#f97316]/15 text-[#f97316]',
];