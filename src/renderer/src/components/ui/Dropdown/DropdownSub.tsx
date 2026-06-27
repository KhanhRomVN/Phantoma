import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { cn } from '../../../shared/lib/utils';

interface DropdownSubContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  close: () => void;
  triggerRef: React.RefObject<HTMLDivElement>;
  contentRef: React.RefObject<HTMLDivElement>;
}

const DropdownSubContext = createContext<DropdownSubContextType | null>(null);

export function useDropdownSubContext() {
  const context = useContext(DropdownSubContext);
  if (!context) {
    throw new Error('DropdownSub components must be used within DropdownSub');
  }
  return context;
}

interface DropdownSubProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: 'right' | 'left' | 'bottom' | 'top';
  sideOffset?: number;
  align?: 'start' | 'center' | 'end';
}

export function DropdownSub({
  children,
  open: controlledOpen,
  onOpenChange,
  side = 'right',
  sideOffset = 4,
  align = 'start',
}: DropdownSubProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(value);
    onOpenChange?.(value);
  };

  const close = () => setOpen(false);

  const triggerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle hover logic
  const handleTriggerMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setOpen(true);
  };

  const handleTriggerMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 150);
  };

  const handleContentMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const handleContentMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 150);
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Position submenu
  const getSubPosition = (): { top: number; left: number } => {
    if (!triggerRef.current || !contentRef.current) {
      return { top: 0, left: 0 };
    }

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const contentRect = contentRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    let top = triggerRect.top;
    let left = triggerRect.right + sideOffset;

    // Adjust for alignment
    if (align === 'center') {
      top += (triggerRect.height - contentRect.height) / 2;
    } else if (align === 'end') {
      top += triggerRect.height - contentRect.height;
    }

    // Auto-flip if needed
    const margin = 8;
    if (side === 'right' && left + contentRect.width > viewport.width - margin) {
      left = triggerRect.left - contentRect.width - sideOffset;
    }
    if (side === 'left' && left < margin) {
      left = triggerRect.right + sideOffset;
    }

    // Clamp to viewport
    if (top < margin) top = margin;
    if (top + contentRect.height > viewport.height - margin) {
      top = viewport.height - contentRect.height - margin;
    }

    return { top, left };
  };

  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (open && contentRef.current) {
      requestAnimationFrame(() => {
        setPosition(getSubPosition());
      });
    }
  }, [open]);

  const childrenArray = React.Children.toArray(children);
  const trigger = childrenArray.find(
    (child) =>
      React.isValidElement(child) && (child.type as any)?.displayName === 'DropdownSubTrigger'
  );
  const content = childrenArray.find(
    (child) =>
      React.isValidElement(child) && (child.type as any)?.displayName === 'DropdownSubContent'
  );

  return (
    <DropdownSubContext.Provider value={{ open, setOpen, close, triggerRef, contentRef }}>
      <>
        <div
          ref={triggerRef}
          onMouseEnter={handleTriggerMouseEnter}
          onMouseLeave={handleTriggerMouseLeave}
          className="flex items-center w-full"
        >
          {trigger}
        </div>
        {open && content && (
          <div
            ref={contentRef}
            className="fixed z-[9999] min-w-[160px] bg-modal-background border border-border rounded-lg shadow-lg py-1 animate-in fade-in zoom-in duration-100"
            style={{
              top: position.top,
              left: position.left,
            }}
            onMouseEnter={handleContentMouseEnter}
            onMouseLeave={handleContentMouseLeave}
          >
            {content}
          </div>
        )}
      </>
    </DropdownSubContext.Provider>
  );
}

DropdownSub.displayName = 'DropdownSub';

export default DropdownSub;