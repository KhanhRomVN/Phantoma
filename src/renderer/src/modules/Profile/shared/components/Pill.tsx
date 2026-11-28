import type { ReactNode } from 'react';
import { cn } from '@renderer/utils/cn';
import type { Tone } from '../types/ui.types';
import { TAG_TONES, TONE_CLASS } from '../constants/tone.constants';

export function hashTone(key: string): Tone {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return TAG_TONES[h % TAG_TONES.length];
}

interface PillProps {
  tone?: Tone;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}

export function Pill({ tone = 'muted', dot = true, className, children }: PillProps) {
  const t = TONE_CLASS[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium',
        t.pill,
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', t.dot)} />}
      {children}
    </span>
  );
}

export function TagChip({ tag }: { tag: string }) {
  return (
    <span
      className={cn(
        'whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-medium',
        TONE_CLASS[hashTone(tag)].pill,
      )}
    >
      {tag}
    </span>
  );
}
