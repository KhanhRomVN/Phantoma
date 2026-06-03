import { ToolbarButton } from '../../../ui/ToolbarButton'
import { RequestTemplate } from './RequestTemplate'
import { AttackResultsTable } from './AttackResultsTable'

const TbSep = () => <div className="w-px h-[18px] bg-[#1e2535] shrink-0" />

export function ViewIntruder() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center gap-[5px] px-[10px] h-[38px] bg-[#0f1319] border-b border-[#1e2535] shrink-0 overflow-x-auto [&::-webkit-scrollbar]:h-0">
        <span className="text-[9.5px] text-[#3d4a61] uppercase tracking-[0.07em] whitespace-nowrap">Mode:</span>
        <ToolbarButton variant="cyan">Sniper</ToolbarButton>
        <ToolbarButton>Battering Ram</ToolbarButton>
        <ToolbarButton>Pitchfork</ToolbarButton>
        <ToolbarButton>Cluster Bomb</ToolbarButton>
        <TbSep />
        <ToolbarButton variant="green">▶ Start Attack</ToolbarButton>
        <ToolbarButton variant="red" className="ml-auto">■ Stop</ToolbarButton>
      </div>
      <div className="flex flex-1 overflow-hidden gap-px bg-[#1e2535]">
        <RequestTemplate />
        <AttackResultsTable />
      </div>
    </div>
  )
}
