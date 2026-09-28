/**
 * ------------------------------------------------------------------
 * Activity Panel (Right Side)
 * ------------------------------------------------------------------
 * Right sidebar panel container with horizontal topbar for tab
 * switching (File Explorer, Search, Source Control). Includes a
 * resizable width handle on the LEFT edge (200px–600px) and
 * delegates content rendering to the active tab component.
 *
 * Main features:
 * - Horizontal topbar (ActivityBar) + content area below
 * - Topbar height matches panel width for square aspect ratio
 * - 3 tabs: File Explorer, Search, Source Control
 * - Resizable width via LEFT drag handle
 * - Reads/writes panel width and active tab from Code store
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useRef, useState } from 'react';

// ── UI ──
import {
  Folder,
  Search as SearchIcon,
  GitBranch,
} from 'lucide-react';

// ── Hooks ──
import { useCodeStore } from '../../hooks/useCodeStore';

// ── Components ──
import { ActivityBar } from './ActivityBar';
import { FileExplore } from './FileExplore';
import { Search } from './Search';
import { SourceControl } from './SourceControl';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';

// ─── Constants ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'explore', icon: <Folder className="w-4 h-4" />, label: 'File Explorer' },
  { id: 'search', icon: <SearchIcon className="w-4 h-4" />, label: 'Search' },
  {
    id: 'source',
    icon: <GitBranch className="w-4 h-4" />,
    label: 'Source Control',
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

  // ── State ──
  const [isResizing, setIsResizing] = useState(false);

  // ── Refs ──
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // ── Handlers ──
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
      case 'source':
        return <SourceControl />;
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
      <ActivityBar
        activeTab={activityPanelTab}
        onTabChange={(tab: string) => setActivityPanelTab(tab as any)}
        tabs={TABS}
      />

      {/* Content area below topbar */}
      <div className="flex-1 overflow-hidden flex flex-col min-w-0">{renderContent()}</div>
    </div>
  );
}
