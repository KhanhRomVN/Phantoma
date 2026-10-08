/**
 * ------------------------------------------------------------------
 * MainLayout
 * ------------------------------------------------------------------
 * Bố cục chính của ứng dụng: HeaderBar, ViewContainer và RightPanel.
 * Quản lý việc đồng bộ module/feature, phím tắt điều hướng nhanh
 * và hiển thị modal shortcut cho module Recon.
 *
 * Main features:
 * - Đồng bộ activeFeature với activeModule
 * - Phím tắt Ctrl+B mở QuickNav, Ctrl+O theo module
 * - Quản lý trạng thái đóng/mở RightPanel
 * - Cung cấp FeatureProvider cho toàn bộ cây component
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useEffect, useState } from 'react';

// ── UI ──
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Radar,
  Antenna,
  Wrench,
  Gamepad2,
  Wifi,
  Code2,
  Settings,
} from 'lucide-react';

// ── Hooks ──
import { useCodeStore } from '../modules/Code/hooks/useCodeStore';
import { useActiveModule, useActiveModuleStore } from '../hooks/useActiveModule';
import { useActiveTarget } from '../hooks/useActiveTarget';
import { useGlobalCopyShortcut } from '../hooks/useGlobalCopyShortcut';

// ── Components ──
import { RightPanel } from '../components/RightPanel';
import { HeaderBar } from '../components/HeaderBar';
import { QuickNavModal } from '../components/QuickNavModal';
import { ServerHealthGuard } from '../components/ServerHealthGuard';
import { ViewContainer } from '../components/ViewContainer';
import { Modal, ModalBody } from '../components/ui/Modal';
import {
  FeatureProvider,
  useAgentFeature,
} from '../components/RightPanel/Agent/context/FeatureContext';

// ── Utils ──
import { logger } from '../utils/logger';

// ── Types ──
import { PhantomModule } from '../types/phantom-module';

// ─── Component ──────────────────────────────────────────────────────────
const MainLayoutContent = () => {
  // ── Hooks ──
  const { activeModule, setActiveModule } = useActiveModule('recon');
  const { activeSubTarget } = useActiveTarget();
  const { setActiveFeature } = useAgentFeature();

  // Enable global text copy support (Electron fix)
  useGlobalCopyShortcut();

  // ── State ─
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isQuickNavOpen, setIsQuickNavOpen] = useState(false);
  const [isReconModalOpen, setIsReconModalOpen] = useState(false);
  /** Thông báo khi renderer crash và Electron tự reload — target processes vẫn sống ngầm */
  const [crashNotice, setCrashNotice] = useState<{ reason: string; exitCode: number } | null>(null);

  // ── Effects ─
  useEffect(() => {
    if (activeModule === 'emulate') {
      setActiveFeature('emulate');
    } else if (activeModule === 'code') {
      setActiveFeature('code');
    } else if (activeModule === 'recon') {
      setActiveFeature('recon');
    } else {
      setActiveFeature(null);
    }
  }, [activeModule, setActiveFeature]);

  // Lắng nghe sự kiện renderer-crashed từ main process.
  // Main process đã KHÔNG kill target processes khi crash → capture vẫn chạy ngầm,
  // chỉ UI cần được thông báo để user biết trạng thái hiện tại.
  useEffect(() => {
    if (!window.api?.on) return;
    const handleCrashed = (_event: unknown, data: { reason?: string; exitCode?: number }) => {
      logger.warn('[MainLayout] Renderer crashed, recovering...', data);
      setCrashNotice({
        reason: data?.reason || 'unknown',
        exitCode: data?.exitCode ?? -1,
      });
      // Tự ẩn sau 8 giây nếu user không bấm dismiss
      setTimeout(() => setCrashNotice(null), 8000);
    };
    window.api.on('window:renderer-crashed', handleCrashed);
    return () => {
      window.api?.off?.('window:renderer-crashed', handleCrashed);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setIsQuickNavOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        switch (activeModule) {
          case 'code':
            useCodeStore.getState().setActivityPanelTab('explore');
            setActiveModule('code');
            break;
          case 'recon':
            setIsReconModalOpen(true);
            break;
          default:
            try {
              const result = await window.api.invoke('selectFolder');
              if (result?.success && result.folderPath) {
              }
            } catch (err) {
              logger.error('[Ctrl+O] Failed to open folder dialog:', err);
            }
            break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModule, setActiveModule]);

  // ── Derived ──
  // Ẩn hoàn toàn RightPanel khi ở module Code hoặc Preview (vì chúng có ActivityPanel riêng)
  const shouldShowRightPanel =
    isRightPanelOpen && activeModule !== 'code' && activeModule !== 'preview';
  const quickNavItems = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      description: 'Overview and statistics',
      icon: <LayoutDashboard className="w-4 h-4" strokeWidth={1.3} />,
      color: 'text-blue-400',
      action: () => {
        setActiveModule('dashboard' as PhantomModule);
      },
    },
    {
      id: 'recon',
      title: 'Reconnaissance',
      description: 'Domain, IP, and person reconnaissance',
      icon: <Radar className="w-4 h-4" strokeWidth={1.3} />,
      color: 'text-emerald-400',
      action: () => {
        setActiveModule('recon' as PhantomModule);
      },
    },
    {
      id: 'scanner',
      title: 'Scanner',
      description: 'Domain, network, and website scanning',
      icon: <Antenna className="w-4 h-4" strokeWidth={1.3} />,
      color: 'text-purple-400',
      action: () => {
        setActiveModule('scanner' as PhantomModule);
      },
    },
    {
      id: 'tools',
      title: 'Tools',
      description: 'Collection of security tools',
      icon: <Wrench className="w-4 h-4" strokeWidth={1.3} />,
      color: 'text-amber-400',
      action: () => {
        setActiveModule('tools' as PhantomModule);
      },
    },
    {
      id: 'emulate',
      title: 'Emulate',
      description: 'Emulation and simulation environment',
      icon: <Gamepad2 className="w-4 h-4" strokeWidth={1.3} />,
      color: 'text-rose-400',
      action: () => {
        setActiveModule('emulate' as PhantomModule);
      },
    },
    {
      id: 'wireless',
      title: 'Wireless',
      description: 'Wireless network analysis',
      icon: <Wifi className="w-4 h-4" strokeWidth={1.3} />,
      color: 'text-cyan-400',
      action: () => {
        setActiveModule('wireless' as PhantomModule);
      },
    },
    {
      id: 'code',
      title: 'Code',
      description: 'Code analysis and review',
      icon: <Code2 className="w-4 h-4" strokeWidth={1.3} />,
      color: 'text-indigo-400',
      action: () => {
        setActiveModule('code' as PhantomModule);
        // Force immediate check after a tiny delay to see if state propagated
        setTimeout(() => {
          const current = useActiveModuleStore.getState().activeModule;
        }, 50);
      },
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Application settings',
      icon: <Settings className="w-4 h-4" strokeWidth={1.3} />,
      color: 'text-gray-400',
      action: () => {
        setActiveModule('settings' as PhantomModule);
      },
    },
  ];

  // ── Render ──
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background font-mono text-xs text-text-primary">
      <HeaderBar
        isRightPanelOpen={isRightPanelOpen}
        onToggleRightPanel={() => setIsRightPanelOpen(!isRightPanelOpen)}
        onOpenQuickNav={() => setIsQuickNavOpen(true)}
      />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-1 min-w-0 overflow-hidden">
          <div className="flex-1 min-w-0 overflow-hidden">
            <ServerHealthGuard>
              <ViewContainer />
            </ServerHealthGuard>
          </div>
          <div className="shrink-0 h-full min-h-0">
            <AnimatePresence mode="wait">
              {shouldShowRightPanel && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="h-full overflow-hidden min-w-0 flex flex-col"
                >
                  <RightPanel subTarget={activeSubTarget} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <QuickNavModal
        isOpen={isQuickNavOpen}
        onClose={() => setIsQuickNavOpen(false)}
        items={quickNavItems}
      />

      {/* Modal placeholder cho module Recon khi nhấn Ctrl+O */}
      <Modal isOpen={isReconModalOpen} onClose={() => setIsReconModalOpen(false)}>
        <ModalBody className="p-6 text-center">
          <h2 className="text-lg font-semibold mb-2">Recon Modal</h2>
          <p className="text-sm text-text-secondary">
            Placeholder cho shortcut Ctrl+O ở module Recon.
          </p>
        </ModalBody>
      </Modal>

      {/* Toast cảnh báo renderer crash — target processes vẫn sống ngầm, chỉ UI reload */}
      {crashNotice && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-14 left-1/2 -translate-x-1/2 z-[9999] max-w-xl w-full px-4"
        >
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 backdrop-blur-sm p-3 flex items-start gap-3 shadow-lg">
            <span className="text-amber-400 shrink-0 mt-0.5">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-300">
                Giao diện đã khởi động lại do lỗi render
              </p>
              <p className="text-[11px] text-amber-200/80 mt-1 leading-relaxed">
                Lý do: <code>{crashNotice.reason}</code> (exit code {crashNotice.exitCode}). Các
                tiến trình capture đang chạy <strong>vẫn hoạt động ngầm</strong> — không bị gián
                đoạn. Bạn có thể quay lại tab Emulate để tiếp tục theo dõi traffic.
              </p>
            </div>
            <button
              onClick={() => setCrashNotice(null)}
              className="shrink-0 text-amber-300 hover:text-amber-100 text-xs px-2 py-1 rounded border border-amber-500/30"
            >
              Đóng
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// ─── Layout Wrapper ─────────────────────────────────────────────────────
const MainLayout = () => {
  return (
    <FeatureProvider>
      <MainLayoutContent />
    </FeatureProvider>
  );
};

export default MainLayout;
