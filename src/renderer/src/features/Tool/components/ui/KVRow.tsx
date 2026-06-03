import { cn } from '../../../../shared/lib/utils'

interface KVRowProps {
  label: string
  value: string
  valueColor?: string
}

export function KVRow({ label, value, valueColor }: KVRowProps) {
  return (
    <div className="flex gap-1.5 py-0.5 text-[10.5px] border-b border-white/[0.02] last:border-0">
      <span className="text-[#6b7a96] w-28 shrink-0">{label}</span>
      <span className={cn('text-[#c5cfe0] break-all', valueColor)}>{value}</span>
    </div>
  )
}
