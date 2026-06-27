import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../../../shared/lib/utils';
import { ContextMenuProps, ContextMenuItem } from './type';
import { ChevronRight } from 'lucide-react';

export const ContextMenu: React.FC<ContextMenuProps> = ({
  items,
  x,
  y,
  onClose,
  className,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [subMenu, setSubMenu] = useState<{ item: ContextMenuItem; x: number; y: number } | null>(null);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      if (hoverTimeout) clearTimeout(hoverTimeout);
    };
  }, [onClose, hoverTimeout]);

  // Adjust position to stay within viewport
  const adjustedPosition = () => {
    const menuWidth = 200;
    const menuHeight = Math.min(items.length * 36 + 8, 300);
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let finalX = x;
    let finalY = y;

    if (x + menuWidth > viewportWidth) {
      finalX = viewportWidth - menuWidth - 8;
    }
    if (y + menuHeight > viewportHeight) {
      finalY = viewportHeight - menuHeight - 8;
    }
    if (finalX < 8) finalX = 8;
    if (finalY < 8) finalY = 8;

    return { x: finalX, y: finalY };
  };

  const pos = adjustedPosition();

  const handleMouseEnter = (item: ContextMenuItem, event: React.MouseEvent) => {
    if (!item.children || item.children.length === 0) return;
    
    if (hoverTimeout) clearTimeout(hoverTimeout);
    
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    let subX = rect.right + 4;
    let subY = rect.top;
    
    // Adjust sub-menu position to stay within viewport
    const subMenuWidth = 200;
    const subMenuHeight = item.children.length * 36 + 8;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    if (subX + subMenuWidth > viewportWidth) {
      subX = rect.left - subMenuWidth - 4;
    }
    if (subY + subMenuHeight > viewportHeight) {
      subY = viewportHeight - subMenuHeight - 8;
    }
    if (subY < 8) subY = 8;
    
    setSubMenu({ item, x: subX, y: subY });
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setSubMenu(null);
    }, 200);
    setHoverTimeout(timeout);
  };

  const handleSubMenuMouseEnter = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
  };

  const handleSubMenuMouseLeave = () => {
    const timeout = setTimeout(() => {
      setSubMenu(null);
    }, 200);
    setHoverTimeout(timeout);
  };

  const handleItemClick = (item: ContextMenuItem) => {
    if (item.onClick) {
      item.onClick();
      onClose();
    }
  };

  return (
    <>
      <div
        ref={menuRef}
        className={cn(
          'fixed z-50 min-w-[180px] bg-modal-background border border-border rounded-lg shadow-lg py-1 animate-in fade-in zoom-in duration-100',
          className
        )}
        style={{
          top: pos.y,
          left: pos.x,
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {items.map((item, index) => {
          const hasChildren = item.children && item.children.length > 0;
          return (
            <button
              key={index}
              onClick={() => !hasChildren && handleItemClick(item)}
              disabled={item.disabled}
              className={cn(
                'w-full px-3 py-1.5 text-sm text-left flex items-center gap-2 transition-colors relative',
                'hover:bg-dropdown-item-hover',
                item.variant === 'error' ? 'text-error hover:bg-error/10' : 'text-text-primary',
                item.disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent',
                hasChildren && 'cursor-default'
              )}
              onMouseEnter={(e) => handleMouseEnter(item, e)}
              onMouseLeave={handleMouseLeave}
            >
              {item.icon && <span className="w-4 h-4 flex items-center justify-center shrink-0">{item.icon}</span>}
              <span className="flex-1">{item.label}</span>
              {hasChildren && <ChevronRight className="w-3.5 h-3.5 text-text-secondary" />}
            </button>
          );
        })}
      </div>

      {/* Sub-menu */}
      {subMenu && (
        <div
          className="fixed z-50 min-w-[180px] bg-modal-background border border-border rounded-lg shadow-lg py-1 animate-in fade-in zoom-in duration-100"
          style={{
            top: subMenu.y,
            left: subMenu.x,
          }}
          onMouseEnter={handleSubMenuMouseEnter}
          onMouseLeave={handleSubMenuMouseLeave}
          onContextMenu={(e) => e.preventDefault()}
        >
          {subMenu.item.children?.map((child, index) => (
            <button
              key={index}
              onClick={() => {
                if (child.onClick) {
                  child.onClick();
                  onClose();
                }
              }}
              disabled={child.disabled}
              className={cn(
                'w-full px-3 py-1.5 text-sm text-left flex items-center gap-2 transition-colors',
                'hover:bg-dropdown-item-hover',
                child.variant === 'error' ? 'text-error hover:bg-error/10' : 'text-text-primary',
                child.disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent'
              )}
            >
              {child.icon && <span className="w-4 h-4 flex items-center justify-center shrink-0">{child.icon}</span>}
              <span className="flex-1">{child.label}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
};

export default ContextMenu;