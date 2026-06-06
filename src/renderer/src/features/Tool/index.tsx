import { useActiveModule } from './hooks/useActiveModule'
import { useActiveSubItem } from './hooks/useActiveSubItem'
import { ModuleBar } from './components/ModuleBar'
import { Workspace } from './components/WorkspaceSection'
import { IntelPanel } from './components/IntelPanel'
import { useActiveTarget } from './hooks/useActiveTarget'

/**
 * Tool Feature — Offensive Security Suite shell
 * Composes: ModuleBar | Workspace | RightPanel
 * OperationsPanel removed — Sessions/Arsenal/Vault moved to C2 module
 */
export default function ToolFeature() {
  const { activeModule, setActiveModule } = useActiveModule('recon')
  const { activeSubItem, setActiveSubItem } = useActiveSubItem(null)
  const { activeSubTarget } = useActiveTarget()

  const handleSubItemSelect = (subItemId: string) => {
    setActiveSubItem(subItemId)
    // Ensure module is set to recon when a recon sub-item is selected
    if (subItemId.startsWith('recon-')) {
      setActiveModule('recon')
    }
  }

  return (
    <div className="phantom flex h-full w-full overflow-hidden bg-phantom-bg font-mono text-xs text-phantom-text">
      <ModuleBar
        active={activeModule}
        onSelect={setActiveModule}
        activeSubItem={activeSubItem}
        onSubItemSelect={handleSubItemSelect}
      />
      <div className="flex flex-1 min-w-0 overflow-hidden">
        <Workspace module={activeModule} subTarget={activeSubTarget} activeSubItem={activeSubItem} />
        <IntelPanel subTarget={activeSubTarget} />
      </div>
    </div>
  )
}
