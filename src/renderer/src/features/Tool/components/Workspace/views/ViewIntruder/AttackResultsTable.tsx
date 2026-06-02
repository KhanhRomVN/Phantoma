import { cn } from '../../../../../../shared/lib/utils'
import { Badge } from '../../../ui/Badge'
import { ProgressBar } from '../../../ui/ProgressBar'
import { mockIntruderResults } from '../../../PhantomLayout/mockData'

const statusColor = (code: number) => {
  if (code === 200) return 'text-green-400'
  if (code === 301 || code === 302) return 'text-amber-400'
  if (code >= 400 && code < 500) return 'text-red-400'
  if (code >= 500) return 'text-purple-400'
  return 'text-zinc-400'
}

export function AttackResultsTable() {
  return (
    <div className="flex flex-col bg-zinc-900 overflow-hidden" style={{ width: '55%' }}>
      <div className="flex items-center gap-2 px-3 h-8 border-b border-zinc-800 bg-zinc-950 shrink-0">
        <span className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wider flex-1">Attack Results</span>
        <Badge color="green">2 hits</Badge>
        <span className="text-[10px] text-zinc-500 ml-2">1,240 / 423,500</span>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-[10.5px] border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-950">
              {['#', 'Username', 'Password', 'Status', 'Length', 'Time'].map((h) => (
                <th key={h} className="text-left text-[9.5px] font-bold text-zinc-600 uppercase tracking-wider px-2 py-1.5">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mockIntruderResults.map((r) => (
              <tr key={r.num} className={cn(
                'border-b border-zinc-800/50 hover:bg-zinc-800/30',
                r.hit && 'bg-cyan-500/4',
              )}>
                <td className={cn('px-2 py-1 font-mono', r.hit && 'text-cyan-400')}>{r.num}</td>
                <td className={cn('px-2 py-1', r.hit ? 'text-green-400' : 'text-zinc-300')}>{r.username}</td>
                <td className={cn('px-2 py-1', r.hit ? 'text-green-400' : 'text-zinc-300')}>{r.password}</td>
                <td className={cn('px-2 py-1 font-bold', statusColor(r.status))}>{r.status}</td>
                <td className="px-2 py-1 text-zinc-400">{r.length}</td>
                <td className="px-2 py-1 text-zinc-400">{r.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-3 py-2 border-t border-zinc-800 shrink-0">
        <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
          <span className="text-green-400">▶ Running — Cluster Bomb</span>
          <span>1,240 sent · 0.3% complete</span>
        </div>
        <ProgressBar pct={0.3} color="green" />
      </div>
    </div>
  )
}
