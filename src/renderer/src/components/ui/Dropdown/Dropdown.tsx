import { useState, useRef, useEffect } from 'react';
import React from 'react';
import { DropdownProps } from './type';

type Position = { top: number; left: number };

export function Dropdown({
  children,
  open: controlledOpen,
  onOpenChange,
  align = 'center',
  side = 'bottom',
  sideOffset = 8,
}: DropdownProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(value);
    onOpenChange?.(value);
  };

  const triggerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
  const [isPositioned, setIsPositioned] = useState(false);

  // Tính toán vị trí dropdown
  const calculatePosition = (): Position | null => {
    if (!triggerRef.current || !contentRef.current) return null;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const contentRect = contentRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    // 1. Tính vị trí cơ bản dựa trên side
    let top = 0;
    let left = 0;
    const offset = sideOffset;

    switch (side) {
      case 'bottom':
        top = triggerRect.bottom + offset;
        left = triggerRect.left;
        break;
      case 'top':
        top = triggerRect.top - contentRect.height - offset;
        left = triggerRect.left;
        break;
      case 'left':
        top = triggerRect.top;
        left = triggerRect.left - contentRect.width - offset;
        break;
      case 'right':
        top = triggerRect.top;
        left = triggerRect.right + offset;
        break;
    }

    // 2. Điều chỉnh theo align
    switch (side) {
      case 'bottom':
      case 'top':
        if (align === 'center') {
          left += (triggerRect.width - contentRect.width) / 2;
        } else if (align === 'end') {
          left += triggerRect.width - contentRect.width;
        }
        break;
      case 'left':
      case 'right':
        if (align === 'center') {
          top += (triggerRect.height - contentRect.height) / 2;
        } else if (align === 'end') {
          top += triggerRect.height - contentRect.height;
        }
        break;
    }

    // 3. Kiểm tra và tự động flip nếu tràn viewport
    let flipped = false;
    let finalTop = top;
    let finalLeft = left;

    // Flip dọc nếu tràn dưới hoặc trên
    if (side === 'bottom' && top + contentRect.height > viewport.height) {
      // Flip lên trên
      finalTop = triggerRect.top - contentRect.height - offset;
      flipped = true;
    } else if (side === 'top' && top < 0) {
      // Flip xuống dưới
      finalTop = triggerRect.bottom + offset;
      flipped = true;
    }

    // Flip ngang nếu tràn phải hoặc trái
    if (side === 'right' && left + contentRect.width > viewport.width) {
      finalLeft = triggerRect.left - contentRect.width - offset;
      flipped = true;
    } else if (side === 'left' && left < 0) {
      finalLeft = triggerRect.right + offset;
      flipped = true;
    }

    // Đảm bảo không tràn ra ngoài viewport (giới hạn an toàn)
    const margin = 8;
    if (finalTop < margin) finalTop = margin;
    if (finalTop + contentRect.height > viewport.height - margin) {
      finalTop = viewport.height - contentRect.height - margin;
    }
    if (finalLeft < margin) finalLeft = margin;
    if (finalLeft + contentRect.width > viewport.width - margin) {
      finalLeft = viewport.width - contentRect.width - margin;
    }

    return { top: finalTop, left: finalLeft };
  };

  // Cập nhật vị trí khi mở hoặc thay đổi props
  const updatePosition = () => {
    const pos = calculatePosition();
    if (pos) {
      setPosition(pos);
      setIsPositioned(true);
    }
  };

  // Xử lý click outside
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

  // Cập nhật vị trí khi open hoặc props thay đổi
  useEffect(() => {
    if (open && contentRef.current) {
      // Đợi content render xong mới tính toán
      requestAnimationFrame(() => {
        updatePosition();
      });
    } else {
      setIsPositioned(false);
    }
  }, [open, side, align, sideOffset]);

  // Xử lý resize và scroll để cập nhật vị trí
  useEffect(() => {
    if (!open) return;

    const handleUpdate = () => {
      requestAnimationFrame(updatePosition);
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [open]);

  const childrenArray = React.Children.toArray(children);
  const trigger = childrenArray.find(
    (child) =>
      React.isValidElement(child) && (child.type as any)?.displayName === 'DropdownTrigger',
  );
  const content = childrenArray.find(
    (child) =>
      React.isValidElement(child) && (child.type as any)?.displayName === 'DropdownContent',
  );

  return (
    <div className="relative inline-block">
      <div ref={triggerRef} onClick={() => setOpen(!open)}>
        {trigger}
      </div>
      {open && content && (
        <div
          ref={contentRef}
          className="fixed z-50"
          style={{
            top: position.top,
            left: position.left,
            opacity: isPositioned ? 1 : 0,
            transition: 'opacity 0.15s ease',
            pointerEvents: 'auto',
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}

Dropdown.displayName = 'Dropdown';

export default Dropdown;