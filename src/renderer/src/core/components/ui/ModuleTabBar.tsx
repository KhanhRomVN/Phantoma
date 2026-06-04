import { useState } from 'react'
import { cn } from '../../../shared/lib/utils'

interface ModuleTabBarProps {
  tabs: readonly string[]
  activeColor?: string // e.g. 'text-cyan-400 border-cyan-400 bg-cyan-500/5'
}

export function useModuleTabs(tabs: readonly string[]) {
  const [active, setActive] = useState(tabs[0] ?? '')
  return { active, setActive }
}

export function ModuleTabBar({ tabs, active, onTabChange, activeColor }: {
  tabs: readonly string[]
  active: string
  onTabChange: (tab: string) => void
  activeColor?: string
}) {
  const activeClass = activeColor ?? 'text-cyan-400 border-cyan-400 bg-cyan-500/5'

  return (
    <div className="flex border-b border-[#1e2535] bg-[#0f1319] shrink-0 overflow-x-auto [&::-webkit-scrollbar]:h-0">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={cn(
            'h-9 px-3.5 flex items-center text-[11.5px] font-medium border-b-2 whitespace-nowrap cursor-pointer border-r border-[#1e2535] transition-all',
            active === tab
              ? activeClass
              : 'border-b-transparent text-[#6b7a96] hover:text-[#c5cfe0] hover:bg-[#161b26]',
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}
