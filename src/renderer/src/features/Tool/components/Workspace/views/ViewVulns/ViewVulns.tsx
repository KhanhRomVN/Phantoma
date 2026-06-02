import { useState } from 'react'
import { Badge } from '../../../ui/Badge'
import { ToolbarButton } from '../../../ui/ToolbarButton'
import { VulnCard } from './VulnCard'
import { VulnDetails } from './VulnDetails'
import { mockVulns } from '../../../PhantomLayout/mockData'

export function ViewVulns() {
  const [selectedId, setSelectedId] = useState(mockVulns[0].id)
  const selectedVuln = mockVulns.find((v) => v.id === selectedId) ?? mockVulns[0]

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 h-10 border-b border-zinc-800 bg-zinc-950 shrink-0">
        <span className="text-[9.5px] font-bold text-zinc-600 uppercase tracking-wider">Filter:</span>
        <ToolbarButton variant="red">CRITICAL (3)</ToolbarButton>
        <button className="h-6 px-2 rounded border border-zinc-700 bg-zinc-900 text-red-400 text-[10px] font-semibold">HIGH (7)</button>
        <button className="h-6 px-2 rounded border border-zinc-700 bg-zinc-900 text-amber-400 text-[10px] font-semibold">MEDIUM (12)</button>
        <button className="h-6 px-2 rounded border border-zinc-700 bg-zinc-900 text-zinc-400 text-[10px] font-semibold">LOW (5)</button>
        <div className="w-px h-4 bg-zinc-800 mx-1" />
        <ToolbarButton variant="cyan">Auto-Exploit</ToolbarButton>
        <ToolbarButton>Generate Report</ToolbarButton>
        <ToolbarButton className="ml-auto">Export CSV</ToolbarButton>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden gap-px bg-zinc-800">
        {/* Vuln list */}
        <div className="flex flex-col bg-zinc-900 overflow-hidden" style={{ width: '65%' }}>
          <div className="flex items-center gap-2 px-3 h-8 border-b border-zinc-800 bg-zinc-950 shrink-0">
            <span className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wider flex-1">Vulnerabilities</span>
            <Badge color="red">27 total</Badge>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {mockVulns.map((v) => (
              <VulnCard
                key={v.id}
                vuln={v}
                selected={v.id === selectedId}
                onClick={() => setSelectedId(v.id)}
              />
            ))}
          </div>
        </div>

        {/* Details */}
        <VulnDetails vuln={selectedVuln} />
      </div>
    </div>
  )
}
