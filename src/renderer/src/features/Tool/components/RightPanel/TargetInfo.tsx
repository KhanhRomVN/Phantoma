import { KVRow } from '../ui/KVRow'

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[9.5px] font-bold text-[#3d4a61] uppercase tracking-[0.09em] pb-[5px] border-b border-[#1e2535] mb-[6px]">
    {children}
  </div>
)

export function TargetInfo() {
  return (
    <div className="mb-4">
      <SectionTitle>Selected Target</SectionTitle>
      <KVRow label="Hostname"   value="target.corp.local"    valueColor="text-cyan-400" />
      <KVRow label="IP Address" value="203.0.113.47" />
      <KVRow label="Status"     value="Online"               valueColor="text-green-400" />
      <KVRow label="OS"         value="Ubuntu 20.04 LTS" />
      <KVRow label="Open Ports" value="22, 80, 443, 3306"    valueColor="text-amber-400" />
      <KVRow label="Risk Score" value="CRITICAL (94/100)"    valueColor="text-red-400" />
    </div>
  )
}
