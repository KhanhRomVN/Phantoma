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
// ── React ─
import { useEffect, useState } from 'react';

// ── Hooks ─
import { useActiveModule } from '@renderer/hooks/useActiveModule';

// ── UI ─
import {
  Bell,
  Settings,
  User,
  PanelRightClose,
  PanelRightOpen,
  Minus,
  Square,
  X,
  Cpu,
  HardDrive,
  Activity,
} from 'lucide-react';

// ── Components ──
import { SystemStatsModal } from './SystemStatsModal';

// ── Utils ─
import { cn } from '@renderer/shared/utils/cn';
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
}: HeaderBarProps) {
  // ── Hooks ─
  const { activeModule } = useActiveModule();

  // ── State ─
  const [isMaximized, setIsMaximized] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

  // Emulate Service States
  const [emulateUrl, setEmulateUrl] = useState('localhost:3002');
  const [emulateStatus, setEmulateStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Mock system metrics
  const [cpuUsage] = useState(45);
  const [ramUsage] = useState(62);
  const [diskUsage] = useState(78);

  // ── Derived
  const ToggleIcon = isRightPanelOpen ? PanelRightClose : PanelRightOpen;
  const isEmulateMode = activeModule === 'emulate';

  // Load emulate URL from localStorage and check health
  useEffect(() => {
    const saved = localStorage.getItem('emulate_service_url');
    if (saved) {
      setEmulateUrl(saved);
    }

    // Initial health check
    checkEmulateHealth(saved || 'localhost:3002');

    // ASSUMED: poll 5s/lần để dot phản ánh việc emulate-server tắt/bật sau khi mount
    const timer = setInterval(() => {
      checkEmulateHealth(localStorage.getItem('emulate_service_url') || 'localhost:3002', true);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const checkEmulateHealth = async (url: string, silent = false) => {
    if (!silent) setEmulateStatus('checking');
    try {
      const baseUrl = url.startsWith('http') ? url : `http://${url}`;
      const res = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        setEmulateStatus('online');
      } else {
        setEmulateStatus('offline');
      }
    } catch {
      setEmulateStatus('offline');
    }
  };
  // ── Effects ──
  useEffect(() => {
    const checkMaximized = async () => {
      try {
        const maximized = await window.api.invoke('window:isMaximized');
        setIsMaximized(maximized);
      } catch (error) {}
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

  const handleMinimize = () => {
    window.api
      .invoke('window:minimize')
      .catch((err) => console.error('Failed to minimize window:', err));
  };

  const handleMaximize = () => {
    if (isMaximized) {
      window.api
        .invoke('window:unmaximize')
        .catch((err) => console.error('Failed to unmaximize window:', err));
    } else {
      window.api
        .invoke('window:maximize')
        .catch((err) => console.error('Failed to maximize window:', err));
    }
  };

  const handleClose = () => {
    window.api.invoke('window:close').catch((err) => console.error('Failed to close window:', err));
  };

  // ── Render ──
  return (
    <>
      <div className="h-10 w-full shrink-0 border-b border-border bg-sidebar-background/80 backdrop-blur-sm px-4 flex items-center select-none">
        {/* Left Section */}
        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center gap-2">
            <img
              src="/images/phantoma-dark-logo.png"
              alt="Phantoma"
              className="w-6 h-6 shrink-0 object-contain dark:hidden"
              draggable={false}
            />
            <img
              src="/images/phantoma-light-logo.png"
              alt="Phantoma"
              className="w-6 h-6 shrink-0 object-contain hidden dark:block"
              draggable={false}
            />
            <span className="text-[13px] font-semibold tracking-tight text-text-primary">Phantoma</span>
            <span className="text-[10px] font-mono text-text-secondary bg-border/30 px-1.5 py-0.5 rounded-full">
              1.2.34
            </span>
          </div>

          {/* Emulate Service Status & Config - Only visible in Emulate module */}
          {isEmulateMode && (
            <div
              className="ml-2 flex items-center gap-2"
              title={`Emulate Backend: ${emulateStatus.toUpperCase()} (${emulateUrl})`}
            >
              <span
                className={cn(
                  'w-2 h-2 rounded-full shrink-0',
                  emulateStatus === 'online' && 'bg-success',
                  emulateStatus === 'offline' && 'bg-error',
                  emulateStatus === 'checking' && 'bg-amber-500',
                )}
              />
              <span className="text-[11px] font-mono font-semibold text-text-primary whitespace-nowrap">
                {emulateUrl}
              </span>
            </div>
          )}
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
              <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wide">
                CPU
              </span>
              <span className="text-[11px] font-mono font-semibold text-text-secondary">{cpuUsage}%</span>
            </div>

            {/* RAM */}
            <div className="flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-emerald-400" strokeWidth={2} />
              <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wide">
                RAM
              </span>
              <span className="text-[11px] font-mono font-semibold text-text-secondary">
                {ramUsage}%
              </span>
            </div>

            {/* DISK */}
            <div className="flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5 text-purple-400" strokeWidth={2} />
              <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wide">
                DISK
              </span>
              <span className="text-[11px] font-mono font-semibold text-text-secondary">
                {diskUsage}%
              </span>
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
