import React, { useState, useRef } from 'react';
import { X, AlertTriangle, Terminal as TerminalIcon } from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';
import { ReportProblems } from './ReportProblems';
import { ReportTerminal } from './ReportTerminal';

/**
 * ------------------------------------------------------------------
 * ReportBottomPanel
 * ------------------------------------------------------------------
 * Bottom panel cho Report workspace — tương tự BottomPanel của Code
 * module nhưng đơn giản hơn với 2 tabs: Problems + Terminal.
 * Hỗ trợ resize (120px–400px) và toggle đóng/mở.
 * ------------------------------------------------------------------
 */

interface ReportBottomPanelProps {
  /** URI của report files đang mở — dùng để lọc diagnostics */
  reportFileUris?: string[];
}

const MIN_HEIGHT = 120;
const MAX_HEIGHT = 400;
const DEFAULT_HEIGHT = 220;

type TabId = 'problems' | 'terminal';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'problems', label: 'Problems', icon: <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.5} /> },
  { id: 'terminal', label: 'Terminal', icon: <TerminalIcon className="w-3.5 h-3.5" strokeWidth={1.5} /> },
];

export const ReportBottomPanel: React.FC<ReportBottomPanelProps> = ({ reportFileUris }) => {
  const [activeTab, setActiveTab] = useState<TabId>('problems');
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [isOpen, setIsOpen] = useState(true);
  const [isResizing, setIsResizing] = useState(false);

  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startYRef.current = e.clientY;
    startHeightRef.current = height;

    const handleMouseMove = (ev: MouseEvent) => {
      const delta = startYRef.current - ev.clientY;
      const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeightRef.current + delta));
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (!isOpen) return null;

  return (
    <div
      className="flex flex-col bg-sidebar-background border-t border-divider flex-shrink-0 relative"
      style={{ height }}
    >
      {/* Resize handle */}
      <div
        className={cn(
          'absolute top-0 left-0 w-full h-1 cursor-row-resize transition-colors hover:bg-primary/30',
          isResizing && 'bg-primary/50',
        )}
        onMouseDown={handleResizeMouseDown}
        style={{ zIndex: 10 }}
      />

      {/* Tab bar */}
      <div className="flex items-center h-8 px-1 border-b border-divider flex-shrink-0 gap-0">
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 h-full text-xs font-medium whitespace-nowrap border-t-2 transition-colors',
                isActive
                  ? 'text-text-primary border-t-primary bg-background'
                  : 'text-text-secondary/60 border-t-transparent hover:text-text-secondary hover:bg-sidebar-item-hover/30',
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}

        <div className="flex-1" />

        <button
          onClick={() => setIsOpen(false)}
          className="p-1 mr-1 rounded hover:bg-sidebar-item-hover text-text-secondary/40 hover:text-error transition-colors"
          title="Close panel"
        >
          <X className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'problems' ? (
          <ReportProblems reportFileUris={reportFileUris} />
        ) : (
          <ReportTerminal />
        )}
      </div>
    </div>
  );
};

export default ReportBottomPanel;