import React from 'react';
import { cn } from '../../../../shared/lib/utils';

interface ResizableSplitProps {
  children: [React.ReactNode, React.ReactNode];
  direction: 'horizontal' | 'vertical';
  initialSize?: number;
  minSize?: number;
  maxSize?: number;
}

export const ResizableSplit = ({
  children,
  direction,
  initialSize = 50,
  minSize = 20,
  maxSize = 80,
}: ResizableSplitProps) => {
  const [splitSize, setSplitSize] = React.useState(initialSize);
  const [isDragging, setIsDragging] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const startXRef = React.useRef(0);
  const startYRef = React.useRef(0);
  const startSizeRef = React.useRef(0);

  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      startXRef.current = e.clientX;
      startYRef.current = e.clientY;
      startSizeRef.current = splitSize;
      e.preventDefault();
    },
    [splitSize],
  );

  const handleMouseMove = React.useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      let newSize: number;

      if (direction === 'vertical') {
        const deltaX = e.clientX - startXRef.current;
        const deltaPercent = (deltaX / containerRect.width) * 100;
        newSize = startSizeRef.current + deltaPercent;
      } else {
        const deltaY = e.clientY - startYRef.current;
        const deltaPercent = (deltaY / containerRect.height) * 100;
        newSize = startSizeRef.current + deltaPercent;
      }

      newSize = Math.max(minSize, Math.min(maxSize, newSize));
      setSplitSize(newSize);
    },
    [isDragging, direction, minSize, maxSize],
  );

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const [firstChild, secondChild] = children;
  const isVertical = direction === 'vertical';

  return (
    <div
      ref={containerRef}
      className="flex w-full h-full overflow-hidden"
      style={{ flexDirection: isVertical ? 'row' : 'column' }}
    >
      <div style={{ flexBasis: `${splitSize}%`, flexGrow: 0, flexShrink: 0, overflow: 'auto' }}>
        {firstChild}
      </div>
      <div
        className={cn(
          'bg-[var(--divider)] hover:bg-[var(--accent-purple)] transition-colors cursor-col-resize shrink-0',
          isVertical ? 'w-px hover:w-0.5' : 'h-px hover:h-0.5',
        )}
        style={isVertical ? { width: '1px' } : { height: '1px' }}
        onMouseDown={handleMouseDown}
      />
      <div style={{ flex: 1, overflow: 'auto' }}>{secondChild}</div>
    </div>
  );
};

export default ResizableSplit;