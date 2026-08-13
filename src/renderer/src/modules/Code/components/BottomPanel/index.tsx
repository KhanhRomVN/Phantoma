/**
 * ------------------------------------------------------------------
 * Bottom Panel
 * ------------------------------------------------------------------
 * Resizable bottom panel container with tabbed views for Output,
 * Terminal, Port, Performance, and Problems. Supports dynamic tab
 * visibility, a "+" dropdown to add hidden tabs, keyboard shortcut
 * help tooltip, and resize handle (120px–600px).
 *
 * Main features:
 * - 5 tabs: Output, Terminal, Port, Performance, Problems
 * - Dynamic tab show/hide via "+" dropdown
 * - Resizable height with drag handle
 * - Keyboard shortcut reference tooltip
 * - Listens for add-bottom-tab custom event
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useState, useRef, useEffect } from 'react';

// ── UI ──
import { X, Plus, HelpCircle } from 'lucide-react';

// ── Hooks ──
import { useCodeStore } from '../../hooks/useCodeStore';

// ── Components ──
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';
import { Tooltip } from '@renderer/components/ui/Tooltip';
import { Terminal } from './Terminal';
import { Output } from './Output';
import { Port } from './Port';
import { Performance } from './Performance';
import { Problems } from './Problems';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';

// ─── Tab Definitions ────────────────────────────────────────────────────
interface TabDef {
  id: string;
  label: string;
  defaultVisible: boolean;
}

const ALL_TABS: TabDef[] = [
  { id: 'output', label: 'Output', defaultVisible: true },
  { id: 'terminal', label: 'Terminal', defaultVisible: true },
  { id: 'port', label: 'Port', defaultVisible: true },
  { id: 'performance', label: 'Performance', defaultVisible: false },
  { id: 'problems', label: 'Problem', defaultVisible: true },
];

// ─── Constants ──────────────────────────────────────────────────────────
const MIN_HEIGHT = 120;
const MAX_HEIGHT = 600;
const DEFAULT_HEIGHT = 320;

// ─── Component ──────────────────────────────────────────────────────────
export function BottomPanel() {
  console.log('[DEBUG|BottomPanel] render');
  // ── Store — select riêng fields thay vì toàn bộ project ──
  const bottomPanelTab = useCodeStore((s) => {
    const p = s.projects.find((p) => p.id === s.currentProjectId);
    return p?.bottomPanelTab ?? 'output';
  });
  const isBottomPanelOpen = useCodeStore((s) => {
    const p = s.projects.find((p) => p.id === s.currentProjectId);
    return p?.isBottomPanelOpen ?? true;
  });
  const setBottomPanelTab = useCodeStore((s) => s.setBottomPanelTab);
  const toggleBottomPanel = useCodeStore((s) => s.toggleBottomPanel);

  // ── State ──
  const [visibleTabIds, setVisibleTabIds] = useState<string[]>(
    ALL_TABS.filter((t) => t.defaultVisible).map((t) => t.id),
  );
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [isResizing, setIsResizing] = useState(false);

  // ── Refs ──
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  // ── Derived ──

  // ── Effects ──
  // Listen for add-bottom-tab event from keyboard shortcut
  useEffect(() => {
    const handler = (e: Event) => {
      const tabId = (e as CustomEvent).detail;
      if (tabId && !visibleTabIds.includes(tabId)) {
        setVisibleTabIds((prev) => [...prev, tabId]);
      }
    };
    window.addEventListener('add-bottom-tab', handler);
    return () => window.removeEventListener('add-bottom-tab', handler);
  }, [visibleTabIds]);

  // ── Handlers ──
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

  if (!isBottomPanelOpen) return null;

  const visibleTabs = ALL_TABS.filter((t) => visibleTabIds.includes(t.id));
  const hiddenTabs = ALL_TABS.filter((t) => !visibleTabIds.includes(t.id));

  const addTab = (tabId: string) => {
    setVisibleTabIds((prev) => {
      if (prev.includes(tabId)) return prev;
      return [...prev, tabId];
    });
    setBottomPanelTab(tabId as any);
  };

  const renderContent = () => {
    switch (bottomPanelTab) {
      case 'terminal':
        return <Terminal />;
      case 'output':
        return <Output />;
      case 'port':
        return <Port />;
      case 'performance':
        return <Performance />;
      case 'problems':
        return <Problems />;
      default:
        return <Output />;
    }
  };

  // ── Render ──
  return (
    <div
      className="flex flex-col bg-sidebar-background border-t border-divider flex-shrink-0 relative"
      style={{ height }}
    >
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
        {visibleTabs.map((tab) => {
          const isActive = tab.id === bottomPanelTab;
          return (
            <button
              key={tab.id}
              onClick={() => setBottomPanelTab(tab.id as any)}
              className={cn(
                'flex items-center gap-1.5 px-3 h-full text-xs font-medium whitespace-nowrap border-t-2 transition-colors',
                isActive
                  ? 'text-text-primary border-t-primary bg-background'
                  : 'text-text-secondary/60 border-t-transparent hover:text-text-secondary hover:bg-sidebar-item-hover/30',
              )}
            >
              {tab.label}
            </button>
          );
        })}

        <div className="flex-1" />

        {/* Right actions */}
        <div className="flex items-center gap-0.5 pr-1">
          <Tooltip
            side="top"
            align="end"
            sideOffset={6}
            content={
              <div className="flex flex-col gap-1.5 py-0.5">
                <div className="text-[11px] font-semibold text-text-primary mb-0.5">
                  Phím tắt Terminal
                </div>
                <div className="flex justify-between gap-6 text-[11px]">
                  <span className="text-text-secondary/70">Ctrl+`</span>
                  <span className="text-text-primary">Đóng/Mở Panel</span>
                </div>
                <div className="flex justify-between gap-6 text-[11px]">
                  <span className="text-text-secondary/70">Ctrl+Shift+`</span>
                  <span className="text-text-primary">Thêm Terminal</span>
                </div>
                <div className="flex justify-between gap-6 text-[11px]">
                  <span className="text-text-secondary/70">Ctrl+C</span>
                  <span className="text-text-primary">Ngắt lệnh hiện tại</span>
                </div>
                <div className="flex justify-between gap-6 text-[11px]">
                  <span className="text-text-secondary/70">Ctrl+D</span>
                  <span className="text-text-primary">Thoát shell (EOF)</span>
                </div>
                <div className="flex justify-between gap-6 text-[11px]">
                  <span className="text-text-secondary/70">Ctrl+L</span>
                  <span className="text-text-primary">Xóa màn hình</span>
                </div>
                <div className="flex justify-between gap-6 text-[11px]">
                  <span className="text-text-secondary/70">Ctrl+U</span>
                  <span className="text-text-primary">Xóa từ cursor về đầu dòng</span>
                </div>
                <div className="flex justify-between gap-6 text-[11px]">
                  <span className="text-text-secondary/70">Ctrl+W</span>
                  <span className="text-text-primary">Xóa 1 từ trước cursor</span>
                </div>
                <div className="flex justify-between gap-6 text-[11px]">
                  <span className="text-text-secondary/70">Ctrl+Shift+C</span>
                  <span className="text-text-primary">Copy</span>
                </div>
                <div className="flex justify-between gap-6 text-[11px]">
                  <span className="text-text-secondary/70">Ctrl+Shift+V</span>
                  <span className="text-text-primary">Paste</span>
                </div>
                <div className="flex justify-between gap-6 text-[11px]">
                  <span className="text-text-secondary/70">Chuột phải</span>
                  <span className="text-text-primary">Menu ngữ cảnh</span>
                </div>
              </div>
            }
          >
            <button className="p-1 rounded hover:bg-sidebar-item-hover text-text-secondary/40 hover:text-text-secondary transition-colors">
              <HelpCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </Tooltip>

          {hiddenTabs.length > 0 && (
            <Dropdown trigger="click" align="end" side="top" sideOffset={4}>
              <DropdownTrigger>
                <button className="p-1 rounded hover:bg-sidebar-item-hover text-text-secondary/40 hover:text-text-secondary transition-colors">
                  <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              </DropdownTrigger>
              <DropdownContent className="min-w-[160px]">
                {hiddenTabs.map((tab) => (
                  <DropdownItem key={tab.id} onClick={() => addTab(tab.id)} className="text-xs">
                    {tab.label}
                  </DropdownItem>
                ))}
              </DropdownContent>
            </Dropdown>
          )}

          <button
            onClick={toggleBottomPanel}
            className="p-1 rounded hover:bg-sidebar-item-hover text-text-secondary/40 hover:text-error transition-colors"
            title="Close panel"
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">{renderContent()}</div>
    </div>
  );
}

export default BottomPanel;