import React from 'react';
import { cn } from '../../../shared/lib/utils';

interface ContextMenuProps {
  children: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
}

export const ContextMenu = ({ children, onOpenChange }: ContextMenuProps) => {
  const [open, setOpen] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) {
      onOpenChange?.(false);
      return;
    }
    onOpenChange?.(true);

    const handleClickOutside = (e: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onOpenChange]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setPosition({ x: e.clientX, y: e.clientY });
    setOpen(true);
  };

  const childrenArray = React.Children.toArray(children);
  const trigger = childrenArray.find(
    (child) => React.isValidElement(child) && (child.type as any)?.displayName === 'ContextMenuTrigger',
  );
  const content = childrenArray.find(
    (child) => React.isValidElement(child) && (child.type as any)?.displayName === 'ContextMenuContent',
  );

  return (
    <>
      <div ref={triggerRef} onContextMenu={handleContextMenu}>
        {trigger}
      </div>
      {open && content && (
        <div
          ref={contentRef}
          style={{
            position: 'fixed',
            top: position.y,
            left: position.x,
            zIndex: 9999,
          }}
        >
          {content}
        </div>
      )}
    </>
  );
};

interface ContextMenuTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export const ContextMenuTrigger = ({ children, asChild }: ContextMenuTriggerProps) => {
  if (asChild) return <>{children}</>;
  return <div>{children}</div>;
};
ContextMenuTrigger.displayName = 'ContextMenuTrigger';

interface ContextMenuContentProps {
  children: React.ReactNode;
  className?: string;
}

export const ContextMenuContent = ({ children, className }: ContextMenuContentProps) => {
  return (
    <div
      className={cn(
        'bg-modal-background border border-border rounded-md shadow-lg py-1 min-w-[160px]',
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
};

interface ContextMenuItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  onSelect?: (e: React.MouseEvent) => void;
}

export const ContextMenuItem = ({
  children,
  onClick,
  className,
  onSelect,
}: ContextMenuItemProps) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelect) onSelect(e);
    if (onClick) onClick();
  };
  return (
    <div
      className={cn(
        'px-3 py-1.5 text-sm hover:bg-sidebar-item-hover cursor-pointer flex items-center',
        className,
      )}
      onClick={handleClick}
    >
      {children}
    </div>
  );
};

export const ContextMenuSeparator = () => {
  return <div className="h-px bg-divider my-1" />;
};