import { cn } from '../../../../shared/lib/utils'

interface KVRowProps {
  label: string
  value: string
  valueColor?: string
}

export function KVRow({ label, value, valueColor }: KVRowProps) {
  return (
    <div className="flex gap-1.5 py-0.5 text-[10.5px] border-b border-zinc-800/50 last:border-0">
      <span className="text-zinc-500 w-28 shrink-0">{label}</span>
      <span className={cn('text-zinc-200 break-all', valueColor)}>{value}</span>
    </div>
  )
}
