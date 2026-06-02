import { cn } from '../../../../shared/lib/utils'

interface PanelBoxProps {
  title: React.ReactNode
  badge?: React.ReactNode
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function PanelBox({ title, badge, children, className, style }: PanelBoxProps) {
  return (
    <div className={cn('flex flex-col bg-zinc-900 overflow-hidden', className)} style={style}>
      <div className="flex items-center gap-2 px-3 h-8 border-b border-zinc-800 bg-zinc-950 shrink-0">
        <span className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wider flex-1">{title}</span>
        {badge}
      </div>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
