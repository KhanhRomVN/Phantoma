import { ToolbarButton } from '../../../ui/ToolbarButton'
import { RequestTemplate } from './RequestTemplate'
import { AttackResultsTable } from './AttackResultsTable'

export function ViewIntruder() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 h-10 border-b border-zinc-800 bg-zinc-950 shrink-0">
        <span className="text-[9.5px] font-bold text-zinc-600 uppercase tracking-wider">Mode:</span>
        <ToolbarButton variant="cyan">Sniper</ToolbarButton>
        <ToolbarButton>Battering Ram</ToolbarButton>
        <ToolbarButton>Pitchfork</ToolbarButton>
        <ToolbarButton>Cluster Bomb</ToolbarButton>
        <div className="w-px h-4 bg-zinc-800 mx-1" />
        <ToolbarButton variant="green">▶ Start Attack</ToolbarButton>
        <ToolbarButton variant="red" className="ml-auto">■ Stop</ToolbarButton>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden gap-px bg-zinc-800">
        <RequestTemplate />
        <AttackResultsTable />
      </div>
    </div>
  )
}
