import React from 'react';
import { cn } from '../../../shared/lib/utils';

interface DropdownSubContentProps {
  children: React.ReactNode;
  className?: string;
}

export function DropdownSubContent({
  children,
  className,
}: DropdownSubContentProps) {
  return (
    <div
      className={cn(
        'bg-modal-background border border-border rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.08)] min-w-[200px] py-1 transition-colors hover:border-primary flex flex-col',
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

DropdownSubContent.displayName = 'DropdownSubContent';

export default DropdownSubContent;