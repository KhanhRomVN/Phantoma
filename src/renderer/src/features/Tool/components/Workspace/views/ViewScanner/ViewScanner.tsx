import { useState } from 'react'
import { Badge } from '../../../ui/Badge'
import { ToolbarButton } from '../../../ui/ToolbarButton'
import { HostCard } from './HostCard'
import { ScanLogPanel } from './ScanLogPanel'
import { mockHosts } from '../../../PhantomLayout/mockData'

const Toolbar = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-[5px] px-[10px] h-[38px] bg-[#0f1319] border-b border-[#1e2535] shrink-0 overflow-x-auto [&::-webkit-scrollbar]:h-0">
    {children}
  </div>
)
const TbSep = () => <div className="w-px h-[18px] bg-[#1e2535] shrink-0" />
const TbLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[9.5px] text-[#3d4a61] uppercase tracking-[0.07em] mx-0.5 whitespace-nowrap">{children}</span>
)

export function ViewScanner() {
  const [selectedIp, setSelectedIp] = useState(mockHosts[0].ip)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Toolbar>
        <TbLabel>Scope:</TbLabel>
        <input readOnly value="192.168.1.0/24"
          className="h-6 w-36 bg-[#111520] border border-[#252e42] rounded text-amber-400 text-[11px] px-2 outline-none font-mono" />
        <TbSep />
        <ToolbarButton variant="cyan">▶ Full Scan</ToolbarButton>
        <ToolbarButton variant="green">▶ Quick SYN</ToolbarButton>
        <ToolbarButton>UDP Scan</ToolbarButton>
        <ToolbarButton>OS Detect</ToolbarButton>
        <ToolbarButton>Svc Version</ToolbarButton>
        <ToolbarButton>Scripts</ToolbarButton>
        <ToolbarButton variant="red" className="ml-auto">■ Stop</ToolbarButton>
      </Toolbar>

      <div className="flex flex-1 overflow-hidden gap-px bg-[#1e2535]">
        <div className="flex flex-col bg-[#141924] overflow-hidden w-1/2">
          <div className="flex items-center gap-2 px-3 h-8 border-b border-[#1e2535] bg-[#0f1319] shrink-0">
            <span className="text-[10.5px] font-bold text-[#6b7a96] uppercase tracking-[0.08em] flex-1">Discovered Hosts</span>
            <Badge color="green">12 up</Badge>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-1.5">
            {mockHosts.map((h) => (
              <HostCard key={h.ip} host={h} selected={h.ip === selectedIp} onClick={() => setSelectedIp(h.ip)} />
            ))}
          </div>
        </div>
        <ScanLogPanel />
      </div>
    </div>
  )
}
