import { PhantomModule } from '../../types/phantom'
import { NAV_MODULES } from '../../constants/modules'
import { NavLogo } from './NavLogo'
import { NavButton } from './NavButton'

interface LeftNavProps {
  active: PhantomModule
  onSelect: (m: PhantomModule) => void
}

const SEP_AFTER = new Set<PhantomModule>(['sqli', 'phishing'])

const Sep = () => <div className="w-7 h-px bg-[#1e2535] my-1 shrink-0" />

export function LeftNav({ active, onSelect }: LeftNavProps) {
  return (
    <div className="w-[52px] shrink-0 bg-[#0f1319] border-r border-[#1e2535] flex flex-col items-center py-2 gap-0.5 z-10 overflow-y-auto [&::-webkit-scrollbar]:w-0">
      <NavLogo />
      <Sep />

      {NAV_MODULES.map((item) => (
        <>
          <NavButton
            key={item.id}
            module={item.id}
            title={item.title}
            isActive={active === item.id}
            activeClass={item.activeClass}
            dotColor={item.dotColor}
            onClick={() => onSelect(item.id)}
          />
          {SEP_AFTER.has(item.id) && <Sep key={`sep-${item.id}`} />}
        </>
      ))}

      <div className="mt-auto flex flex-col items-center gap-1">
        <Sep />
        <NavButton
          module={'settings' as PhantomModule}
          title="Settings"
          isActive={active === 'settings'}
          activeClass="bg-amber-500/10 text-amber-400 border-amber-500/30"
          onClick={() => onSelect('settings' as PhantomModule)}
        />
      </div>
    </div>
  )
}
