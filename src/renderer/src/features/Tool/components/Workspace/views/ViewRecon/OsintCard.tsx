import { cn } from '../../../../../../shared/lib/utils'

interface OsintCardProps {
  title: React.ReactNode
  icon?: React.ReactNode
  children: React.ReactNode
  highlight?: boolean
  colSpan2?: boolean
}

export function OsintCard({ title, icon, children, highlight, colSpan2 }: OsintCardProps) {
  return (
    <div className={cn(
      'bg-[#111520] border rounded-[7px] p-3',
      highlight ? 'border-red-500/20' : 'border-[#1e2535]',
      colSpan2 && 'col-span-2',
    )}>
      <div className="flex items-center gap-1.5 text-[9.5px] font-bold text-[#3d4a61] uppercase tracking-[0.08em] mb-2">
        {icon}
        {title}
      </div>
      {children}
    </div>
  )
}
