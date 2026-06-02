import { PhantomModule } from '../../types/phantom'
import { MODULE_TITLES } from '../../constants/modules'
import { PulseIndicator } from '../ui/PulseIndicator'

interface WorkspaceTopbarProps {
  module: PhantomModule
}

export function WorkspaceTopbar({ module }: WorkspaceTopbarProps) {
  const title = MODULE_TITLES[module] ?? module

  return (
    <div className="flex items-center gap-2.5 px-3 h-9 bg-zinc-950 border-b border-zinc-800 shrink-0">
      <span className="text-[13px] font-semibold text-zinc-500 tracking-wide">
        PHANTOM / <span className="text-zinc-200">{title}</span>{' '}
        / <span className="text-cyan-400">target.corp.local</span>
      </span>
      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-[10px] text-green-400">
          <PulseIndicator /> Session Active
        </div>
        <span className="text-[10px] text-zinc-400 px-2 py-0.5 border border-zinc-700 rounded">
          TUN0: 10.10.14.5
        </span>
      </div>
    </div>
  )
}
