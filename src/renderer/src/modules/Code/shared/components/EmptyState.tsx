// ─── Imports ─────────────────────────────────────────────────────────────────
// ── React ──
import { memo } from 'react';

// ── UI ──
import type { LucideIcon } from 'lucide-react';

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon: LucideIcon;
  text: string;
  desc?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────
export const EmptyState = memo(function EmptyState({ icon: Icon, text, desc }: EmptyStateProps) {
  return (
    <div className={'h-full min-h-[240px] flex flex-col items-center justify-center text-center gap-3 px-6'}>
      <div className={'w-11 h-11 rounded-xl border grid place-items-center shrink-0 bg-primary/10 border-primary/20 text-primary'}>
        <Icon className={'w-5 h-5'} strokeWidth={1.8} />
      </div>
      <div className={'flex flex-col gap-1'}>
        <span className={'text-[13px] font-semibold text-text-primary leading-snug'}>{text}</span>
        {desc && <span className={'text-[11.5px] text-text-secondary leading-relaxed max-w-[240px]'}>{desc}</span>}
      </div>
    </div>
  );
});