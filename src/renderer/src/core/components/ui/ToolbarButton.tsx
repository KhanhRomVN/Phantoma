import { cn } from '../../../shared/lib/utils'

type ToolbarButtonVariant = 'default' | 'cyan' | 'green' | 'red' | 'amber' | 'purple'

const VARIANT_CLASS: Record<ToolbarButtonVariant, string> = {
  default: 'border-[#252e42] bg-[#161b26] text-[#6b7a96] hover:text-[#c5cfe0] hover:border-[#2a3a5c] hover:bg-[#111520]',
  cyan:    'border-cyan-500/30 bg-cyan-500/7 text-cyan-400 hover:bg-cyan-500/12',
  green:   'border-green-500/30 bg-green-500/7 text-green-400 hover:bg-green-500/12',
  red:     'border-red-500/30 bg-red-500/7 text-red-400 hover:bg-red-500/12',
  amber:   'border-amber-500/30 bg-amber-500/7 text-amber-400 hover:bg-amber-500/12',
  purple:  'border-purple-500/30 bg-purple-500/7 text-purple-400 hover:bg-purple-500/12',
}

interface ToolbarButtonProps {
  children: React.ReactNode
  variant?: ToolbarButtonVariant
  size?: 'sm' | 'md'
  onClick?: () => void
  disabled?: boolean
  className?: string
  active?: boolean
}

export function ToolbarButton({ children, variant = 'default', size = 'md', onClick, disabled, className, active }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded border font-semibold transition-all whitespace-nowrap shrink-0 flex items-center gap-[5px]',
        size === 'sm' ? 'h-[22px] px-[7px] text-[9.5px]' : 'h-[26px] px-[9px] text-[10px]',
        disabled ? 'opacity-40 cursor-not-allowed' : active ? VARIANT_CLASS[variant] : VARIANT_CLASS[variant],
        className,
      )}
    >
      {children}
    </button>
  )
}
