import { cn } from '../../../../shared/lib/utils'
import { PhantomModule } from '../../types/phantom'
import { NavIcon } from './navIcons'

interface NavButtonProps {
  module: PhantomModule
  title: string
  isActive: boolean
  activeClass: string
  dotColor?: string
  onClick: () => void
}

export function NavButton({ module, title, isActive, activeClass, dotColor, onClick }: NavButtonProps) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={cn(
        'relative w-9 h-9 rounded-lg border flex items-center justify-center transition-all shrink-0',
        isActive
          ? activeClass
          : 'border-transparent text-[#6b7a96] hover:text-[#c5cfe0] hover:bg-[#161b26] hover:border-[#1e2535]',
      )}
    >
      <NavIcon module={module} />
      {dotColor && !isActive && (
        <span className={cn('absolute top-1 right-1 w-1.5 h-1.5 rounded-full border border-[#0f1319]', dotColor)} />
      )}
    </button>
  )
}
