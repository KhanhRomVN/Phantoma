import React from 'react';
import { cn } from '../../../shared/lib/utils';
import { DropdownContentProps } from './type';

export function DropdownContent({ children, className }: DropdownContentProps) {
  return (
    <div
      className={cn(
        'bg-background border border-border rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.08)] min-w-[200px] py-1 transition-colors hover:border-primary flex flex-col',
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

DropdownContent.displayName = 'DropdownContent';

export default DropdownContent;
