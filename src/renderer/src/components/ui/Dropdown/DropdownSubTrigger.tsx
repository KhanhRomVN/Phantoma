import React from 'react';
import { cn } from '@renderer/shared/utils/cn';
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
        'w-full h-[30px] flex items-center justify-between gap-2 px-3 text-xs leading-none transition-colors cursor-pointer whitespace-nowrap rounded-md text-text-primary hover:bg-dropdown-item-hover',
        disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent',
        open && 'bg-dropdown-item-hover',
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        {icon && <span className="shrink-0 flex items-center [&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>}
        <span className="leading-none">{children}</span>
      </div>
      <ChevronRight className="shrink-0 text-text-secondary h-3.5 w-3.5" />
    </div>
  );
}

DropdownSubTrigger.displayName = 'DropdownSubTrigger';

export default DropdownSubTrigger;