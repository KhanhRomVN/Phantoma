/**
 * ------------------------------------------------------------------
 * Pull Request Utils
 * ------------------------------------------------------------------
 * Helper dùng chung: thời gian tương đối, bảng màu theo trạng thái PR
 * (open / merged / closed / draft), meta review, class nút / field.
 * ------------------------------------------------------------------
 */

import type { PrCheck, PullRequest } from './types';

// ─── Tone (màu theo trạng thái) ─────────────────────────────────────────
export type PrTone = 'open' | 'merged' | 'closed' | 'draft';

export const prTone = (pr: Pick<PullRequest, 'state' | 'isDraft'>): PrTone =>
  pr.state === 'MERGED'
    ? 'merged'
    : pr.state === 'CLOSED'
      ? 'closed'
      : pr.isDraft
        ? 'draft'
        : 'open';

export const TONE_COLOR: Record<PrTone, string> = {
  open: 'rgb(var(--success))',
  merged: '#a371f7',
  closed: 'rgb(var(--error))',
  draft: 'rgb(var(--text-secondary))',
};

export const TONE_LABEL: Record<PrTone, string> = {
  open: 'Open',
  merged: 'Merged',
  closed: 'Closed',
  draft: 'Draft',
};

export const tint = (color: string, percent: number): string =>
  `color-mix(in srgb, ${color} ${percent}%, transparent)`;

// ─── Review decision ────────────────────────────────────────────────────
export const REVIEW_META: Record<string, { label: string; color: string }> = {
  APPROVED: { label: 'Approved', color: 'rgb(var(--success))' },
  CHANGES_REQUESTED: { label: 'Changes requested', color: 'rgb(var(--error))' },
  REVIEW_REQUIRED: { label: 'Review required', color: 'rgb(var(--warn))' },
  COMMENTED: { label: 'Commented', color: 'rgb(var(--text-secondary))' },
  DISMISSED: { label: 'Dismissed', color: 'rgb(var(--text-secondary))' },
};

// ─── Time / path / check helpers ────────────────────────────────────────
export const timeAgo = (iso?: string | null): string => {
  if (!iso) return '';
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

export const splitPath = (path: string): { dir: string; name: string } => {
  const i = path.lastIndexOf('/');
  return i < 0 ? { dir: '', name: path } : { dir: path.slice(0, i + 1), name: path.slice(i + 1) };
};

export const checkLabel = (c: PrCheck) => c.name || c.context || 'check';
export const checkResult = (c: PrCheck) =>
  (c.conclusion || c.state || c.status || '').toLowerCase();

export type CheckKind = 'pass' | 'fail' | 'pending';
export const checkKind = (result: string): CheckKind =>
  result === 'success' || result === 'neutral' || result === 'skipped'
    ? 'pass'
    : result === 'failure' || result === 'error' || result === 'cancelled' || result === 'timed_out'
      ? 'fail'
      : 'pending';

export const CHECK_COLOR: Record<CheckKind, string> = {
  pass: 'rgb(var(--success))',
  fail: 'rgb(var(--error))',
  pending: 'rgb(var(--warn))',
};

// ─── Shared class names ─────────────────────────────────────────────────
export const BTN =
  'h-7 px-2.5 rounded-md text-[12px] font-medium inline-flex items-center gap-1.5 bg-button-soft-background text-text-secondary hover:bg-button-soft-background/80 hover:text-text-primary outline-none transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
export const BTN_PRIMARY =
  'h-7 px-2.5 rounded-md text-[12px] font-semibold inline-flex items-center gap-1.5 bg-button-soft-background text-primary hover:bg-button-soft-background/80 outline-none transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
export const BTN_DANGER =
  'h-7 px-2.5 rounded-md text-[12px] font-medium inline-flex items-center gap-1.5 bg-error/10 text-error hover:bg-error/20 outline-none transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
export const FIELD =
  'w-full rounded-md border border-border bg-input-background px-3 text-[12.5px] text-text-primary placeholder:text-text-secondary/50 outline-none focus:border-primary/50';