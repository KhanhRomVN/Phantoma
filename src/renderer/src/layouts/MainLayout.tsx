import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useActiveModule } from '../features/Tool/hooks/useActiveModule';
import { useActiveSubItem } from '../features/Tool/hooks/useActiveSubItem';
import { useActiveTarget } from '../features/Tool/hooks/useActiveTarget';
import { ModuleBar } from '../components/ModuleBar';
import { RightPanel } from '../components/RightPanel';
import { FooterBar } from '../components/FooterBar';
import { PhantomModule } from '../features/Tool/types/types';
import { ServerHealthGuard } from '../components/ServerHealthGuard';
import { FeatureProvider, useAgentFeature } from '../components/RightPanel/Agent/context/FeatureContext';

/**
 * MainLayout — Shell of the application
 * Composes: ModuleBar | Outlet (route content) | IntelPanel
 * Mirrors the old ToolFeature layout from temp/Phantoma
 */
const MainLayoutContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeModule, setActiveModule } = useActiveModule('recon');
  const { activeSubItem, setActiveSubItem } = useActiveSubItem(null);
  const { activeSubTarget } = useActiveTarget();
  const { setActiveFeature } = useAgentFeature();

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

  // Navigate when activeModule changes
  const handleModuleSelect = (moduleId: string) => {
    setActiveModule(moduleId as PhantomModule);
    navigate(`/${moduleId === 'recon' ? '' : moduleId}`);
  };

  const handleSubItemSelect = (subItemId: string) => {
    setActiveSubItem(subItemId);
    // Ensure module is set to recon when a recon sub-item is selected
    if (subItemId.startsWith('recon-')) {
      setActiveModule('recon');
      navigate('/recon');
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background font-mono text-xs text-text-primary">
      <ModuleBar
        active={activeModule}
        onSelect={handleModuleSelect}
        activeSubItem={activeSubItem}
        onSubItemSelect={handleSubItemSelect}
      />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <div className="flex flex-1 min-w-0 overflow-hidden">
          <div className="flex-1 min-w-0 overflow-hidden">
            <ServerHealthGuard>
              <Outlet />
            </ServerHealthGuard>
          </div>
          <RightPanel subTarget={activeSubTarget} />
        </div>
        <FooterBar />
      </div>
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
