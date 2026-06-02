import { cn } from '../../../../shared/lib/utils'

const STATS = [
  { val: '27', label: 'Vulnerabilities', color: 'text-red-400',    border: 'border-red-500/18' },
  { val: '3',  label: 'Critical RCE',    color: 'text-purple-400', border: 'border-purple-500/18' },
  { val: '47', label: 'Subdomains',      color: 'text-green-400',  border: 'border-green-500/15' },
  { val: '12', label: 'Hosts Up',        color: 'text-cyan-400',   border: 'border-cyan-500/15' },
]

export function QuickStats() {
  return (
    <div className="mb-4">
      <div className="text-[9.5px] font-bold text-zinc-600 uppercase tracking-wider pb-1 border-b border-zinc-800 mb-2">Quick Stats</div>
      <div className="grid grid-cols-2 gap-2">
        {STATS.map((s) => (
          <div key={s.label} className={cn('bg-zinc-950 border rounded-md p-2 text-center', s.border)}>
            <div className={cn('text-xl font-bold', s.color)}>{s.val}</div>
            <div className="text-[9.5px] text-zinc-500">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
