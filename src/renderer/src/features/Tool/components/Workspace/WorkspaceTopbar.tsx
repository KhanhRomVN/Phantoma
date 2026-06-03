import { PhantomModule } from '../../types/phantom'
import { MODULE_TITLES } from '../../constants/modules'
import { PulseIndicator } from '../ui/PulseIndicator'

interface WorkspaceTopbarProps {
  module: PhantomModule
}

export function WorkspaceTopbar({ module }: WorkspaceTopbarProps) {
  const title = MODULE_TITLES[module] ?? module

  return (
    <div className="flex items-center gap-2.5 px-3.5 h-[38px] bg-[#0f1319] border-b border-[#1e2535] shrink-0">
      <span className="font-[Rajdhani,sans-serif] text-[13px] font-semibold text-[#6b7a96] tracking-wide">
        PHANTOM / <span className="text-[#c5cfe0]">{title}</span>{' '}
        / <span className="text-cyan-400" id="breadcrumb-target">target.corp.local</span>
      </span>
      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-[10px] text-green-400">
          <PulseIndicator /> Session Active
        </div>
        <span className="text-[10px] text-[#6b7a96] px-1.5 py-0.5 border border-[#252e42] rounded">
          TUN0: 10.10.14.5
        </span>
        <span className="text-[10px] text-[#3d4a61]">3 sessions</span>
      </div>
    </div>
  )
}
