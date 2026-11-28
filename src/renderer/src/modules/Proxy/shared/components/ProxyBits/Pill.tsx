import type { ReactNode } from 'react';
import { cn } from '@renderer/utils/cn';
import { TONE_CLASS } from '../../constants/tone.constants';
import type { Tone } from '../../types/proxy-domain.types';

export function Pill({ tone = 'muted', className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium',
        TONE_CLASS[tone].pill,
        className,
      )}
    >
      {children}
    </span>
  );
}
