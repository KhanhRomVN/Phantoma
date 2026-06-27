import React from 'react';
import { cn } from '../../../shared/lib/utils';
import { DropdownItemProps, DropdownSeparatorProps } from './type';
import { useDropdownContext } from './Dropdown';

export function DropdownItem({
  children,
  onClick,
  className,
  disabled,
  icon,
  closeOnSelect = true,
  ...props
}: DropdownItemProps) {
  const { close } = useDropdownContext();

  const handleClick = () => {
    if (disabled) return;
    onClick?.();
    if (closeOnSelect) {
      close();
    }
  };

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-text-primary hover:bg-dropdown-item-hover transition-colors cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </div>
  );
}

DropdownItem.displayName = 'DropdownItem';

export function DropdownSeparator({ className }: DropdownSeparatorProps) {
  return <div className={cn('h-px bg-border/60 my-1 mx-2', className)} />;
}

DropdownSeparator.displayName = 'DropdownSeparator';

export default DropdownItem;