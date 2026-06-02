import { cn } from '../../../../../../shared/lib/utils'
import { ToolbarButton } from '../../../ui/ToolbarButton'
import { LogLine } from '../../../ui/LogLine'
import { Badge } from '../../../ui/Badge'

const INJECTIONS = [
  { type: 'SQLi',  typeColor: 'red',    param: 'username', tech: 'Union-based', db: 'MySQL 5.7', result: 'DB dump',      cvss: '8.1', hit: true },
  { type: 'SQLi',  typeColor: 'red',    param: 'id',       tech: 'Blind Time',  db: 'MySQL',     result: 'Boolean',      cvss: '7.5', hit: true },
  { type: 'XSS',   typeColor: 'red',    param: 'comment',  tech: 'Stored',      db: '—',         result: 'Alert(1)',     cvss: '7.5', hit: true },
  { type: 'SSTI',  typeColor: 'amber',  param: 'template', tech: '{{7*7}}',     db: '—',         result: '49 returned', cvss: '8.0', hit: true },
  { type: 'LFI',   typeColor: 'red',    param: 'file',     tech: 'Path traversal',db: '—',       result: '/etc/passwd',  cvss: '7.2', hit: true },
  { type: 'CMDi',  typeColor: 'red',    param: 'ping_host',tech: 'Blind ; whoami',db: '—',       result: 'www-data',    cvss: '9.0', hit: true },
  { type: 'XXE',   typeColor: 'cyan',   param: 'xml_body', tech: 'OOB via DTD', db: '—',         result: 'Testing...', cvss: '—',   hit: false },
  { type: 'NoSQLi',typeColor: 'cyan',   param: 'search',   tech: '$where inject',db: 'MongoDB',  result: 'Partial',     cvss: '6.5', hit: false },
] as const

const DUMP_LOGS = [
  { ts: '09:45:01', tag: 'SQLi', tagColor: 'cyan',   msg: 'Testing /api/v1/login?username=...' },
  { ts: '09:45:02', tag: 'CONF', tagColor: 'green',  msg: "Union-based SQLi confirmed: 1 UNION SELECT 1,2,3,4--" },
  { ts: '09:45:03', tag: 'DB',   tagColor: 'cyan',   msg: 'Database: corp_db | Tables: users, sessions, config' },
  { ts: '09:45:04', tag: 'DUMP', tagColor: 'red',    msg: 'admin | $2y$10$abc123... | admin@corp.local' },
  { ts: '09:45:04', tag: 'DUMP', tagColor: 'red',    msg: 'john.doe | $2y$10$xyz789... | john@corp.local' },
  { ts: '09:45:05', tag: 'LFI',  tagColor: 'green',  msg: 'Path traversal /etc/passwd → root:x:0:0:root:/root:/bin/bash' },
  { ts: '09:45:06', tag: 'CMDi', tagColor: 'red',    msg: 'ping_host=127.0.0.1;whoami → www-data' },
  { ts: '09:45:07', tag: 'XSS',  tagColor: 'amber',  msg: 'Stored XSS payload saved: <script>document.cookie</script>' },
]

const BADGE_COLOR: Record<string, string> = {
  red: 'bg-red-500/15 text-red-400 border border-red-500/25',
  amber: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
  cyan: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
}

export function ViewSqli() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center gap-2 px-3 h-10 border-b border-zinc-800 bg-zinc-950 shrink-0 overflow-x-auto">
        <ToolbarButton variant="cyan">▶ Scan All</ToolbarButton>
        <ToolbarButton>SQLMap</ToolbarButton>
        <ToolbarButton>XSStrike</ToolbarButton>
        <ToolbarButton>LFI Suite</ToolbarButton>
        <ToolbarButton>CMDi Tester</ToolbarButton>
        <ToolbarButton>SSTI Tester</ToolbarButton>
        <ToolbarButton>XXE</ToolbarButton>
        <ToolbarButton className="ml-auto">Export</ToolbarButton>
      </div>
      <div className="flex flex-1 overflow-hidden gap-px bg-zinc-800">
        {/* Injection Tests */}
        <div className="flex flex-col bg-zinc-900 overflow-hidden" style={{ width: '55%' }}>
          <div className="flex items-center gap-2 px-3 h-8 border-b border-zinc-800 bg-zinc-950 shrink-0">
            <span className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wider flex-1">Injection Tests</span>
            <Badge color="red">8 confirmed</Badge>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-[10.5px]">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950">
                  {['Type','Parameter','Technique','DB','Result','CVSS'].map(h => (
                    <th key={h} className="text-left text-[9.5px] font-bold text-zinc-600 uppercase tracking-wider px-2 py-1.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {INJECTIONS.map((r, i) => (
                  <tr key={i} className={cn('border-b border-zinc-800/50 hover:bg-zinc-800/30', r.hit && 'bg-green-500/3')}>
                    <td className="px-2 py-1.5">
                      <span className={cn('text-[9px] font-bold px-1 py-0 rounded', BADGE_COLOR[r.typeColor])}>{r.type}</span>
                    </td>
                    <td className="px-2 py-1 text-cyan-400 font-mono">{r.param}</td>
                    <td className="px-2 py-1 text-zinc-400">{r.tech}</td>
                    <td className="px-2 py-1 text-zinc-300">{r.db}</td>
                    <td className={cn('px-2 py-1 font-semibold', r.hit ? 'text-green-400' : 'text-amber-400')}>{r.result}</td>
                    <td className={cn('px-2 py-1 font-bold', parseFloat(r.cvss) >= 8 ? 'text-red-400' : parseFloat(r.cvss) >= 6 ? 'text-amber-400' : 'text-zinc-500')}>{r.cvss}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {/* Dump Output */}
        <div className="flex flex-col bg-zinc-900 overflow-hidden" style={{ width: '45%' }}>
          <div className="flex items-center px-3 h-8 border-b border-zinc-800 bg-zinc-950 shrink-0">
            <span className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wider">Dump Output</span>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
            {DUMP_LOGS.map((l, i) => <LogLine key={i} {...l} />)}
          </div>
          <div className="flex items-center gap-2 px-3 h-9 border-t border-zinc-800 bg-zinc-950 shrink-0">
            <span className="text-cyan-400 text-[11px] font-bold">sqlmap ›</span>
            <input className="flex-1 bg-transparent outline-none text-zinc-200 text-[11px] font-mono" placeholder="--dbs / --dump / --os-shell ..." />
          </div>
        </div>
      </div>
    </div>
  )
}
