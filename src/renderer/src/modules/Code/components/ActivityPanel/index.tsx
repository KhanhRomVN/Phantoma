import { useRef, useState } from 'react';
import { useCodeStore } from '../../hooks/useCodeStore';
import { ActivityBar } from './ActivityBar';
import { FileExplore } from './FileExplore';
import { Search } from './Search';
import { SourceControl } from './SourceControl';
import { LSPPanel } from './LSP';
import { Folder, Search as SearchIcon, GitBranch, Code2 } from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';
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

export function ActivityPanel() {
  const project = useCodeStore((s) => s.projects.find((p) => p.id === s.currentProjectId));
  const setActivityPanelTab = useCodeStore((s) => s.setActivityPanelTab);
  const activityPanelWidth = useCodeStore((s) => s.activityPanelWidth);
  const setActivityPanelWidth = useCodeStore((s) => s.setActivityPanelWidth);
  const activityPanelTab = project?.activityPanelTab ?? 'explore';
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

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