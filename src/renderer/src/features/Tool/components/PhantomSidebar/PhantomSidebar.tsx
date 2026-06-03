import { useState } from 'react'
import { cn } from '../../../../shared/lib/utils'
import { TargetsPanel } from './TargetsPanel'
import { SessionsPanel } from './SessionsPanel'
import { ArsenalPanel } from './ArsenalPanel'
import { VaultPanel } from './VaultPanel'

type SidebarTab = 'targets' | 'sessions' | 'arsenal' | 'vault'

const TABS: { id: SidebarTab; label: string }[] = [
  { id: 'targets',  label: 'Targets'  },
  { id: 'sessions', label: 'Sessions' },
  { id: 'arsenal',  label: 'Arsenal'  },
  { id: 'vault',    label: 'Vault'    },
]

export function PhantomSidebar() {
  const [activeTab, setActiveTab] = useState<SidebarTab>('targets')

  return (
    <div className="w-[272px] shrink-0 bg-[#141924] border-r border-[#1e2535] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-[#1e2535] shrink-0">
        <div className="font-[Rajdhani,sans-serif] text-base font-bold tracking-wider text-[#c5cfe0] uppercase">PHANTOM</div>
        <div className="text-[10px] text-[#6b7a96] mt-0.5">Offensive Security Suite v2.5.0</div>
      </div>

      {/* Tabs — 4 tabs, font smaller to fit */}
      <div className="flex border-b border-[#1e2535] shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 h-8 text-[9.5px] font-semibold tracking-wide border-b-2 transition-all',
              activeTab === tab.id
                ? 'text-cyan-400 border-cyan-400 bg-cyan-500/5'
                : 'text-[#6b7a96] border-transparent hover:text-[#c5cfe0]',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        {activeTab === 'targets'  && <TargetsPanel />}
        {activeTab === 'sessions' && <SessionsPanel />}
        {activeTab === 'arsenal'  && <ArsenalPanel />}
        {activeTab === 'vault'    && <VaultPanel />}
      </div>
    </div>
  )
}
