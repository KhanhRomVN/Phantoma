import { cn } from '../../../../../../shared/lib/utils'
import { ToolbarButton } from '../../../ui/ToolbarButton'
import { ProgressBar } from '../../../ui/ProgressBar'

const PACKETS = [
  { no:'1', time:'0.000', src:'192.168.1.20',  dst:'10.10.14.5',    proto:'TCP',  protoColor:'text-green-400',  len:'74',   info:'44444→8080 [SYN]',               alert:false },
  { no:'3', time:'0.002', src:'192.168.1.20',  dst:'10.10.14.5',    proto:'HTTP', protoColor:'text-purple-400', len:'312',  info:'POST /beacon HTTP/1.1 (C2!)',    alert:true  },
  { no:'4', time:'0.010', src:'192.168.1.10',  dst:'8.8.8.8',       proto:'DNS',  protoColor:'text-amber-400',  len:'62',   info:'Query A c2.evil.com',            alert:false },
  { no:'6', time:'0.050', src:'192.168.1.5',   dst:'192.168.1.1',   proto:'ARP',  protoColor:'text-pink-400',   len:'42',   info:'Who has 192.168.1.1?',           alert:false },
  { no:'9', time:'1.000', src:'192.168.1.20',  dst:'45.33.32.156',  proto:'HTTP', protoColor:'text-purple-400', len:'2048', info:'POST /gate.php — Encrypted payload', alert:true },
]
const PROTOCOLS = [
  { label:'TCP',  pct:62, color:'green'  },
  { label:'DNS',  pct:18, color:'amber'  },
  { label:'HTTP', pct:12, color:'purple' },
  { label:'ARP',  pct:5,  color:'red'    },
  { label:'UDP',  pct:3,  color:'cyan'   },
]
const TbSep = () => <div className="w-px h-[18px] bg-[#1e2535] shrink-0" />

export function ViewSniffer() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center gap-[5px] px-[10px] h-[38px] bg-[#0f1319] border-b border-[#1e2535] shrink-0 overflow-x-auto [&::-webkit-scrollbar]:h-0">
        <span className="text-[9.5px] text-[#3d4a61] uppercase tracking-[0.07em] whitespace-nowrap">Interface:</span>
        <select className="h-6 bg-[#111520] border border-[#252e42] rounded text-green-400 text-[11px] px-2 outline-none font-mono shrink-0">
          <option>eth0 (192.168.1.5)</option>
          <option>tun0 (10.10.14.5)</option>
        </select>
        <TbSep />
        <ToolbarButton variant="green">▶ Start</ToolbarButton>
        <ToolbarButton variant="red">■ Stop</ToolbarButton>
        <ToolbarButton>ARP Spoof</ToolbarButton>
        <ToolbarButton>MITM</ToolbarButton>
        <TbSep />
        <span className="text-[9.5px] text-[#3d4a61] uppercase tracking-[0.07em] whitespace-nowrap">Filter:</span>
        <input readOnly value="tcp port 80 or port 443"
          className="h-6 w-44 bg-[#111520] border border-[#252e42] rounded text-[#c5cfe0] text-[11px] px-2 outline-none font-mono" />
        <ToolbarButton className="ml-auto">Save PCAP</ToolbarButton>
      </div>
      <div className="flex flex-1 overflow-hidden gap-px bg-[#1e2535]">
        {/* Packets */}
        <div className="flex flex-col bg-[#141924] overflow-hidden" style={{width:'65%'}}>
          <div className="flex items-center gap-2 px-3 h-8 border-b border-[#1e2535] bg-[#0f1319] shrink-0">
            <span className="text-[10.5px] font-bold text-[#6b7a96] uppercase tracking-[0.08em] flex-1">Packet Capture</span>
            <div className="flex items-center gap-1 text-[10px] text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> 1,842 packets
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <div className="flex text-[9.5px] text-[#3d4a61] px-2 py-1.5 border-b border-[#1e2535] sticky top-0 bg-[#0f1319]">
              <span className="w-10 shrink-0">No.</span><span className="w-16 shrink-0">Time</span>
              <span className="w-28 shrink-0">Source</span><span className="w-28 shrink-0">Dest</span>
              <span className="w-14 shrink-0 text-center">Proto</span><span className="w-10 shrink-0 text-right">Len</span>
              <span className="flex-1 pl-2">Info</span>
            </div>
            {PACKETS.map((p) => (
              <div key={p.no} className={cn('flex items-center text-[10.5px] py-1 px-2 border-b border-[#1e2535]/40 hover:bg-white/[0.02] cursor-pointer', p.alert && 'bg-red-500/4')}>
                <span className="w-10 shrink-0 text-[#3d4a61] font-mono">{p.no}</span>
                <span className="w-16 shrink-0 text-[#6b7a96] font-mono">{p.time}</span>
                <span className="w-28 shrink-0 text-cyan-400 font-mono text-[9.5px] truncate">{p.src}</span>
                <span className="w-28 shrink-0 text-[#c5cfe0] font-mono text-[9.5px] truncate">{p.dst}</span>
                <span className={cn('w-14 shrink-0 text-center font-bold text-[10px]', p.protoColor)}>{p.proto}</span>
                <span className="w-10 shrink-0 text-right text-[#6b7a96]">{p.len}</span>
                <span className={cn('flex-1 pl-2 truncate', p.alert ? 'text-red-400' : 'text-[#6b7a96]')}>{p.info}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Stats */}
        <div className="flex flex-col bg-[#141924] overflow-hidden" style={{width:'35%'}}>
          <div className="flex items-center px-3 h-8 border-b border-[#1e2535] bg-[#0f1319] shrink-0">
            <span className="text-[10.5px] font-bold text-[#6b7a96] uppercase tracking-[0.08em]">Protocol Stats</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            <div>
              <div className="text-[9.5px] font-bold text-[#3d4a61] uppercase tracking-[0.09em] pb-[5px] border-b border-[#1e2535] mb-2">Distribution</div>
              {PROTOCOLS.map((pr) => (
                <div key={pr.label} className="mb-2">
                  <div className="flex justify-between text-[10px] text-[#6b7a96] mb-1">
                    <span className={`text-${pr.color}-400`}>{pr.label}</span><span>{pr.pct}%</span>
                  </div>
                  <ProgressBar pct={pr.pct} color={pr.color as any} />
                </div>
              ))}
            </div>
            <div>
              <div className="text-[9.5px] font-bold text-[#3d4a61] uppercase tracking-[0.09em] pb-[5px] border-b border-[#1e2535] mb-2">Alerts</div>
              <div className="bg-red-500/8 border border-red-500/30 rounded p-2 mb-2">
                <div className="text-[10.5px] font-semibold text-red-400">🔴 C2 Beacon Detected</div>
                <div className="text-[10px] text-[#6b7a96]">192.168.1.20 → 45.33.32.156:80 (periodic)</div>
              </div>
              <div className="bg-amber-500/6 border border-amber-500/25 rounded p-2">
                <div className="text-[10.5px] font-semibold text-amber-400">🟡 NTLM Hash Captured</div>
                <div className="text-[10px] text-[#6b7a96]">Responder caught NTLMv2 from 192.168.1.20</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
