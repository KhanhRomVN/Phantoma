import { TargetInfo } from './TargetInfo'
import { ScanProgress } from './ScanProgress'
import { QuickStats } from './QuickStats'
import { AttackSurface } from './AttackSurface'
import { ActionButtons } from './ActionButtons'

export function RightPanel() {
  return (
    <div className="w-[308px] shrink-0 bg-zinc-900 border-l border-zinc-800 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 h-10 border-b border-zinc-800 bg-zinc-950 shrink-0">
        <span className="text-sm font-bold tracking-wider text-zinc-100 uppercase flex-1">Inspector</span>
        <button className="text-zinc-500 text-[10px] hover:text-zinc-300 transition-colors">⋯</button>
      </div>
      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3">
        <TargetInfo />
        <ScanProgress />
        <QuickStats />
        <AttackSurface />
        <ActionButtons />
      </div>
    </div>
  )
}
