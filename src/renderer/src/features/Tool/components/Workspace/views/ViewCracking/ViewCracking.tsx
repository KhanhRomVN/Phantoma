import { KVRow } from '../../../ui/KVRow'
import { ToolbarButton } from '../../../ui/ToolbarButton'
import { ProgressBar } from '../../../ui/ProgressBar'
import { LogLine } from '../../../ui/LogLine'
import { Badge } from '../../../ui/Badge'

const HASHES = [
  { hash: '$2y$10$abc123def456ghi789jklmno', type: 'bcrypt $2y$ (cost 10)', mode: 'hashcat -m 3200', status: 'Cracking... (slow)', statusColor: 'text-amber-400', cracked: null },
  { hash: 'aad3b435b51404eeaad3b435b51404ee', type: 'NTLM (empty hash!)', mode: '', status: '✓ CRACKED', statusColor: 'text-green-400', cracked: '""  (empty password)' },
  { hash: 'd7b5e5f4e2a1c3b9a7d6e8f1c0b2a4d3', type: 'NTLM', mode: '', status: '✓ CRACKED (wordlist)', statusColor: 'text-green-400', cracked: 'P@ssw0rd!' },
  { hash: '5f4dbc1dbc93a2d8d4b7c8e9f1a2b3c4', type: 'NTLM', mode: '', status: '✓ CRACKED', statusColor: 'text-green-400', cracked: 'admin123' },
]

const LOGS = [
  { ts: '10:00:01', tag: 'HC',   tagColor: 'cyan',  msg: 'hashcat v6.2.6 starting...' },
  { ts: '10:00:02', tag: 'GPU',  tagColor: 'cyan',  msg: 'Device #1: RTX 3090, 24268/24268 MB' },
  { ts: '10:00:03', tag: 'INFO', tagColor: 'cyan',  msg: 'Hash-mode 1000 (NTLM) — Attack: Wordlist + Rules' },
  { ts: '10:00:05', tag: 'CRACK',tagColor: 'green', msg: 'aad3b435...: ""  (empty)' },
  { ts: '10:00:12', tag: 'CRACK',tagColor: 'green', msg: 'd7b5e5f4...: P@ssw0rd!' },
  { ts: '10:00:18', tag: 'CRACK',tagColor: 'green', msg: '5f4dbc1d...: admin123' },
  { ts: '10:00:20', tag: 'SPEED',tagColor: 'gray',  msg: 'Speed: 14823.3 MH/s — ETA 00:04:12' },
  { ts: '10:01:00', tag: 'INFO', tagColor: 'amber', msg: 'bcrypt hashes: 145 H/s (GPU limited by cost)' },
]

export function ViewCracking() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center gap-2 px-3 h-10 border-b border-zinc-800 bg-zinc-950 shrink-0 overflow-x-auto">
        <ToolbarButton variant="red">▶ Attack</ToolbarButton>
        <ToolbarButton>Identify Hash</ToolbarButton>
        <ToolbarButton variant="amber">GPU Status</ToolbarButton>
        <ToolbarButton>Rainbow Table</ToolbarButton>
        <ToolbarButton>Online Lookup</ToolbarButton>
        <div className="w-px h-4 bg-zinc-800" />
        <span className="text-[9.5px] font-bold text-zinc-600 uppercase tracking-wider">Mode:</span>
        <ToolbarButton variant="cyan">Wordlist</ToolbarButton>
        <ToolbarButton>Rules</ToolbarButton>
        <ToolbarButton>Bruteforce</ToolbarButton>
        <ToolbarButton>Combo</ToolbarButton>
        <ToolbarButton className="ml-auto">Export</ToolbarButton>
      </div>
      <div className="flex flex-1 overflow-hidden gap-px bg-zinc-800">
        {/* Hash Input */}
        <div className="flex flex-col bg-zinc-900 overflow-hidden" style={{ width: '50%' }}>
          <div className="flex items-center gap-2 px-3 h-8 border-b border-zinc-800 bg-zinc-950 shrink-0">
            <span className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wider flex-1">Hash Input</span>
            <Badge color="green">3 cracked / 14</Badge>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {HASHES.map((h, i) => (
              <div key={i} className="bg-zinc-950 border border-zinc-800 rounded p-2.5">
                <KVRow label="Hash"   value={h.hash.slice(0, 28) + '…'} />
                <KVRow label="Type"   value={h.type} valueColor="text-cyan-400" />
                {h.mode && <KVRow label="Mode" value={h.mode} />}
                {h.cracked && <KVRow label="Result" value={h.cracked} valueColor="text-green-400" />}
                <KVRow label="Status" value={h.status} valueColor={h.statusColor} />
              </div>
            ))}
          </div>
        </div>
        {/* Hashcat Output */}
        <div className="flex flex-col bg-zinc-900 overflow-hidden" style={{ width: '50%' }}>
          <div className="flex items-center px-3 h-8 border-b border-zinc-800 bg-zinc-950 shrink-0">
            <span className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wider">Hashcat Output</span>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
            {LOGS.map((l, i) => <LogLine key={i} {...l} />)}
          </div>
          <div className="px-3 py-2 border-t border-zinc-800 shrink-0">
            <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
              <span>Wordlist attack (rockyou.txt)</span>
              <span className="text-cyan-400">3 / 14 cracked</span>
            </div>
            <ProgressBar pct={21} color="cyan" />
          </div>
        </div>
      </div>
    </div>
  )
}
