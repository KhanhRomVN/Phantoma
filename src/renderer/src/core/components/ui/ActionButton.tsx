import { cn } from '../../../shared/lib/utils'

type ActionButtonVariant = 'default' | 'red' | 'green' | 'cyan' | 'purple' | 'amber'

const VARIANT_CLASS: Record<ActionButtonVariant, string> = {
  default: 'hover:border-[#2a3a5c] hover:bg-[#111520]',
  red:     'hover:border-red-500/40 hover:text-red-400 hover:bg-red-500/10',
  green:   'hover:border-green-500/40 hover:text-green-400 hover:bg-green-500/10',
  cyan:    'hover:border-cyan-500/40 hover:text-cyan-400 hover:bg-cyan-500/10',
  purple:  'hover:border-purple-500/40 hover:text-purple-400 hover:bg-purple-500/10',
  amber:   'hover:border-amber-500/40 hover:text-amber-400 hover:bg-amber-500/10',
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
        'w-full text-left px-2.5 py-1.5 rounded border border-[#252e42] bg-[#161b26] text-[#c5cfe0] text-[10.5px] font-semibold flex items-center gap-2 mb-1.5 transition-all',
        VARIANT_CLASS[variant],
        className,
      )}
    >
      {children}
    </button>
  )
}
