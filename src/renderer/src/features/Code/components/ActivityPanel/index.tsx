import { useRef, useState } from 'react';
import { useCodeStore } from '../../hooks/useCodeStore';
import { ActivityBar } from './components/ActivityBar';
import { FileExplore } from './components/FileExplore';
import { Search } from './components/Search';
import { SourceControl } from './components/SourceControl';
import { Folder, Search as SearchIcon, GitBranch } from 'lucide-react';
import { cn } from '../../../../shared/lib/utils';
const TABS = [
  { id: 'explore', icon: <Folder className="w-4 h-4" strokeWidth={1.3} />, label: 'File Explorer' },
  { id: 'search', icon: <SearchIcon className="w-4 h-4" strokeWidth={1.3} />, label: 'Search' },
  {
    id: 'source',
    icon: <GitBranch className="w-4 h-4" strokeWidth={1.3} />,
    label: 'Source Control',
  },
];

const MIN_WIDTH = 200;
const MAX_WIDTH = 600;

export function ActivityPanel() {
  const { activityPanelTab, setActivityPanelTab, activityPanelWidth, setActivityPanelWidth } =
    useCodeStore();
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

      {/* Resize handle */}
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
