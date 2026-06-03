import { MockVuln } from '../../../../types/phantom'
import { KVRow } from '../../../ui/KVRow'
import { ActionButton } from '../../../ui/ActionButton'
import { CvssRing } from './CvssRing'

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[9.5px] font-bold text-[#3d4a61] uppercase tracking-[0.09em] pb-[5px] border-b border-[#1e2535] mb-[6px]">
    {children}
  </div>
)

export function VulnDetails({ vuln }: { vuln: MockVuln }) {
  return (
    <div className="flex flex-col bg-[#141924] overflow-hidden" style={{ width: '35%' }}>
      <div className="flex items-center px-3 h-8 border-b border-[#1e2535] bg-[#0f1319] shrink-0">
        <span className="text-[10.5px] font-bold text-[#6b7a96] uppercase tracking-[0.08em]">Details</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <CvssRing score={vuln.cvss} severity={vuln.severity} />
        <div className="mb-3">
          <SectionTitle>CVE Details</SectionTitle>
          <KVRow label="CVE ID"      value={vuln.cve}       valueColor="text-cyan-400" />
          <KVRow label="Target"      value={vuln.target} />
          <KVRow label="Component"   value={vuln.component} />
          <KVRow label="Published"   value="2024-01-15" />
          <KVRow label="In the wild" value="YES — Active"   valueColor="text-red-400" />
        </div>
        <div>
          <SectionTitle>Actions</SectionTitle>
          <ActionButton variant="red"><span className="opacity-40 text-xs">›</span> Launch Exploit Module</ActionButton>
          <ActionButton variant="cyan"><span className="opacity-40 text-xs">›</span> Open in Metasploit</ActionButton>
          <ActionButton variant="purple"><span className="opacity-40 text-xs">›</span> Send to Post-Exploit</ActionButton>
          <ActionButton><span className="opacity-40 text-xs">›</span> Add to Report</ActionButton>
        </div>
      </div>
    </div>
  )
}
