import type { ReactNode } from 'react';

export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className='flex min-h-[30px] items-center justify-between gap-3 border-b border-border/40 py-1 text-xs last:border-b-0'>
      <span className='shrink-0 text-text-secondary'>{label}</span>
      <div className='min-w-0 truncate text-right text-text-primary'>{children}</div>
    </div>
  );
}
