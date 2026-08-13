import React from 'react';
import { cn } from '@renderer/shared/utils/cn';
import { DropdownItemProps } from './type';
import { ChevronRight } from 'lucide-react';
import { useDropdownSubContext } from './DropdownSub';
import { useDropdownSize, dropdownSizeStyles } from './DropdownContent';

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
  const size = useDropdownSize();
  const styles = dropdownSizeStyles[size];

  return (
    <div
      className={cn(
        'w-full flex items-center justify-between transition-colors cursor-pointer whitespace-nowrap text-text-primary hover:bg-dropdown-item-hover',
        styles.item,
        styles.gap,
        disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent',
        open && 'bg-dropdown-item-hover',
        className,
      )}
      {...props}
    >
      <div className={cn('flex items-center', styles.gap)}>
        {icon && <span className={cn('shrink-0', styles.icon)}>{icon}</span>}
        <span>{children}</span>
      </div>
      <ChevronRight className={cn(styles.icon, 'text-text-secondary')} />
    </div>
  );
}

DropdownSubTrigger.displayName = 'DropdownSubTrigger';

export default DropdownSubTrigger;
