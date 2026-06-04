import { useActiveModule } from './hooks/useActiveModule'
import { useActiveTarget } from './hooks/useActiveTarget'
import { ModuleBar } from './components/ModuleBar'
import { Workspace } from './components/WorkspaceSection'
import { IntelPanel } from './components/IntelPanel'

/**
 * Tool Feature — Offensive Security Suite shell
 * Composes: ModuleBar | Workspace | RightPanel
 * OperationsPanel removed — Sessions/Arsenal/Vault moved to C2 module
 */
export default function ToolFeature() {
  const { activeModule, setActiveModule } = useActiveModule('recon')
  const { targets, activeTarget, activeSubTarget, switchTarget, switchSubTarget } = useActiveTarget()

  return (
    <div className="phantom flex h-full w-full overflow-hidden bg-phantom-bg font-mono text-xs text-phantom-text">
      <ModuleBar
        active={activeModule}
        onSelect={setActiveModule}
        targets={targets}
        activeTarget={activeTarget}
        activeSubTarget={activeSubTarget}
        onSwitchTarget={switchTarget}
        onSwitchSubTarget={switchSubTarget}
      />
      <div className="flex flex-1 min-w-0 overflow-hidden">
        <Workspace module={activeModule} subTarget={activeSubTarget} />
        <IntelPanel subTarget={activeSubTarget} />
      </div>
    </div>
  )
}
