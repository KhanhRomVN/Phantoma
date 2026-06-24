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

      if (direction === 'horizontal') {
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
    if (!isDragging) return;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const [firstChild, secondChild] = children;
  // Force horizontal layout when direction is 'horizontal'
  const isHorizontal = direction === 'horizontal';

  return (
    <div
      ref={containerRef}
      className="flex w-full h-full overflow-hidden"
      style={{ flexDirection: isHorizontal ? 'row' : 'column' }}
    >
      <div 
        style={{ 
          flexBasis: `${splitSize}%`, 
          flexGrow: 0, 
          flexShrink: 0, 
          overflow: 'auto',
          ...(isHorizontal ? { height: '100%' } : { width: '100%' })
        }}
      >
        {firstChild}
      </div>
      <div
        className={cn(
          'bg-divider hover:bg-info transition-colors shrink-0',
          isHorizontal ? 'cursor-col-resize w-px hover:w-0.5' : 'cursor-row-resize h-px hover:h-0.5',
        )}
        style={isHorizontal ? { width: '1px', height: '100%' } : { height: '1px', width: '100%' }}
        onMouseDown={handleMouseDown}
      />
      <div style={{ flex: 1, overflow: 'auto' }}>{secondChild}</div>
    </div>
  );
};

export default ResizableSplit;
