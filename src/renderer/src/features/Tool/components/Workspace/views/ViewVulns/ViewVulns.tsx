import { useState } from 'react'
import { Badge } from '../../../ui/Badge'
import { ToolbarButton } from '../../../ui/ToolbarButton'
import { VulnCard } from './VulnCard'
import { VulnDetails } from './VulnDetails'
import { mockVulns } from '../../../PhantomLayout/mockData'

const Toolbar = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-[5px] px-[10px] h-[38px] bg-[#0f1319] border-b border-[#1e2535] shrink-0 overflow-x-auto [&::-webkit-scrollbar]:h-0">
    {children}
  </div>
)
const TbSep = () => <div className="w-px h-[18px] bg-[#1e2535] shrink-0" />
const TbLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[9.5px] text-[#3d4a61] uppercase tracking-[0.07em] mx-0.5 whitespace-nowrap">{children}</span>
)

export function ViewVulns() {
  const [selectedId, setSelectedId] = useState(mockVulns[0].id)
  const selectedVuln = mockVulns.find((v) => v.id === selectedId) ?? mockVulns[0]

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Toolbar — action buttons */}
      <Toolbar>
        <ToolbarButton variant="cyan">Auto-Exploit</ToolbarButton>
        <ToolbarButton>Generate Report</ToolbarButton>
        <ToolbarButton className="ml-auto">Export CSV</ToolbarButton>
      </Toolbar>

      {/* Severity filter bar */}
      <div className="flex items-center gap-1 px-[10px] py-[6px] bg-[#0f1319] border-b border-[#1e2535] shrink-0">
        <TbLabel>Filter:</TbLabel>
        <button className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-purple-500/40 bg-purple-500/15 text-purple-400 transition-all">CRITICAL (3)</button>
        <button className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-red-500/40 bg-red-500/12 text-red-400 transition-all">HIGH (7)</button>
        <button className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-500/40 bg-amber-500/12 text-amber-400 transition-all">MEDIUM (12)</button>
        <button className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-cyan-500/40 bg-cyan-500/10 text-cyan-400 transition-all">LOW (5)</button>
      </div>

      <div className="flex flex-1 overflow-hidden gap-px bg-[#1e2535]">
        {/* Vuln list */}
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
