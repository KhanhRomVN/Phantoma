import { cn } from '../../../../../../shared/lib/utils'
import { mockSubdomains } from '../../../PhantomLayout/mockData'

export function SubdomainGrid() {
  return (
    <div className="grid grid-cols-4 gap-2">
      {mockSubdomains.map((s) => (
        <div
          key={s.sub}
          className={cn(
            'bg-zinc-950 border rounded p-2',
            s.risk === 'high' ? 'border-red-500/20' : 'border-zinc-800',
          )}
        >
          <div className="text-[9.5px] text-zinc-600">Status</div>
          <div className={cn(
            'text-[10.5px] font-mono',
            s.status === 200 ? 'text-green-400'
            : s.status >= 300 && s.status < 400 ? 'text-amber-400'
            : 'text-zinc-500',
          )}>
            {s.status}
          </div>
          <div className={cn(
            'text-[11px] truncate',
            s.risk === 'high' ? 'text-red-400' : 'text-zinc-300',
          )}>
            {s.sub.split('.')[0]}.…
          </div>
        </div>
      ))}
    </div>
  )
}
