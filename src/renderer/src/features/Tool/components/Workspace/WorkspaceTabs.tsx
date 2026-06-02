import { cn } from '../../../../shared/lib/utils'
import { PhantomModule } from '../../types/phantom'
import { MODULE_WS_TABS } from '../../constants/modules'

interface WorkspaceTabsProps {
  module: PhantomModule
  activeTab: string
  onTabChange: (tab: string) => void
}

const ACTIVE_TAB_CLASS: Partial<Record<PhantomModule, string>> = {
  recon:    'text-cyan-400 border-cyan-400 bg-cyan-500/5',
  scanner:  'text-green-400 border-green-400 bg-green-500/5',
  vulns:    'text-red-400 border-red-400 bg-red-500/4',
  intruder: 'text-amber-400 border-amber-400 bg-amber-500/4',
  forensics:'text-purple-400 border-purple-400 bg-purple-500/5',
}

export function WorkspaceTabs({ module, activeTab, onTabChange }: WorkspaceTabsProps) {
  const tabs = MODULE_WS_TABS[module] ?? []
  const activeClass = ACTIVE_TAB_CLASS[module] ?? 'text-cyan-400 border-cyan-400 bg-cyan-500/5'

  return (
    <div className="flex border-b border-zinc-800 bg-zinc-950 shrink-0 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={cn(
            'h-9 px-3.5 flex items-center text-[11.5px] font-medium border-b-2 whitespace-nowrap cursor-pointer border-r border-zinc-800 transition-all',
            activeTab === tab
              ? activeClass
              : 'border-b-transparent text-zinc-500 hover:text-zinc-300',
          )}
        >
          {tab}
        </button>
      ))}
      <button className="h-9 px-3.5 flex items-center text-[11.5px] font-medium border-b-2 border-b-transparent text-purple-400 cursor-pointer ml-auto">
        + Module
      </button>
    </div>
  )
}
