// src/renderer/src/features/Tool/components/IntelPanel/index.tsx
import type { SubTarget } from '../../features/Tool/types/types'
import { AgentPanel } from './AgentPanel'
import { TargetInfo } from './TargetInfo'

export function IntelPanel({ subTarget }: { subTarget: SubTarget }) {
  return (
    <div className="w-[450px] shrink-0 bg-[#141924] border-l border-[#1e2535] flex flex-col overflow-hidden">
      <AgentPanel />
      <TargetInfo subTarget={subTarget} />
    </div>
  )
}
