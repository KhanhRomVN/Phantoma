import type { ReactNode } from 'react';

export function ValidatedField({ label, hint, error, children }: { label: string; hint?: ReactNode; error?: string | null; children: ReactNode }) {
  return (
    <div className='flex min-w-0 flex-col gap-1.5'>
      <div className='flex items-center justify-between gap-2'>
        <span className='text-[11px] font-medium text-text-secondary'>{label}</span>
        {hint && <span className='truncate text-[10px] text-text-secondary'>{hint}</span>}
      </div>
      {children}
      {error && <span className='text-[11px] text-error'>{error}</span>}
    </div>
  );
}
