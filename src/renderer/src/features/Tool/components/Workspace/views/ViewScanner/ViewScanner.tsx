import { useState } from 'react'
import { Badge } from '../../../ui/Badge'
import { ToolbarButton } from '../../../ui/ToolbarButton'
import { HostCard } from './HostCard'
import { ScanLogPanel } from './ScanLogPanel'
import { mockHosts } from '../../../PhantomLayout/mockData'

export function ViewScanner() {
  const [selectedIp, setSelectedIp] = useState(mockHosts[0].ip)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 h-10 border-b border-zinc-800 bg-zinc-950 shrink-0">
        <span className="text-[9.5px] font-bold text-zinc-600 uppercase tracking-wider">Scope:</span>
        <input
          readOnly
          value="192.168.1.0/24"
          className="h-6 w-36 bg-zinc-900 border border-zinc-700 rounded text-amber-400 text-[11px] px-2 outline-none font-mono"
        />
        <div className="w-px h-4 bg-zinc-800" />
        <ToolbarButton variant="cyan">▶ Full Scan</ToolbarButton>
        <ToolbarButton variant="green">▶ Quick SYN</ToolbarButton>
        <ToolbarButton>UDP Scan</ToolbarButton>
        <ToolbarButton>OS Detect</ToolbarButton>
        <ToolbarButton variant="red" className="ml-auto">■ Stop</ToolbarButton>
      </div>

      {/* Content panels */}
      <div className="flex flex-1 overflow-hidden gap-px bg-zinc-800">
        {/* Hosts list */}
        <div className="flex flex-col bg-zinc-900 overflow-hidden" style={{ width: '50%' }}>
          <div className="flex items-center gap-2 px-3 h-8 border-b border-zinc-800 bg-zinc-950 shrink-0">
            <span className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wider flex-1">Discovered Hosts</span>
            <Badge color="green">12 up</Badge>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-1.5">
            {mockHosts.map((h) => (
              <HostCard
                key={h.ip}
                host={h}
                selected={h.ip === selectedIp}
                onClick={() => setSelectedIp(h.ip)}
              />
            ))}
          </div>
        </div>

        {/* Scan log */}
        <ScanLogPanel />
      </div>
    </div>
  )
}
