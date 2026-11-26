import type { LucideIcon } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { TONE_CLASS } from '../../../../shared/constants/tone.constants';
import { SERVICE_CATEGORIES, categoryChipStyle } from '../../constants/service-category.constants';
import type { ServiceCategory } from '../../constants/service-category.constants';
import type { Tone } from '../../../../shared/types/ui.types';
import { BADGE } from './link-service-form.constants';

export function SectionHeader({
  icon: Icon,
  tone,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-center gap-2">
      <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md', TONE_CLASS[tone].icon)}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-text-primary">{title}</div>
        {hint && <div className="text-[11px] text-text-secondary">{hint}</div>}
      </div>
      {action}
    </header>
  );
}

export function CategoryBadge({ category }: { category: ServiceCategory }) {
  const meta = SERVICE_CATEGORIES[category];
  return (
    <span className={BADGE}>
      <meta.icon className="h-3 w-3 shrink-0" style={{ color: categoryChipStyle(category, false).color }} />
      {meta.label}
    </span>
  );
}
