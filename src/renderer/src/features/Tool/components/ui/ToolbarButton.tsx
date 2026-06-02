import { cn } from '../../../../shared/lib/utils'

type ToolbarButtonVariant = 'default' | 'cyan' | 'green' | 'red' | 'amber'

const VARIANT_CLASS: Record<ToolbarButtonVariant, string> = {
  default: 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600',
  cyan:    'border-cyan-500/30 bg-cyan-500/8 text-cyan-400 hover:bg-cyan-500/12',
  green:   'border-green-500/30 bg-green-500/8 text-green-400 hover:bg-green-500/12',
  red:     'border-red-500/30 bg-red-500/8 text-red-400 hover:bg-red-500/12',
  amber:   'border-amber-500/30 bg-amber-500/8 text-amber-400 hover:bg-amber-500/12',
}

interface ToolbarButtonProps {
  children: React.ReactNode
  variant?: ToolbarButtonVariant
  onClick?: () => void
  className?: string
}

export function ToolbarButton({ children, variant = 'default', onClick, className }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'h-6 px-2 rounded border text-[10px] font-semibold transition-all whitespace-nowrap',
        VARIANT_CLASS[variant],
        className,
      )}
    >
      {children}
    </button>
  )
}
