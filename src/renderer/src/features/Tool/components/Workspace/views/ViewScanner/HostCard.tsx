import { cn } from '../../../../../../shared/lib/utils'
import { MockHost } from '../../../../types/phantom'
import { PortTag } from './PortTag'

interface HostCardProps {
  host: MockHost
  selected?: boolean
  onClick?: () => void
}

export function HostCard({ host, selected, onClick }: HostCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-[#111520] border rounded-md p-2.5 cursor-pointer transition-all',
        selected ? 'border-cyan-500/25 bg-cyan-500/4' : 'border-[#1e2535] hover:border-[#252e42] hover:bg-[#161b26]',
      )}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[12.5px] font-bold text-cyan-400 font-mono">{host.ip}</span>
        <span className="text-[10.5px] text-[#6b7a96]">{host.hostname}</span>
        <span className="ml-auto text-[10px] px-1.5 py-0 rounded bg-purple-500/12 text-purple-400 border border-purple-500/20">
          {host.os}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {host.ports.map((p) => <PortTag key={p.number} port={p.number} status={p.status} />)}
      </div>
    </div>
  )
}
