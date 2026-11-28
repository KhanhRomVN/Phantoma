import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { TONE_CLASS } from '../../constants/tone.constants';
import type { Tone } from '../../types/proxy-domain.types';

interface SectionProps {
  title: string;
  icon?: LucideIcon;
  tone?: Tone;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Section({ title, icon: Icon, tone = 'muted', action, className, children }: SectionProps) {
  return (
    <section className={cn('rounded-md bg-card-background', className)}>
      <header className='flex items-center justify-between px-3.5 py-2.5'>
        <div className='flex items-center gap-2 text-xs font-semibold text-text-primary'>
          {Icon && (
            <span className={cn('flex h-6 w-6 items-center justify-center rounded-md', TONE_CLASS[tone].icon)}>
              <Icon className='h-3.5 w-3.5' />
            </span>
          )}
          {title}
        </div>
        {action}
      </header>
      <div className='px-3.5 pb-3.5'>{children}</div>
    </section>
  );
}
