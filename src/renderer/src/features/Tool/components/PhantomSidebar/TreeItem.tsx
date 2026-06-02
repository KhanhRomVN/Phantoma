import { cn } from '../../../../shared/lib/utils'
import { Badge } from '../ui/Badge'
import { BadgeColor } from '../../types/phantom'

interface TreeItemProps {
  label: string
  badge?: string
  badgeColor?: BadgeColor
  icon?: React.ReactNode
  selected?: boolean
  selectedVariant?: 'cyan' | 'red'
  onClick?: () => void
}

export function TreeItem({ label, badge, badgeColor = 'gray', icon, selected, selectedVariant = 'cyan', onClick }: TreeItemProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer border transition-all text-[11px]',
        selected && selectedVariant === 'cyan' && 'bg-cyan-500/5 border-cyan-500/20 text-cyan-400',
        selected && selectedVariant === 'red' && 'bg-red-500/4 border-red-500/15 text-red-400',
        !selected && 'border-transparent text-zinc-300 hover:bg-zinc-800 hover:border-zinc-700',
      )}
    >
      {icon && <span className="w-3.5 h-3.5 shrink-0 opacity-70">{icon}</span>}
      <span className="flex-1 truncate">{label}</span>
      {badge && badgeColor && <Badge color={badgeColor}>{badge}</Badge>}
    </div>
  )
}
