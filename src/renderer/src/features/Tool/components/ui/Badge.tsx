import { cn } from '../../../../shared/lib/utils'
import { BadgeColor } from '../../types/phantom'

const BADGE_CLASS: Record<BadgeColor, string> = {
  green:  'bg-green-500/12 text-green-400 border border-green-500/22',
  red:    'bg-red-500/15 text-red-400 border border-red-500/25',
  amber:  'bg-amber-500/12 text-amber-400 border border-amber-500/22',
  cyan:   'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  purple: 'bg-purple-500/12 text-purple-400 border border-purple-500/22',
  gray:   'bg-white/5 text-[#6b7a96] border border-white/10',
}

interface BadgeProps {
  children: React.ReactNode
  color: BadgeColor
  className?: string
}

export function Badge({ children, color, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-[5px] py-0 h-4 text-[9px] font-bold rounded', BADGE_CLASS[color], className)}>
      {children}
    </span>
  )
}
