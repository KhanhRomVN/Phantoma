import { cn } from '../../../shared/lib/utils'

interface KVRowProps {
  label: string
  value: React.ReactNode
  valueColor?: string
  extra?: string
}

export function KVRow({ label, value, valueColor, extra }: KVRowProps) {
  return (
    <div className="flex gap-1.5 py-0.5 text-[10.5px] border-b border-white/[0.02] last:border-0">
      <span className="text-[#6b7a96] w-28 shrink-0">{label}</span>
      <div className="flex-1 min-w-0">
        <span className={cn('text-[#c5cfe0] break-all', valueColor)}>{value}</span>
        {extra && <div className="text-[9.5px] text-[#3d4a61] mt-0.5">{extra}</div>}
      </div>
    </div>
  )
}
