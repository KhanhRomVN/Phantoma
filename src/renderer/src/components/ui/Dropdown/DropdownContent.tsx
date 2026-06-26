import React from 'react';
import { cn } from '../../../shared/lib/utils';
import { DropdownContentProps } from './type';

export function DropdownContent({ children, className }: DropdownContentProps) {
  return (
    <div
      className={cn(
        'bg-modal-background border border-border rounded-lg shadow-xl min-w-[200px] py-1',
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