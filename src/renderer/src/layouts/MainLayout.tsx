import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useActiveModule } from '../features/Tool/hooks/useActiveModule';
import { useActiveSubItem } from '../features/Tool/hooks/useActiveSubItem';
import { useActiveTarget } from '../features/Tool/hooks/useActiveTarget';
import { ModuleBar } from '../components/ModuleBar';
import { IntelPanel } from '../components/IntelPanel';
import { PhantomModule } from '../features/Tool/types/types';

// Import all modules
import { Dashboard } from '../features/Dashboard';
import { Recon } from '../features/Intel';
import Scan from '../features/Scan';
import InspectorPage from '../features/Tool';
import Emulate from '../features/Emulate';
import { Wireless } from '../features/Wireless';
import Setting from '../features/Setting';

// Map module ID to component
const MODULE_COMPONENTS: Record<PhantomModule, React.ComponentType<any>> = {
  dashboard: Dashboard,
  recon: Recon,
  scanner: Scan,
  tools: InspectorPage,
  emulate: Emulate,
  wireless: Wireless,
  target: InspectorPage,
  settings: Setting,
  // Additional modules from NAV_MODULES that might not be in routes
  vulns: () => null,
  exploit: () => null,
  post: () => null,
  intruder: () => null,
  webapp: () => null,
  sqli: () => null,
  forensics: () => null,
  malware: () => null,
  sniffer: () => null,
  cracking: () => null,
  phishing: () => null,
  cloud: () => null,
  report: () => null,
  collab: () => null,
  c2: () => null,
  osint: () => null,
  tool: () => null,
};

/**
 * MainLayout — Shell of the application
 * All modules are mounted simultaneously, only the active one is visible.
 * This preserves state when switching between modules.
 */
const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeModule, setActiveModule } = useActiveModule('recon');
  const { activeSubItem, setActiveSubItem } = useActiveSubItem(null);
  const { activeSubTarget } = useActiveTarget();

  // Sync activeModule with URL path (for backward compatibility)
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

  // Navigate when activeModule changes (update URL without unmounting)
  const handleModuleSelect = (moduleId: string) => {
    setActiveModule(moduleId as PhantomModule);
    // Update URL for bookmark/history support
    const path = moduleId === 'recon' ? '' : moduleId;
    navigate(`/${path}`, { replace: true });
  };

  const handleSubItemSelect = (subItemId: string) => {
    setActiveSubItem(subItemId);
    if (subItemId.startsWith('recon-')) {
      setActiveModule('recon');
      navigate('/recon', { replace: true });
    }
  };

  // Render all modules, only show the active one
  const renderModules = () => {
    return Object.entries(MODULE_COMPONENTS).map(([moduleId, Component]) => {
      const isActive = moduleId === activeModule;
      // Special props for certain modules
      let props = {};
      if (moduleId === 'scanner') {
        props = { activeSubItem: activeSubItem || 'scan-domain' };
      }
      if (moduleId === 'emulate') {
        props = {
          activeAppId: '',
          activeAppName: '',
          onSelectApp: async () => {},
          onStopSession: async () => {},
        };
      }
      return (
        <div
          key={moduleId}
          className="flex-1 min-w-0 h-full overflow-hidden"
          style={{ display: isActive ? 'flex' : 'none', flexDirection: 'column' }}
        >
          <Component {...props} />
        </div>
      );
    });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background font-mono text-xs text-text-primary">
      <ModuleBar
        active={activeModule}
        onSelect={handleModuleSelect}
        activeSubItem={activeSubItem}
        onSubItemSelect={handleSubItemSelect}
      />
      <div className="flex flex-1 min-w-0 overflow-hidden">
        <div className="flex-1 min-w-0 overflow-hidden relative">
          {renderModules()}
        </div>
        <IntelPanel subTarget={activeSubTarget} />
      </div>
    </div>
  );
};

export default MainLayout;