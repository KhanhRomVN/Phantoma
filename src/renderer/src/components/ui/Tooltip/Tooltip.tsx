import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../../shared/lib/utils';
import { TooltipProps } from './type';

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  side = 'right',
  align = 'center',
  sideOffset = 8,
  alignOffset = 0,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    let x = 0;
    let y = 0;

    // Tính vị trí dựa trên side
    switch (side) {
      case 'right':
        x = triggerRect.right + sideOffset;
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2 + alignOffset;
        break;
      case 'left':
        x = triggerRect.left - tooltipRect.width - sideOffset;
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2 + alignOffset;
        break;
      case 'top':
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2 + alignOffset;
        y = triggerRect.top - tooltipRect.height - sideOffset;
        break;
      case 'bottom':
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2 + alignOffset;
        y = triggerRect.bottom + sideOffset;
        break;
    }

    // Điều chỉnh align
    if (side === 'right' || side === 'left') {
      if (align === 'start') {
        y = triggerRect.top + alignOffset;
      } else if (align === 'end') {
        y = triggerRect.bottom - tooltipRect.height - alignOffset;
      }
    } else {
      if (align === 'start') {
        x = triggerRect.left + alignOffset;
      } else if (align === 'end') {
        x = triggerRect.right - tooltipRect.width - alignOffset;
      }
    }

    // Đảm bảo tooltip không tràn màn hình
    const margin = 8;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (x < margin) x = margin;
    if (x + tooltipRect.width > viewportWidth - margin) {
      x = viewportWidth - tooltipRect.width - margin;
    }
    if (y < margin) y = margin;
    if (y + tooltipRect.height > viewportHeight - margin) {
      y = viewportHeight - tooltipRect.height - margin;
    }

    setPosition({ x, y });
  };

  useEffect(() => {
    if (isVisible) {
      // Đợi tooltip render xong mới tính vị trí
      requestAnimationFrame(() => {
        calculatePosition();
        // Debug CSS variables
        if (tooltipRef.current) {
          const styles = getComputedStyle(tooltipRef.current);
          const bgColor = styles.getPropertyValue('--color-tooltip-background');
          console.log('[Tooltip] --color-tooltip-background:', bgColor);
          console.log('[Tooltip] Background color:', styles.backgroundColor);
          console.log('[Tooltip] All CSS variables:', {
            '--color-tooltip-background': styles.getPropertyValue('--color-tooltip-background'),
            '--tooltip-background': styles.getPropertyValue('--tooltip-background'),
            'bg-tooltip-background': styles.backgroundColor,
          });
        }
      });
    }
  }, [isVisible]);

  // Recalculate on scroll/resize
  useEffect(() => {
    if (!isVisible) return;

    const handleUpdate = () => {
      requestAnimationFrame(calculatePosition);
    };

    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [isVisible]);

  return (
    <div
      className={cn('relative inline-block', className)}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <div ref={triggerRef}>{children}</div>
      {isVisible && content && (
        <div
          ref={tooltipRef}
          className="fixed z-[9999] max-w-[280px] pointer-events-none whitespace-normal font-inherit bg-tooltip-background text-text-primary text-[11px] px-3 py-1.5 rounded shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-border"
          style={
            {
              top: position.y,
              left: position.x,
              opacity: 1,
              transition: 'opacity 0.15s ease',
              // Set CSS variable for arrow color
              '--arrow-color': 'var(--color-tooltip-background)',
            } as React.CSSProperties
          }
        >
          {/* Arrow - with outline on 2 sides using drop-shadow */}
          <div
            className="absolute w-0 h-0 border-solid pointer-events-none"
            style={{
              color: 'rgb(var(--tooltip-background, 26 31 46))',
              filter: 'drop-shadow(0 0 0 1px var(--border))',
              ...(side === 'top' && {
                bottom: '-6px',
                left: '50%',
                transform: 'translateX(-50%)',
                borderWidth: '6px 6px 0 6px',
                borderColor: 'currentColor transparent transparent transparent',
              }),
              ...(side === 'bottom' && {
                top: '-6px',
                left: '50%',
                transform: 'translateX(-50%)',
                borderWidth: '0 6px 6px 6px',
                borderColor: 'transparent transparent currentColor transparent',
              }),
              ...(side === 'left' && {
                right: '-6px',
                top: '50%',
                transform: 'translateY(-50%)',
                borderWidth: '6px 0 6px 6px',
                borderColor: 'transparent transparent transparent currentColor',
              }),
              ...(side === 'right' && {
                left: '-6px',
                top: '50%',
                transform: 'translateY(-50%)',
                borderWidth: '6px 6px 6px 0',
                borderColor: 'transparent currentColor transparent transparent',
              }),
            }}
          />
          {content}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
