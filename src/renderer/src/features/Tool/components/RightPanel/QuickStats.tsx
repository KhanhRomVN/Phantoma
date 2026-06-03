import { cn } from '../../../../shared/lib/utils'

const STATS = [
  { val: '27', label: 'Vulnerabilities', color: 'text-red-400',    border: 'border-red-500/20' },
  { val: '3',  label: 'Critical RCE',    color: 'text-purple-400', border: 'border-purple-500/20' },
  { val: '47', label: 'Subdomains',      color: 'text-green-400',  border: 'border-green-500/18' },
  { val: '12', label: 'Hosts Up',        color: 'text-cyan-400',   border: 'border-cyan-500/18' },
]

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[9.5px] font-bold text-[#3d4a61] uppercase tracking-[0.09em] pb-[5px] border-b border-[#1e2535] mb-[6px]">
    {children}
  </div>
)

export function QuickStats() {
  return (
    <div className="mb-4">
      <SectionTitle>Quick Stats</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {STATS.map((s) => (
          <div key={s.label} className={cn('bg-[#080a0e] border rounded-md p-2 text-center', s.border)}>
            <div className={cn('text-xl font-bold', s.color)}>{s.val}</div>
            <div className="text-[9.5px] text-[#6b7a96]">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
