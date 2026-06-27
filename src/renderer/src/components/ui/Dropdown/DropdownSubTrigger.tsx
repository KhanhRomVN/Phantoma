import React from 'react';
import { cn } from '../../../shared/lib/utils';
import { DropdownItemProps } from './type';
import { ChevronRight } from 'lucide-react';
import { useDropdownSubContext } from './DropdownSub';

interface DropdownSubTriggerProps extends Omit<DropdownItemProps, 'items'> {
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export function DropdownSubTrigger({
  children,
  className,
  icon,
  disabled,
  ...props
}: DropdownSubTriggerProps) {
  const { open } = useDropdownSubContext();

  return (
    <div
      className={cn(
        'w-full flex items-center justify-between gap-2 px-3 py-1.5 text-sm text-text-primary hover:bg-dropdown-item-hover transition-colors cursor-pointer whitespace-nowrap',
        disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent',
        open && 'bg-dropdown-item-hover',
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        {icon && <span className="shrink-0">{icon}</span>}
        <span>{children}</span>
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-text-secondary" />
    </div>
  );
}

DropdownSubTrigger.displayName = 'DropdownSubTrigger';

export default DropdownSubTrigger;