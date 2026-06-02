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
      'bg-zinc-900 border rounded-lg p-3',
      highlight ? 'border-red-500/20' : 'border-zinc-800',
      colSpan2 && 'col-span-2',
    )}>
      <div className="flex items-center gap-1.5 text-[9.5px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
        {icon}
        {title}
      </div>
      {children}
    </div>
  )
}
