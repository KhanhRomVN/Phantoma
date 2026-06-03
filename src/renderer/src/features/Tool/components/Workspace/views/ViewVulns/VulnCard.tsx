import { cn } from '../../../../../../shared/lib/utils'
import { MockVuln } from '../../../../types/phantom'
import { SeverityPill } from '../../../ui/SeverityPill'
import { CVSS_COLOR } from '../../../../constants/severity'

interface VulnCardProps {
  vuln: MockVuln
  selected?: boolean
  onClick?: () => void
}

export function VulnCard({ vuln, selected, onClick }: VulnCardProps) {
  const barColor = vuln.cvss >= 9 ? 'bg-purple-400' : vuln.cvss >= 7 ? 'bg-red-400' : 'bg-amber-400'

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-[#111520] border rounded-md p-2.5 mb-2 cursor-pointer transition-all',
        selected ? 'border-cyan-500/30 bg-cyan-500/4' : 'border-[#1e2535] hover:border-[#252e42]',
      )}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <SeverityPill level={vuln.severity} />
        <span className="text-[12px] font-semibold text-[#c5cfe0] flex-1 min-w-0 truncate">{vuln.name}</span>
        <span className="text-[10px] text-[#6b7a96] shrink-0">{vuln.cve}</span>
      </div>
      <p className="text-[10.5px] text-[#6b7a96] leading-relaxed mb-1.5 line-clamp-2">{vuln.desc}</p>
      <div className="flex items-center gap-2 text-[10px] text-[#3d4a61]">
        <span className="truncate">{vuln.target}</span>
        <span>·</span>
        <span className="truncate">{vuln.component}</span>
        <div className="flex-1 h-[3px] bg-[#252e42] rounded overflow-hidden ml-2 shrink-0" style={{ minWidth: 40 }}>
          <div className={cn('h-full rounded', barColor)} style={{ width: `${(vuln.cvss / 10) * 100}%` }} />
        </div>
        <span className={cn('font-bold shrink-0', CVSS_COLOR(vuln.cvss))}>{vuln.cvss}</span>
      </div>
    </div>
  )
}
