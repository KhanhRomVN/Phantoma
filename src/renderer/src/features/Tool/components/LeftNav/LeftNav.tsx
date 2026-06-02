import { PhantomModule } from '../../types/phantom'
import { NAV_MODULES } from '../../constants/modules'
import { NavLogo } from './NavLogo'
import { NavButton } from './NavButton'

interface LeftNavProps {
  active: PhantomModule
  onSelect: (m: PhantomModule) => void
}

export function LeftNav({ active, onSelect }: LeftNavProps) {
  return (
    <div className="w-12 shrink-0 bg-zinc-950 border-r border-zinc-800 flex flex-col items-center py-2 gap-1 z-10">
      <NavLogo />
      <div className="w-7 h-px bg-zinc-800 my-0.5 shrink-0" />

      {NAV_MODULES.map((item) => (
        <NavButton
          key={item.id}
          module={item.id}
          title={item.title}
          isActive={active === item.id}
          activeClass={item.activeClass}
          dotColor={item.dotColor}
          onClick={() => onSelect(item.id)}
        />
      ))}

      <div className="mt-auto flex flex-col items-center gap-1">
        <div className="w-7 h-px bg-zinc-800 my-0.5" />
        <button
          className="w-9 h-9 rounded-lg border border-transparent text-amber-400 hover:bg-amber-500/10 flex items-center justify-center transition-all"
          title="Settings"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
            <circle cx="8" cy="8" r="2"/>
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
