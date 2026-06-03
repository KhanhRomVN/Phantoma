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
    <div className={cn('flex flex-col bg-[#141924] overflow-hidden', className)} style={style}>
      {/* pbox-hdr */}
      <div className="flex items-center gap-2 px-3 h-8 border-b border-[#1e2535] bg-[#0f1319] shrink-0 sticky top-0 z-[2]">
        <span className="text-[10.5px] font-bold text-[#6b7a96] uppercase tracking-[0.08em] flex-1">{title}</span>
        {badge}
      </div>
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[#252e42]">
        {children}
      </div>
    </div>
  )
}
