import { usePhantomModule } from '../../hooks/usePhantomModule'
import { LeftNav } from '../LeftNav'
import { PhantomSidebar } from '../PhantomSidebar'
import { Workspace } from '../Workspace'
import { RightPanel } from '../RightPanel'

/**
 * PhantomLayout — Offensive Security Suite shell
 * Composes: LeftNav | PhantomSidebar | Workspace | RightPanel
 */
export default function PhantomLayout() {
  const { activeModule, setActiveModule } = usePhantomModule('recon')

  return (
    <div className="phantom flex h-full w-full overflow-hidden bg-phantom-bg font-mono text-xs text-phantom-text">
      <LeftNav active={activeModule} onSelect={setActiveModule} />
      <div className="flex flex-1 min-w-0 overflow-hidden">
        <PhantomSidebar />
        <Workspace module={activeModule} />
        <RightPanel />
      </div>
    </div>
  )
}
