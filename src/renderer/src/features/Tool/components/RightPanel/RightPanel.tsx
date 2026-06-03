import { TargetInfo } from './TargetInfo'
import { ScanProgress } from './ScanProgress'
import { QuickStats } from './QuickStats'
import { AttackSurface } from './AttackSurface'
import { ActionButtons } from './ActionButtons'

export function RightPanel() {
  return (
    <div className="w-[300px] shrink-0 bg-[#141924] border-l border-[#1e2535] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 h-[38px] border-b border-[#1e2535] bg-[#0f1319] shrink-0">
        <span className="font-[Rajdhani,sans-serif] text-[14px] font-bold tracking-wider text-[#c5cfe0] uppercase flex-1">Inspector</span>
        <button className="text-[#3d4a61] text-[10px] hover:text-[#6b7a96] transition-colors">⋯</button>
      </div>
      {/* Body */}
      <div className="flex-1 overflow-y-auto p-2.5 [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[#252e42] [&::-webkit-scrollbar-thumb]:rounded-sm">
        <TargetInfo />
        <ScanProgress />
        <QuickStats />
        <AttackSurface />
        <ActionButtons />
      </div>
    </div>
  )
}
