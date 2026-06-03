import { cn } from '../../../../../shared/lib/utils'
import { Badge, KVRow, ProgressBar, ToolbarButton } from '../../../../../core/components/ui'
import { mockIntruderResults } from '../../../data/mockData'

// ─── RequestTemplate ─────────────────────────────────────────────────────────

function RequestTemplate() {
  return (
    <div className="flex flex-col bg-[#141924] overflow-hidden" style={{ width: '45%' }}>
      <div className="flex items-center px-3 h-8 border-b border-[#1e2535] bg-[#0f1319] shrink-0">
        <span className="text-[10.5px] font-bold text-[#6b7a96] uppercase tracking-[0.08em]">Request Template</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="bg-[#080a0e] border border-[#1e2535] rounded p-2.5 font-mono text-[10.5px] leading-7">
          <span className="text-cyan-400">POST</span>{' '}
          <span className="text-[#c5cfe0]">/api/v1/login</span>{' '}
          <span className="text-[#6b7a96]">HTTP/1.1</span><br/>
          <span className="text-[#6b7a96]">Host: </span><span className="text-[#c5cfe0]">target.corp.local</span><br/>
          <span className="text-[#6b7a96]">Content-Type: </span><span className="text-[#c5cfe0]">application/json</span><br/>
          <span className="text-[#6b7a96]">Authorization: </span><span className="text-amber-400">Bearer eyJhbGci…</span><br/>
          <br/>
          <span className="text-[#6b7a96]">{'{'}</span><br/>
          {'  '}<span className="text-cyan-400">"username"</span>:{' '}
          <span className="bg-red-500/12 border border-dashed border-red-500/30 text-red-400 px-1 rounded">§admin§</span>,<br/>
          {'  '}<span className="text-cyan-400">"password"</span>:{' '}
          <span className="bg-red-500/12 border border-dashed border-red-500/30 text-red-400 px-1 rounded">§password§</span><br/>
          <span className="text-[#6b7a96]">{'}'}</span>
        </div>
        <div>
          <div className="text-[9.5px] font-bold text-[#3d4a61] uppercase tracking-[0.09em] pb-[5px] border-b border-[#1e2535] mb-2">Payload Sets</div>
          <KVRow label="Position 1 (username)" value="usernames.txt (847 entries)" valueColor="text-cyan-400" />
          <KVRow label="Position 2 (password)" value="top-500-passwords.txt"       valueColor="text-cyan-400" />
          <KVRow label="Combinations"          value="423,500" />
          <KVRow label="Throttle"              value="50 req/s (adaptive)"         valueColor="text-green-400" />
        </div>
      </div>
    </div>
  )
}

// ─── AttackResultsTable ──────────────────────────────────────────────────────

const statusColor = (code: number) => {
  if (code === 200) return 'text-green-400'
  if (code === 301 || code === 302) return 'text-amber-400'
  if (code >= 400 && code < 500) return 'text-red-400'
  if (code >= 500) return 'text-purple-400'
  return 'text-[#6b7a96]'
}

function AttackResultsTable() {
  return (
    <div className="flex flex-col bg-[#141924] overflow-hidden" style={{ width: '55%' }}>
      <div className="flex items-center gap-2 px-3 h-8 border-b border-[#1e2535] bg-[#0f1319] shrink-0">
        <span className="text-[10.5px] font-bold text-[#6b7a96] uppercase tracking-[0.08em] flex-1">Attack Results</span>
        <Badge color="green">2 hits</Badge>
        <span className="text-[10px] text-[#6b7a96] ml-2">1,240 / 423,500</span>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-[10.5px] border-collapse">
          <thead>
            <tr className="border-b border-[#1e2535] bg-[#0f1319]">
              {['#', 'Username', 'Password', 'Status', 'Length', 'Time'].map((h) => (
                <th key={h} className="text-left text-[9.5px] font-bold text-[#3d4a61] uppercase tracking-[0.07em] px-2 py-1.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mockIntruderResults.map((r) => (
              <tr key={r.num} className={cn('border-b border-[#1e2535]/50 hover:bg-white/[0.02]', r.hit && 'bg-cyan-500/4')}>
                <td className={cn('px-2 py-1 font-mono', r.hit ? 'text-cyan-400' : 'text-[#c5cfe0]')}>{r.num}</td>
                <td className={cn('px-2 py-1', r.hit ? 'text-green-400' : 'text-[#c5cfe0]')}>{r.username}</td>
                <td className={cn('px-2 py-1', r.hit ? 'text-green-400' : 'text-[#c5cfe0]')}>{r.password}</td>
                <td className={cn('px-2 py-1 font-bold', statusColor(r.status))}>{r.status}</td>
                <td className="px-2 py-1 text-[#6b7a96]">{r.length}</td>
                <td className="px-2 py-1 text-[#6b7a96]">{r.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-2 border-t border-[#1e2535] shrink-0">
        <div className="flex justify-between text-[10px] text-[#6b7a96] mb-1">
          <span className="text-green-400">▶ Running — Cluster Bomb</span>
          <span>1,240 sent · 0.3% complete</span>
        </div>
        <ProgressBar pct={0.3} color="green" />
      </div>
    </div>
  )
}

// ─── Intruder (main export) ──────────────────────────────────────────────────

const TbSep = () => <div className="w-px h-[18px] bg-[#1e2535] shrink-0" />

export function ViewIntruder() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center gap-[5px] px-[10px] h-[38px] bg-[#0f1319] border-b border-[#1e2535] shrink-0 overflow-x-auto [&::-webkit-scrollbar]:h-0">
        <span className="text-[9.5px] text-[#3d4a61] uppercase tracking-[0.07em] whitespace-nowrap">Mode:</span>
        <ToolbarButton variant="cyan">Sniper</ToolbarButton>
        <ToolbarButton>Battering Ram</ToolbarButton>
        <ToolbarButton>Pitchfork</ToolbarButton>
        <ToolbarButton>Cluster Bomb</ToolbarButton>
        <TbSep />
        <ToolbarButton variant="green">▶ Start Attack</ToolbarButton>
        <ToolbarButton variant="red" className="ml-auto">■ Stop</ToolbarButton>
      </div>
      <div className="flex flex-1 overflow-hidden gap-px bg-[#1e2535]">
        <RequestTemplate />
        <AttackResultsTable />
      </div>
    </div>
  )
}
