import { cn } from '@renderer/utils/cn';
import { TONE_CLASS } from '../../../../shared/constants/tone.constants';
import { SectionCardProps } from './service-detail.types';

export function SectionCard({ icon: Icon, tone, title, desc, count, className, children }: SectionCardProps) {
  return (
    <section className={cn('flex flex-col gap-3 rounded-md bg-card-background p-3.5', className)}>
      <header className="flex items-center gap-2">
        <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md', TONE_CLASS[tone].icon)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-text-primary">{title}</div>
          {desc && <div className="text-[11px] text-text-secondary">{desc}</div>}
        </div>
        {count !== undefined && <span className="text-[11px] tabular-nums text-text-secondary">{count}</span>}
      </header>
      {children}
    </section>
  );
}
