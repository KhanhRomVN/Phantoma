import { cn } from '../../../../shared/lib/utils'
import { BadgeColor } from '../../types/phantom'

const BADGE_CLASS: Record<BadgeColor, string> = {
  green:  'bg-green-500/10 text-green-400 border-green-500/25',
  red:    'bg-red-500/10 text-red-400 border-red-500/25',
  amber:  'bg-amber-500/10 text-amber-400 border-amber-500/25',
  cyan:   'bg-cyan-500/10 text-cyan-400 border-cyan-500/25',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/25',
  gray:   'bg-zinc-500/10 text-zinc-400 border-zinc-500/25',
}

interface BadgeProps {
  children: React.ReactNode
  color: BadgeColor
  className?: string
}

export function Badge({ children, color, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0 text-[9px] font-bold rounded border', BADGE_CLASS[color], className)}>
      {children}
    </span>
  )
}
