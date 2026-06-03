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
        'flex items-center gap-[7px] px-2 py-[5px] rounded-[5px] cursor-pointer border transition-all text-[11px]',
        selected && selectedVariant === 'cyan' && 'bg-cyan-500/6 border-cyan-500/20 text-cyan-400',
        selected && selectedVariant === 'red'  && 'bg-red-500/6 border-red-500/20 text-red-400',
        !selected && 'border-transparent text-[#c5cfe0] hover:bg-[#161b26] hover:border-[#1e2535]',
      )}
    >
      {icon && <span className="w-3.5 h-3.5 shrink-0 opacity-75">{icon}</span>}
      <span className="flex-1 truncate">{label}</span>
      {badge && badgeColor && <Badge color={badgeColor}>{badge}</Badge>}
    </div>
  )
}
