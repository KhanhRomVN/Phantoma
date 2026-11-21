import type { ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@renderer/utils/cn';

interface CenteredStateProps {
  icon: LucideIcon;
  title: string;
  text: string;
  spin?: boolean;
  action?: ReactNode;
}

export function CenteredState({ icon: Icon, title, text, spin, action }: CenteredStateProps) {
  return (
    <div className='flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center'>
      <span className='flex h-11 w-11 items-center justify-center rounded-xl bg-card-background text-text-secondary'>
        <Icon className={cn('h-5 w-5', spin && 'animate-spin')} />
      </span>
      <span className='text-xs font-semibold text-text-primary'>{title}</span>
      <span className='max-w-[260px] text-[11px] leading-relaxed text-text-secondary'>{text}</span>
      {action}
    </div>
  );
}

export function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type='button'
      onClick={onClick}
      className='flex h-7 items-center gap-1.5 rounded-md bg-primary/10 px-3 text-[11px] text-primary transition-colors hover:bg-primary/20 active:bg-primary/30'
    >
      <RotateCcw className='h-3 w-3' />
      Retry
    </button>
  );
}

export default CenteredState;