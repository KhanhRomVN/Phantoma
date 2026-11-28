import type { ReactNode } from 'react';
import { cn } from '@renderer/utils/cn';

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-text-secondary">{label}</span>
        {hint}
      </div>
      {children}
    </div>
  );
}
