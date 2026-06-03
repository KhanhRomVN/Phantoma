import { useState } from 'react'
import { cn } from '../../../../../shared/lib/utils'
import { Badge, ToolbarButton, KVRow, ActionButton } from '../../../../../core/components/ui'
import { SeverityPill } from '../../../../../core/components/ui/SeverityPill'
import { MockVuln, SeverityLevel } from '../../../types/types'
import { CVSS_COLOR, CVSS_STROKE } from '../../../constants/severity'
import { mockVulns } from '../../../data/mockData'

// ─── CvssRing ────────────────────────────────────────────────────────────────

const CIRCUMFERENCE = 163.4

function CvssRing({ score, severity }: { score: number; severity: SeverityLevel }) {
  const offset = CIRCUMFERENCE - (score / 10) * CIRCUMFERENCE
  return (
    <div className="flex flex-col items-center mb-4">
      <div className="relative w-16 h-16 flex items-center justify-center mb-1">
        <svg className="absolute inset-0" width="64" height="64" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="26" fill="none" stroke="#252e42" strokeWidth="5" />
          <circle cx="32" cy="32" r="26" fill="none"
            stroke={CVSS_STROKE(score)} strokeWidth="5"
            strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset}
            strokeLinecap="round" transform="rotate(-90 32 32)"
          />
        </svg>
        <span className={cn('text-xl font-bold', CVSS_COLOR(score))}>{score}</span>
      </div>
      <div className="text-[9.5px] text-[#6b7a96]">CVSS 3.1 — {severity}</div>
    </div>
  )
}

// ─── VulnCard ────────────────────────────────────────────────────────────────

function VulnCard({ vuln, selected, onClick }: { vuln: MockVuln; selected?: boolean; onClick?: () => void }) {
  const barColor = vuln.cvss >= 9 ? 'bg-purple-400' : vuln.cvss >= 7 ? 'bg-red-400' : 'bg-amber-400'
  return (
    <div onClick={onClick}
      className={cn('bg-[#111520] border rounded-md p-2.5 mb-2 cursor-pointer transition-all',
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

// ─── VulnDetails ─────────────────────────────────────────────────────────────

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[9.5px] font-bold text-[#3d4a61] uppercase tracking-[0.09em] pb-[5px] border-b border-[#1e2535] mb-[6px]">{children}</div>
)

function VulnDetails({ vuln }: { vuln: MockVuln }) {
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

// ─── Vulns (main export) ─────────────────────────────────────────────────────

const Toolbar = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-[5px] px-[10px] h-[38px] bg-[#0f1319] border-b border-[#1e2535] shrink-0 overflow-x-auto [&::-webkit-scrollbar]:h-0">{children}</div>
)
const TbLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[9.5px] text-[#3d4a61] uppercase tracking-[0.07em] mx-0.5 whitespace-nowrap">{children}</span>
)

export function ViewVulns() {
  const [selectedId, setSelectedId] = useState(mockVulns[0].id)
  const selectedVuln = mockVulns.find((v) => v.id === selectedId) ?? mockVulns[0]
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Toolbar>
        <ToolbarButton variant="cyan">Auto-Exploit</ToolbarButton>
        <ToolbarButton>Generate Report</ToolbarButton>
        <ToolbarButton className="ml-auto">Export CSV</ToolbarButton>
      </Toolbar>
      <div className="flex items-center gap-1 px-[10px] py-[6px] bg-[#0f1319] border-b border-[#1e2535] shrink-0">
        <TbLabel>Filter:</TbLabel>
        <button className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-purple-500/40 bg-purple-500/15 text-purple-400">CRITICAL (3)</button>
        <button className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-red-500/40 bg-red-500/12 text-red-400">HIGH (7)</button>
        <button className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-500/40 bg-amber-500/12 text-amber-400">MEDIUM (12)</button>
        <button className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-cyan-500/40 bg-cyan-500/10 text-cyan-400">LOW (5)</button>
      </div>
      <div className="flex flex-1 overflow-hidden gap-px bg-[#1e2535]">
        <div className="flex flex-col bg-[#141924] overflow-hidden" style={{ width: '65%' }}>
          <div className="flex items-center gap-2 px-3 h-8 border-b border-[#1e2535] bg-[#0f1319] shrink-0">
            <span className="text-[10.5px] font-bold text-[#6b7a96] uppercase tracking-[0.08em] flex-1">Vulnerabilities</span>
            <Badge color="red">27 total</Badge>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {mockVulns.map((v) => (
              <VulnCard key={v.id} vuln={v} selected={v.id === selectedId} onClick={() => setSelectedId(v.id)} />
            ))}
          </div>
        </div>
        <VulnDetails vuln={selectedVuln} />
      </div>
    </div>
  )
}
