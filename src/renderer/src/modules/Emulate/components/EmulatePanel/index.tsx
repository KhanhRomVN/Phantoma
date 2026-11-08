import { useState, useRef, useEffect } from 'react';

import { AgentPanel } from '@renderer/components/Widgets/Zen';
import { SettingsProvider } from '@renderer/components/Widgets/Zen/context/SettingsContext';
import { cn } from '@renderer/utils/cn';

const MIN_WIDTH = 300;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 450;

export function EmulatePanel() {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef({ startX: 0, startWidth: 0 });

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const delta = resizeStartRef.current.startX - e.clientX;
      setWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, resizeStartRef.current.startWidth + delta)));
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    resizeStartRef.current = { startX: e.clientX, startWidth: width };
    setIsResizing(true);
  };

  return (
    <SettingsProvider>
      <div
        className="shrink-0 border-l border-divider flex flex-col overflow-hidden relative h-full"
        style={{ width: `${width}px` }}
      >
        <div
          onMouseDown={handleResizeStart}
          className={cn(
            'absolute left-0 top-0 bottom-0 w-1 cursor-col-resize group',
            'hover:bg-primary/30 transition-colors',
            isResizing && 'bg-primary/50',
          )}
          style={{ zIndex: 9999 }}
        >
          <div className="absolute left-0 top-0 bottom-0 w-4 -translate-x-1.5" />
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <AgentPanel feature="emulate" />
        </div>
      </div>
    </SettingsProvider>
  );
}

export default EmulatePanel;
