import React from 'react';
import { cn } from '../../../shared/lib/utils';

interface DropdownSubContentProps {
  children: React.ReactNode;
  className?: string;
}

export function DropdownSubContent({ children, className }: DropdownSubContentProps) {
  return (
    <div
      className={cn('flex flex-col', className)}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

DropdownSubContent.displayName = 'DropdownSubContent';

export default DropdownSubContent;
