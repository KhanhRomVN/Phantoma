/**
 * ------------------------------------------------------------------
 * HeaderBar
 * ------------------------------------------------------------------
 * Thanh tiêu đề trên cùng của ứng dụng. Chứa logo PHANTOMA,
 * thanh tìm kiếm nhanh, các chỉ số hệ thống (CPU/RAM/Disk),
 * nút điều hướng và các nút điều khiển cửa sổ.
 *
 * Main features:
 * - Mở QuickNav qua click hoặc phím tắt
 * - Hiển thị chỉ số hệ thống mock (CPU/RAM/Disk)
 * - Điều khiển cửa sổ: minimize, maximize, close
 * - Mở SystemStatsModal khi click vào khu vực system monitors
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useEffect, useState } from 'react';

// ── UI ──
import {
  Bell,
  Settings,
  User,
  PanelRightClose,
  PanelRightOpen,
  Minus,
  Square,
  X,
  Search,
  Cpu,
  HardDrive,
  Activity,
} from 'lucide-react';

// ── Utils ──
import { logger } from '@renderer/utils/logger';

// ── Components ──
import { SystemStatsModal } from './SystemStatsModal';

// ─── Interfaces ─────────────────────────────────────────────────────────
interface HeaderBarProps {
  isRightPanelOpen?: boolean;
  onToggleRightPanel?: () => void;
  onOpenQuickNav?: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────
export function HeaderBar({
  isRightPanelOpen = true,
  onToggleRightPanel,
  onOpenQuickNav,
}: HeaderBarProps) {
  // ── State ──
  const [isMaximized, setIsMaximized] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

  // Mock system metrics
  const [cpuUsage] = useState(45);
  const [ramUsage] = useState(62);
  const [diskUsage] = useState(78);

  // ── Derived ──
  const ToggleIcon = isRightPanelOpen ? PanelRightClose : PanelRightOpen;

  // ── Effects ──
  useEffect(() => {
    const checkMaximized = async () => {
      try {
        const maximized = await window.api.invoke('window:isMaximized');
        setIsMaximized(maximized);
      } catch (error) {
        logger.error('Failed to check window state:', error);
      }
    };
    checkMaximized();

    const handleMaximize = () => setIsMaximized(true);
    const handleUnmaximize = () => setIsMaximized(false);

    window.api.on('window:maximized', handleMaximize);
    window.api.on('window:unmaximized', handleUnmaximize);

    return () => {
      window.api.off('window:maximized', handleMaximize);
      window.api.off('window:unmaximized', handleUnmaximize);
    };
  }, []);

  // ── Handlers ──
  const handleSearchClick = () => {
    onOpenQuickNav?.();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || (e.metaKey && e.key === 'k') || (e.ctrlKey && e.key === 'k')) {
      e.preventDefault();
      onOpenQuickNav?.();
    }
  };

  const handleMinimize = () => {
    window.api.invoke('window:minimize').catch((err) => logger.error('Failed to minimize window:', err));
  };

  const handleMaximize = () => {
    if (isMaximized) {
      window.api.invoke('window:unmaximize').catch((err) => logger.error('Failed to unmaximize window:', err));
    } else {
      window.api.invoke('window:maximize').catch((err) => logger.error('Failed to maximize window:', err));
    }
  };

  const handleClose = () => {
    window.api.invoke('window:close').catch((err) => logger.error('Failed to close window:', err));
  };

  // ── Render ──
  return (
    <>
      <div className="h-10 w-full shrink-0 border-b border-border bg-sidebar-background/80 backdrop-blur-sm px-4 flex items-center select-none">
        {/* Left Section */}
        <div className="flex items-center gap-3 flex-1">
          <span className="text-sm font-bold text-primary tracking-wider">PHANTOMA</span>
          <span className="text-[10px] font-mono text-text-secondary/60 bg-border/30 px-1.5 py-0.5 rounded border border-border/50">
            1.2.34
          </span>
        </div>

        {/* Center Section - Search Bar (Absolutely Centered) */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <div className="relative group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary/60 group-hover:text-text-secondary transition-colors pointer-events-none" strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Search files, commands, targets..."
              className="w-80 h-7 bg-input-background border border-input-border-default rounded-md pl-8 pr-12 text-xs text-text-primary placeholder:text-text-secondary/50 focus:border-primary/50 outline-none transition-colors cursor-pointer"
              onClick={handleSearchClick}
              onKeyDown={handleSearchKeyDown}
              readOnly
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[9px] font-mono text-text-secondary/60 bg-border/30 rounded border border-border/50 pointer-events-none">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3 flex-1 justify-end">
          {/* System Monitors */}
          <button
            onClick={() => setIsStatsModalOpen(true)}
            className="flex items-center gap-2 mr-2 px-2 py-1 rounded-md bg-background/50 hover:bg-sidebar-item-hover transition-colors cursor-pointer"
          >
            {/* CPU */}
            <div className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-blue-400" strokeWidth={2} />
              <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wide">CPU</span>
              <span className="text-[11px] font-mono font-semibold text-blue-400">{cpuUsage}%</span>
            </div>

            {/* RAM */}
            <div className="flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-emerald-400" strokeWidth={2} />
              <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wide">RAM</span>
              <span className="text-[11px] font-mono font-semibold text-emerald-400">{ramUsage}%</span>
            </div>

            {/* DISK */}
            <div className="flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5 text-purple-400" strokeWidth={2} />
              <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wide">DISK</span>
              <span className="text-[11px] font-mono font-semibold text-purple-400">{diskUsage}%</span>
            </div>
          </button>

          <button className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-sidebar-item-hover transition-colors">
            <Bell className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <button className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-sidebar-item-hover transition-colors">
            <Settings className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <button
            onClick={onToggleRightPanel}
            className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-sidebar-item-hover transition-colors"
          >
            <ToggleIcon className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center text-primary text-xs font-medium border border-primary/30">
            <User className="w-3.5 h-3.5" strokeWidth={1.5} />
          </div>
          {/* Window Controls */}
          <div className="flex items-center gap-1 ml-1 border-l border-border/50 pl-2">
            <button
              onClick={handleMinimize}
              className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-sidebar-item-hover transition-colors"
              title="Minimize"
            >
              <Minus className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
            <button
              onClick={handleMaximize}
              className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-sidebar-item-hover transition-colors"
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              <Square className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
            <button
              onClick={handleClose}
              className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:text-white hover:bg-red-500/80 transition-colors"
              title="Close"
            >
              <X className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* System Stats Modal - Rendered outside HeaderBar to avoid flex context issues */}
      <SystemStatsModal isOpen={isStatsModalOpen} onClose={() => setIsStatsModalOpen(false)} />
    </>
  );
}