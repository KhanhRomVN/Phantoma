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
import { useActiveModule } from '../hooks/useActiveModule';
import { useActiveTarget } from '../hooks/useActiveTarget';

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

  // ── State ──
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isQuickNavOpen, setIsQuickNavOpen] = useState(false);
  const [isReconModalOpen, setIsReconModalOpen] = useState(false);

  // ── Effects ──
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
                logger.info('[Ctrl+O] Selected folder:', result.folderPath);
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
              {isRightPanelOpen && (
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