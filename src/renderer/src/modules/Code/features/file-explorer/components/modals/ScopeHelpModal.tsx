// ─── Imports ─────────────────────────────────────────────────────────────────
// ── React ──
import { memo } from 'react';

// ── UI ──
import { Modal } from '@renderer/components/ui/Modal';

// ── Utils ──
import { cn } from '@renderer/utils/cn';
import { SCOPE_DOT } from '../../../../shared/utils/scope-badges.util';

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface ScopeHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchName: string;
  defaultBranch: string;
  scope: string[];
}

interface Outcome {
  id: string;
  name: string;
  dot?: string;
  text: string;
  inScope: string;
  vsOrigin: string;
  other: string;
  meaning: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const OUTCOMES: Outcome[] = [
  {
    id: 'none',
    name: 'No dot',
    text: 'text-text-secondary',
    inScope: 'Any',
    vsOrigin: 'No local change',
    other: 'Any',
    meaning: 'The file has no local git change, so it is not classified. A new file never falls here.',
  },
  {
    id: 'primary',
    name: 'Inside',
    dot: SCOPE_DOT.primary,
    text: 'text-primary',
    inScope: 'Yes',
    vsOrigin: 'Any',
    other: 'Any',
    meaning: 'The file is inside the scope this branch is allowed to modify. Nothing to worry about.',
  },
  {
    id: 'warn',
    name: 'Outside · Same',
    dot: SCOPE_DOT.warn,
    text: 'text-warn',
    inScope: 'No',
    vsOrigin: 'Identical',
    other: 'Any',
    meaning:
      'Git sees a local change, but the final content equals the latest origin-default. Harmless noise, usually safe to ignore.',
  },
  {
    id: 'diff',
    name: 'Outside · Drift',
    dot: SCOPE_DOT.diff,
    text: 'text-[#f97316]',
    inScope: 'No',
    vsOrigin: 'Different',
    other: 'Not changed',
    meaning:
      'Changed a file this branch does not own and it differs from origin-default. Parent of the two types below: Outside · [branchName] and Outside · Unscoped.',
  },
  {
    id: 'unscoped',
    name: 'Outside · Unscoped',
    dot: SCOPE_DOT.diff,
    text: 'text-[#f97316]',
    inScope: 'No',
    vsOrigin: 'Different',
    other: 'Not in any branch scope',
    meaning:
      'Child of Drift. The file differs from origin-default and does not belong to any existing branch scope. Revert it or move it into a scope.',
  },
  {
    id: 'error',
    name: 'Outside · Clash',
    dot: SCOPE_DOT.error,
    text: 'text-error',
    inScope: 'No',
    vsOrigin: 'Different',
    other: 'Changed',
    meaning:
      'Same as Drift, and another branch also changes this file. Highest merge-conflict risk, fix this first.',
  },
  {
    id: 'branch',
    name: 'Outside · [branchName]',
    dot: SCOPE_DOT.diff,
    text: 'text-[#f97316]',
    inScope: 'No',
    vsOrigin: 'Different',
    other: 'Belongs to that branch scope',
    meaning:
      'Child of Drift. The file differs from origin-default and sits inside the scope of another branch [branchName]. It is listed under that branch chip.',
  },
];

// ─── Component ───────────────────────────────────────────────────────────────
const Dot = ({ className }: { className?: string }) => (
  <span className={cn('h-2 w-2 shrink-0 rounded-full', className)} />
);

export const ScopeHelpModal = memo(function ScopeHelpModal({
  isOpen,
  onClose,
}: ScopeHelpModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className={'w-[94vw] max-w-[900px]'}>
      <div className={'overflow-hidden rounded-xl bg-card-background'}>
        <div
          className={
            'grid grid-cols-12 gap-2 border-b border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-text-secondary'
          }
        >
          <div className={'col-span-3'}>Dot</div>
          <div className={'col-span-2'}>In scope</div>
          <div className={'col-span-2'}>vs origin</div>
          <div className={'col-span-2'}>Other branch</div>
          <div className={'col-span-3'}>Meaning</div>
        </div>
        {OUTCOMES.map((o) => (
          <div
            key={o.id}
            className={
              'grid grid-cols-12 items-start gap-2 border-b border-border/60 px-4 py-3 text-[12px] last:border-b-0'
            }
          >
            <div className={'col-span-3 flex items-center gap-2'}>
              {o.dot ? (
                <Dot className={o.dot} />
              ) : (
                <span className={'h-2 w-2 shrink-0 rounded-full border border-dashed border-text-secondary'} />
              )}
              <span className={cn('font-medium', o.text)}>{o.name}</span>
            </div>
            <div className={'col-span-2 text-text-primary'}>{o.inScope}</div>
            <div className={'col-span-2 text-text-primary'}>{o.vsOrigin}</div>
            <div className={'col-span-2 text-text-primary'}>{o.other}</div>
            <div className={'col-span-3 leading-5 text-text-secondary'}>{o.meaning}</div>
          </div>
        ))}
      </div>
    </Modal>
  );
});