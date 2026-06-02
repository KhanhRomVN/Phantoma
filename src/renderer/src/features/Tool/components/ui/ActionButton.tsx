import { cn } from '../../../../shared/lib/utils'

type ActionButtonVariant = 'default' | 'red' | 'green' | 'cyan' | 'purple'

const VARIANT_CLASS: Record<ActionButtonVariant, string> = {
  default: 'hover:border-zinc-600 hover:bg-zinc-800',
  red:     'hover:border-red-500/40 hover:text-red-400 hover:bg-red-500/6',
  green:   'hover:border-green-500/40 hover:text-green-400 hover:bg-green-500/6',
  cyan:    'hover:border-cyan-500/40 hover:text-cyan-400 hover:bg-cyan-500/6',
  purple:  'hover:border-purple-500/40 hover:text-purple-400 hover:bg-purple-500/6',
}

interface ActionButtonProps {
  children: React.ReactNode
  variant?: ActionButtonVariant
  onClick?: () => void
  className?: string
}

export function ActionButton({ children, variant = 'default', onClick, className }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-2.5 py-1.5 rounded border border-zinc-700 bg-zinc-950 text-zinc-300 text-[10.5px] font-semibold flex items-center gap-2 mb-1.5 transition-all',
        VARIANT_CLASS[variant],
        className,
      )}
    >
      {children}
    </button>
  )
}
