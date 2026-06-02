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
          : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800',
      )}
    >
      <NavIcon module={module} />
      {dotColor && !isActive && (
        <span className={cn('absolute top-1 right-1 w-1.5 h-1.5 rounded-full border border-zinc-900', dotColor)} />
      )}
    </button>
  )
}
