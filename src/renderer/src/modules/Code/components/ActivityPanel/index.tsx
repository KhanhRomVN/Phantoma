/**
 * ------------------------------------------------------------------
 * Activity Panel
 * ------------------------------------------------------------------
 * Left sidebar panel container with tabbed views for File Explorer,
 * Search, Source Control, and LSP server management. Includes a
 * resizable width handle (200px–600px) and delegates content
 * rendering to the active tab component.
 *
 * Main features:
 * - Tab bar (ActivityBar) + content area layout
 * - 4 tabs: File Explorer, Search, Source Control, LSP
 * - Resizable width via drag handle
 * - Reads/writes panel width and active tab from Code store
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useRef, useState } from 'react';

// ── UI ──
import { Folder, Search as SearchIcon, GitBranch, Code2 } from 'lucide-react';

// ── Hooks ──
import { useCodeStore } from '../../hooks/useCodeStore';

// ── Components ──
import { ActivityBar } from './ActivityBar';
import { FileExplore } from './FileExplore';
import { Search } from './Search';
import { SourceControl } from './SourceControl';
import { LSPPanel } from './LSP';

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
  {
    id: 'lsp',
    icon: <Code2 className="w-4 h-4" />,
    label: 'Language Servers',
  }
];

const MIN_WIDTH = 200;
const MAX_WIDTH = 600;

// ─── Component ──────────────────────────────────────────────────────────
export function ActivityPanel() {
  // ── Store ──
  const project = useCodeStore((s) => s.projects.find((p) => p.id === s.currentProjectId));
  const setActivityPanelTab = useCodeStore((s) => s.setActivityPanelTab);
  const activityPanelWidth = useCodeStore((s) => s.activityPanelWidth);
  const setActivityPanelWidth = useCodeStore((s) => s.setActivityPanelWidth);

  // ── State ──
  const [isResizing, setIsResizing] = useState(false);

  // ── Refs ──
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // ── Derived ──
  const activityPanelTab = project?.activityPanelTab ?? 'explore';

  // ── Handlers ──
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = activityPanelWidth;

    const handleMouseMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startXRef.current;
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
      case 'lsp':
        return <LSPPanel />;
      default:
        return null;
    }
  };

  // ── Render ──
  return (
    <div
      className="flex h-full bg-sidebar-background border-r border-border relative flex-shrink-0"
      style={{ width: activityPanelWidth }}
    >
      <ActivityBar
        activeTab={activityPanelTab}
        onTabChange={(tab: string) => setActivityPanelTab(tab as any)}
        tabs={TABS}
      />
      <div className="flex-1 overflow-hidden flex flex-col min-w-0">{renderContent()}</div>

      <div
        className={cn(
          'absolute right-0 top-0 h-full w-1 cursor-col-resize transition-colors hover:bg-primary/30',
          isResizing && 'bg-primary/50',
        )}
        onMouseDown={handleMouseDown}
        style={{ zIndex: 10 }}
      />
    </div>
  );
}