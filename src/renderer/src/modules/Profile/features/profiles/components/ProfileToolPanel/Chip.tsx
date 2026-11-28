import type { ReactNode } from 'react';
import { cn } from '@renderer/utils/cn';
import { TONE_CLASS } from '../../../../shared/constants/tone.constants';
import type { Tone } from '../../../../shared/types/ui.types';
import { ACTIVE_NEUTRAL } from './profile-tool-panel.constants';

export function Chip({
  active,
  tone = 'muted',
  onClick,
  children,
}: {
  active: boolean;
  tone?: Tone;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
        active
          ? tone === 'muted' || tone === 'primary'
            ? ACTIVE_NEUTRAL
            : TONE_CLASS[tone].pill
          : 'bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/15 hover:text-text-primary',
      )}
    >
      {children}
    </button>
  );
}
