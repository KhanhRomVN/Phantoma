import { useActiveModule } from './hooks/useActiveModule'
import { ModuleBar } from './components/ModuleBar'
import { PhantomSidebar } from './components/OperationsPanel'
import { Workspace } from './components/WorkspaceSection'
import { RightPanel } from './components/InspectorPanel'

/**
 * Tool Feature — Offensive Security Suite shell
 * Composes: ModuleBar | PhantomSidebar | Workspace | RightPanel
 */
export default function ToolFeature() {
  const { activeModule, setActiveModule } = useActiveModule('recon')

  return (
    <div className="phantom flex h-full w-full overflow-hidden bg-phantom-bg font-mono text-xs text-phantom-text">
      <ModuleBar active={activeModule} onSelect={setActiveModule} />
      <div className="flex flex-1 min-w-0 overflow-hidden">
        <PhantomSidebar />
        <Workspace module={activeModule} />
        <RightPanel />
      </div>
    </div>
  )
}
