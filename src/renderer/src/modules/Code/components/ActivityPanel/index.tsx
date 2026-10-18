/**
 * ------------------------------------------------------------------
 * Activity Panel (Right Side)
 * ------------------------------------------------------------------
 * Right sidebar panel container with horizontal topbar for tab
 * switching (File Explorer, Search, Design, History). Includes a
 * resizable width handle on the LEFT edge (200px–600px) and
 * delegates content rendering to the active tab component.
 *
 * Design tab: leaving it restores the previous content view, while
 * the design session (open design, agent UI) is kept in the store so
 * clicking the Design icon again brings it back.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useEffect, useRef, useState } from 'react';

// ── UI ─
import {
  Folder,
  Search as SearchIcon,
  Palette,
} from 'lucide-react';

// ── Hooks ─
import { useCodeStore, type ContentViewMode } from '../../hooks/useCodeStore';
import { useDesignStore } from '../../hooks/useDesignStore';

// ── Components ─
import { ActivityBar } from './ActivityBar';
import { FileExplore } from './FileExplore';
import { Search } from './Search';
import { Design } from './Design';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';

// ─── Constants ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'explore', icon: <Folder className="w-4 h-4" />, label: 'File Explorer' },
  { id: 'search', icon: <SearchIcon className="w-4 h-4" />, label: 'Search' },
  {
    id: 'design',
    icon: <Palette className="w-4 h-4" />,
    label: 'Design',
  },
];

const MIN_WIDTH = 200;
const MAX_WIDTH = 600;

// ─── Component ──────────────────────────────────────────────────────────
export function ActivityPanel() {
  // ── Store — select riêng activityPanelTab thay vì toàn bộ project ──
  const activityPanelTab = useCodeStore((s) => {
    const p = s.projects.find((p) => p.id === s.currentProjectId);
    return p?.activityPanelTab ?? 'explore';
  });
  const setActivityPanelTab = useCodeStore((s) => s.setActivityPanelTab);
  const activityPanelWidth = useCodeStore((s) => s.activityPanelWidth);
  const setActivityPanelWidth = useCodeStore((s) => s.setActivityPanelWidth);
  const contentViewMode = useCodeStore((s) => s.contentViewMode);
  const setContentViewMode = useCodeStore((s) => s.setContentViewMode);
  const hasActiveDesign = useDesignStore((s) => s.activeDesignId !== null);

  // ── State ──
  const [isResizing, setIsResizing] = useState(false);
  const [designMounted, setDesignMounted] = useState(activityPanelTab === 'design');

  useEffect(() => {
    if (activityPanelTab === 'design') setDesignMounted(true);
  }, [activityPanelTab]);

  // ── Refs ──
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const lastViewModeRef = useRef<ContentViewMode>('files');

  useEffect(() => {
    if (contentViewMode !== 'design') lastViewModeRef.current = contentViewMode;
  }, [contentViewMode]);

  // ── Handlers ──
  const handleTabChange = (tab: string) => {
    if (tab === 'design') {
      if (hasActiveDesign) setContentViewMode('design');
    } else if (contentViewMode === 'design') {
      setContentViewMode(lastViewModeRef.current);
    }
    setActivityPanelTab(tab as any);
  };

  // Resize from LEFT edge: dragging left increases width, dragging right decreases
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = activityPanelWidth;

    const handleMouseMove = (ev: MouseEvent) => {
      // Inverted delta because we resize from the left edge
      const delta = startXRef.current - ev.clientX;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidthRef.current + delta));
      setActivityPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const renderContent = () => {
    switch (activityPanelTab) {
      case 'explore':
        return <FileExplore />;
      case 'search':
        return <Search />;
      case 'design':
        return null;

      default:
        return <FileExplore />;
    }
  };

  // ── Render ──
  return (
    <div
      className="flex flex-col h-full bg-sidebar-background border-l border-border relative flex-shrink-0"
      style={{ width: activityPanelWidth }}
    >
      {/* Resize handle on LEFT edge */}
      <div
        className={cn(
          'absolute left-0 top-0 h-full w-1 cursor-col-resize transition-colors hover:bg-primary/30',
          isResizing && 'bg-primary/50',
        )}
        onMouseDown={handleMouseDown}
        style={{ zIndex: 10 }}
      />

      {/* Topbar: height matches panel width */}
      <ActivityBar activeTab={activityPanelTab} onTabChange={handleTabChange} tabs={TABS} />

      {/* Content area below topbar */}
      <div className="flex-1 overflow-hidden flex flex-col min-w-0">
        {designMounted && (
          <div
            className={cn(
              'min-h-0 flex-1 flex-col',
              activityPanelTab === 'design' ? 'flex' : 'hidden',
            )}
          >
            <Design />
          </div>
        )}
        {activityPanelTab !== 'design' && renderContent()}
      </div>
    </div>
  );
}