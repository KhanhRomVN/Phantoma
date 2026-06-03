import { useState } from 'react'
import { cn } from '../../../../../shared/lib/utils'
import { Badge, ToolbarButton, LogLine, ProgressBar, PulseIndicator } from '../../../../../core/components/ui'
import { MockHost, PortStatus } from '../../../types/types'
import { mockHosts, mockScanLogs } from '../../../data/mockData'

// ─── PortTag ─────────────────────────────────────────────────────────────────

const PORT_CLASS: Record<PortStatus, string> = {
  open:     'bg-green-500/10 text-green-400 border border-green-500/20',
  filtered: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  vuln:     'bg-red-500/15 text-red-400 border border-red-500/30 animate-pulse',
}

function PortTag({ port, status }: { port: string; status: PortStatus }) {
  return (
    <span className={cn('px-1.5 py-0 text-[10px] font-bold rounded', PORT_CLASS[status])}>
      {port}
    </span>
  )
}

// ─── HostCard ────────────────────────────────────────────────────────────────

function HostCard({ host, selected, onClick }: { host: MockHost; selected?: boolean; onClick?: () => void }) {
  return (
    <div onClick={onClick}
      className={cn('bg-[#111520] border rounded-md p-2.5 cursor-pointer transition-all',
        selected ? 'border-cyan-500/25 bg-cyan-500/4' : 'border-[#1e2535] hover:border-[#252e42] hover:bg-[#161b26]',
      )}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[12.5px] font-bold text-cyan-400 font-mono">{host.ip}</span>
        <span className="text-[10.5px] text-[#6b7a96]">{host.hostname}</span>
        <span className="ml-auto text-[10px] px-1.5 py-0 rounded bg-purple-500/12 text-purple-400 border border-purple-500/20">{host.os}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {host.ports.map((p) => <PortTag key={p.number} port={p.number} status={p.status} />)}
      </div>
    </div>
  )
}

// ─── ScanLogPanel ────────────────────────────────────────────────────────────

function ScanLogPanel() {
  return (
    <div className="flex flex-col bg-[#141924] overflow-hidden w-1/2">
      <div className="flex items-center gap-2 px-3 h-8 border-b border-[#1e2535] bg-[#0f1319] shrink-0">
        <span className="text-[10.5px] font-bold text-[#6b7a96] uppercase tracking-[0.08em] flex-1">Scan Output</span>
        <div className="flex items-center gap-1 text-[10px] text-green-400">
          <PulseIndicator /> Running 42%
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {mockScanLogs.map((l, i) => <LogLine key={i} ts={l.ts} tag={l.tag} tagColor={l.tagColor} msg={l.msg} />)}
      </div>
      <div className="px-3 py-2 border-t border-[#1e2535] shrink-0">
        <div className="flex justify-between text-[10px] text-[#6b7a96] mb-1">
          <span>Scanning 192.168.1.0/24</span>
          <span>42% — ETA 1m 12s</span>
        </div>
        <ProgressBar pct={42} color="cyan" />
      </div>
    </div>
  )
}

// ─── Toolbar helpers ─────────────────────────────────────────────────────────

const Toolbar = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-[5px] px-[10px] h-[38px] bg-[#0f1319] border-b border-[#1e2535] shrink-0 overflow-x-auto [&::-webkit-scrollbar]:h-0">{children}</div>
)
const TbSep = () => <div className="w-px h-[18px] bg-[#1e2535] shrink-0" />
const TbLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[9.5px] text-[#3d4a61] uppercase tracking-[0.07em] mx-0.5 whitespace-nowrap">{children}</span>
)

// ─── Scanner (main export) ───────────────────────────────────────────────────

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
