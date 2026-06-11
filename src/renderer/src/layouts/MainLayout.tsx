import { Outlet } from 'react-router-dom';
import { useActiveModule } from '../features/Tool/hooks/useActiveModule';
import { useActiveSubItem } from '../features/Tool/hooks/useActiveSubItem';
import { useActiveTarget } from '../features/Tool/hooks/useActiveTarget';
import { ModuleBar } from '../components/ModuleBar';
import { IntelPanel } from '../components/IntelPanel';

/**
 * MainLayout — Shell of the application
 * Composes: ModuleBar | Outlet (route content) | IntelPanel
 * Mirrors the old ToolFeature layout from temp/Phantoma
 */
const MainLayout = () => {
  const { activeModule, setActiveModule } = useActiveModule('recon');
  const { activeSubItem, setActiveSubItem } = useActiveSubItem(null);
  const { activeSubTarget } = useActiveTarget();

  const handleSubItemSelect = (subItemId: string) => {
    setActiveSubItem(subItemId);
    // Ensure module is set to recon when a recon sub-item is selected
    if (subItemId.startsWith('recon-')) {
      setActiveModule('recon');
    }
  };

  return (
    <div className="phantom flex h-screen w-screen overflow-hidden bg-phantom-bg font-mono text-xs text-phantom-text">
      <ModuleBar
        active={activeModule}
        onSelect={setActiveModule}
        activeSubItem={activeSubItem}
        onSubItemSelect={handleSubItemSelect}
      />
      <div className="flex flex-1 min-w-0 overflow-hidden">
        <div className="flex-1 min-w-0 overflow-hidden">
          <Outlet />
        </div>
        <IntelPanel subTarget={activeSubTarget} />
      </div>
    </div>
  );
};

export default MainLayout;