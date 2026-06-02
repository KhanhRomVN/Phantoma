import { MockVuln } from '../../../../types/phantom'
import { KVRow } from '../../../ui/KVRow'
import { ActionButton } from '../../../ui/ActionButton'
import { CvssRing } from './CvssRing'

interface VulnDetailsProps {
  vuln: MockVuln
}

export function VulnDetails({ vuln }: VulnDetailsProps) {
  return (
    <div className="flex flex-col bg-zinc-900 overflow-hidden" style={{ width: '35%' }}>
      <div className="flex items-center px-3 h-8 border-b border-zinc-800 bg-zinc-950 shrink-0">
        <span className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wider">Details</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <CvssRing score={vuln.cvss} severity={vuln.severity} />

        <div className="mb-3">
          <div className="text-[9.5px] font-bold text-zinc-600 uppercase tracking-wider pb-1 border-b border-zinc-800 mb-2">CVE Details</div>
          <KVRow label="CVE ID"    value={vuln.cve}       valueColor="text-cyan-400" />
          <KVRow label="Target"    value={vuln.target} />
          <KVRow label="Component" value={vuln.component} />
          <KVRow label="Published" value="2024-01-15" />
          <KVRow label="In the wild" value="YES — Active" valueColor="text-red-400" />
        </div>

        <div>
          <div className="text-[9.5px] font-bold text-zinc-600 uppercase tracking-wider pb-1 border-b border-zinc-800 mb-2">Actions</div>
          <ActionButton variant="red">
            <span className="opacity-40 text-xs">›</span> Launch Exploit Module
          </ActionButton>
          <ActionButton variant="cyan">
            <span className="opacity-40 text-xs">›</span> Open in Metasploit
          </ActionButton>
          <ActionButton variant="purple">
            <span className="opacity-40 text-xs">›</span> Send to Post-Exploit
          </ActionButton>
          <ActionButton>
            <span className="opacity-40 text-xs">›</span> Add to Report
          </ActionButton>
        </div>
      </div>
    </div>
  )
}
