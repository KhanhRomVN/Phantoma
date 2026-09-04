import React from 'react';
import { DropdownItemProps, DropdownSeparatorProps } from './type';
import { useDropdownContext } from './Dropdown';
import { cn } from '@renderer/shared/utils/cn';

function extractText(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (!node) return '';
  if (Array.isArray(node)) return node.map(extractText).join(' ');
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return extractText(props.children);
  }
  return '';
}

export function DropdownItem({
  children,
  onClick,
  className,
  disabled,
  icon,
  closeOnSelect,
  variant = 'default',
  noPadding = false,
  ...props
}: DropdownItemProps) {
  const { close, searchText, closeOnSelect: contextCloseOnSelect } = useDropdownContext();

  // Use prop if provided, otherwise use context value
  const shouldClose = closeOnSelect !== undefined ? closeOnSelect : contextCloseOnSelect;

  // Filter by search text
  if (searchText) {
    const itemText = extractText(children);
    if (!itemText.toLowerCase().includes(searchText.toLowerCase())) {
      return null;
    }
  }

  const handleClick = () => {
    if (disabled) return;
    onClick?.();
    if (shouldClose) {
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
        'w-full flex items-center gap-2 text-sm transition-colors cursor-pointer whitespace-nowrap relative',
        !noPadding && 'px-3 py-1.5',
        variant === 'error'
          ? 'text-error hover:bg-error/10'
          : 'text-text-primary hover:bg-dropdown-item-hover',
        disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent',
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
