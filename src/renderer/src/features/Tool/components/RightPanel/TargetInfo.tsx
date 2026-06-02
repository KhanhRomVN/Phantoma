import { KVRow } from '../ui/KVRow'

export function TargetInfo() {
  return (
    <div className="mb-4">
      <div className="text-[9.5px] font-bold text-zinc-600 uppercase tracking-wider pb-1 border-b border-zinc-800 mb-2">Selected Target</div>
      <KVRow label="Hostname"   value="target.corp.local"    valueColor="text-cyan-400" />
      <KVRow label="IP Address" value="203.0.113.47" />
      <KVRow label="Status"     value="Online"               valueColor="text-green-400" />
      <KVRow label="OS"         value="Ubuntu 20.04 LTS" />
      <KVRow label="Open Ports" value="22, 80, 443, 3306"    valueColor="text-amber-400" />
      <KVRow label="Risk Score" value="CRITICAL (94/100)"    valueColor="text-red-400" />
    </div>
  )
}
