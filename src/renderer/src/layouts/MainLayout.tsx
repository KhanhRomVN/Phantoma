import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Radar, 
  Antenna, 
  Wrench, 
  Gamepad2, 
  Wifi, 
  Code2, 
  Settings 
} from 'lucide-react';
import { useActiveModule } from '../features/Tool/hooks/useActiveModule';
import { useActiveTarget } from '../features/Tool/hooks/useActiveTarget';
import { RightPanel } from '../components/RightPanel';
import { FooterBar } from '../components/FooterBar';
import { HeaderBar } from '../components/HeaderBar';
import { QuickNavModal } from '../components/QuickNavModal';
import { PhantomModule } from '../features/Tool/types/types';
import { ServerHealthGuard } from '../components/ServerHealthGuard';
import {
  FeatureProvider,
  useAgentFeature,
} from '../components/RightPanel/Agent/context/FeatureContext';

const MainLayoutContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeModule, setActiveModule } = useActiveModule('recon');
  const { activeSubTarget } = useActiveTarget();
  const { setActiveFeature } = useAgentFeature();
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isQuickNavOpen, setIsQuickNavOpen] = useState(false);

  // Sync activeModule with URL path
  useEffect(() => {
    const currentPath = location.pathname.slice(1) || 'recon';
    const validPaths = [
      'dashboard',
      'recon',
      'scanner',
      'tools',
      'emulate',
      'wireless',
      'target',
      'settings',
    ];
    const isCurrentPathValid = validPaths.includes(currentPath);

    if (isCurrentPathValid && currentPath !== activeModule) {
      setActiveModule(currentPath as any);
    }
  }, [location.pathname, activeModule, setActiveModule]);

  // QuickNav keyboard shortcut: Ctrl+B
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

  // Sync activeFeature with URL path
  useEffect(() => {
    const currentPath = location.pathname.slice(1) || 'recon';
    // Map route to feature: only 'emulate' is currently supported
    if (currentPath === 'emulate') {
      setActiveFeature('emulate');
    } else {
      setActiveFeature(null);
    }
  }, [location.pathname, setActiveFeature]);

  const quickNavItems = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      description: 'Overview and statistics',
      icon: <LayoutDashboard className="w-4 h-4" strokeWidth={1.3} />,
      color: 'text-blue-400',
      action: () => {
        setActiveModule('dashboard' as PhantomModule);
        navigate('/dashboard');
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
        navigate('/recon');
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
        navigate('/scanner');
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
        navigate('/tools');
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
        navigate('/emulate');
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
        navigate('/wireless');
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
        navigate('/code');
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
        navigate('/settings');
      },
    },
  ];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background font-mono text-xs text-text-primary">
      <HeaderBar 
        isRightPanelOpen={isRightPanelOpen}
        onToggleRightPanel={() => setIsRightPanelOpen(!isRightPanelOpen)}
      />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-1 min-w-0 overflow-hidden">
          <div className="flex-1 min-w-0 overflow-hidden">
            <ServerHealthGuard>
              <Outlet />
            </ServerHealthGuard>
          </div>
          <div className="shrink-0 h-full min-h-0">
            <AnimatePresence mode="wait">
              {isRightPanelOpen && (
                <motion.div
                  layout
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 450, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="h-full overflow-hidden min-w-0 flex flex-col"
                >
                  <RightPanel subTarget={activeSubTarget} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <FooterBar />
      <QuickNavModal
        isOpen={isQuickNavOpen}
        onClose={() => setIsQuickNavOpen(false)}
        items={quickNavItems}
      />
    </div>
  );
};

const MainLayout = () => {
  return (
    <FeatureProvider>
      <MainLayoutContent />
    </FeatureProvider>
  );
};

export default MainLayout;