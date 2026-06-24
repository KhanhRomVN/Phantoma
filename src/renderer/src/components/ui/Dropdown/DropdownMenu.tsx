import { useState, useRef, useEffect } from 'react';
import { cn } from '../../../shared/lib/utils';

interface DropdownMenuProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;
}

export function DropdownMenu({
  children,
  open: controlledOpen,
  onOpenChange,
  align = 'center',
  side = 'bottom',
  sideOffset = 8,
}: DropdownMenuProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(value);
    onOpenChange?.(value);
  };

  const triggerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [open]);

  const childrenArray = React.Children.toArray(children);
  const trigger = childrenArray.find(
    (child) => React.isValidElement(child) && (child.type as any)?.displayName === 'DropdownMenuTrigger',
  );
  const content = childrenArray.find(
    (child) => React.isValidElement(child) && (child.type as any)?.displayName === 'DropdownMenuContent',
  );

  return (
    <>
      <div ref={triggerRef} onClick={() => setOpen(!open)}>
        {trigger}
      </div>
      {open && content && (
        <div
          ref={contentRef}
          className="absolute z-50"
          style={{
            [side === 'bottom' ? 'top' : side === 'top' ? 'bottom' : 'left']: '100%',
            [side === 'left' ? 'right' : side === 'right' ? 'left' : 'top']: '0',
            marginTop: side === 'bottom' ? sideOffset : 0,
            marginBottom: side === 'top' ? sideOffset : 0,
            marginLeft: side === 'right' ? sideOffset : 0,
            marginRight: side === 'left' ? sideOffset : 0,
            transform: align === 'center' ? 'translateX(-50%)' : align === 'end' ? 'translateX(-100%)' : 'none',
          }}
        >
          {content}
        </div>
      )}
    </>
  );
}

interface DropdownMenuTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export function DropdownMenuTrigger({ children, asChild }: DropdownMenuTriggerProps) {
  if (asChild) return <>{children}</>;
  return <div>{children}</div>;
}
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

interface DropdownMenuContentProps {
  children: React.ReactNode;
  className?: string;
}

export function DropdownMenuContent({ children, className }: DropdownMenuContentProps) {
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

interface DropdownMenuItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export function DropdownMenuItem({
  children,
  onClick,
  className,
  disabled,
  icon,
}: DropdownMenuItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-text-primary hover:bg-dropdown-item-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
}

export function DropdownMenuSeparator() {
  return <div className="h-px bg-border/60 my-1 mx-2" />;
}

export default DropdownMenu;