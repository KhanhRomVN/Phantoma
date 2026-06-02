import { useState } from 'react'
import { cn } from '../../../../shared/lib/utils'
import { TargetsPanel } from './TargetsPanel'
import { SessionsPanel } from './SessionsPanel'
import { ReportsPanel } from './ReportsPanel'

type SidebarTab = 'targets' | 'sessions' | 'reports'

export function PhantomSidebar() {
  const [activeTab, setActiveTab] = useState<SidebarTab>('targets')

  return (
    <div className="w-[272px] shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-zinc-800 shrink-0">
        <div className="text-sm font-bold tracking-wider text-zinc-100 uppercase">PHANTOM</div>
        <div className="text-[10px] text-zinc-500 mt-0.5">Offensive Security Suite v2.4.1</div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 shrink-0">
        {(['targets', 'sessions', 'reports'] as SidebarTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 h-8 text-[10.5px] font-semibold tracking-wide border-b-2 transition-all capitalize',
              activeTab === tab
                ? 'text-cyan-400 border-cyan-400 bg-cyan-500/5'
                : 'text-zinc-500 border-transparent hover:text-zinc-300',
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {activeTab === 'targets'  && <TargetsPanel />}
        {activeTab === 'sessions' && <SessionsPanel />}
        {activeTab === 'reports'  && <ReportsPanel />}
      </div>
    </div>
  )
}
