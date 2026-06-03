import { cn } from '../../../../../../shared/lib/utils'
import { mockSubdomains } from '../../../PhantomLayout/mockData'

export function SubdomainGrid() {
  return (
    <div className="grid grid-cols-4 gap-2">
      {mockSubdomains.map((s) => (
        <div
          key={s.sub}
          className={cn(
            'bg-[#161b26] border rounded p-2',
            s.risk === 'high' ? 'border-red-500/20' : 'border-[#1e2535]',
          )}
        >
          <div className="text-[9px] text-[#3d4a61]">
            {s.status === 200 ? '200 OK' : s.status === 301 ? '301 Redirect' : s.status === 403 ? '403 Forbidden' : '404 Not Found'}
          </div>
          <div className={cn(
            'text-[11px] font-mono truncate mt-0.5',
            s.risk === 'high'   ? 'text-red-400'
            : s.status === 404  ? 'text-[#6b7a96]'
            : 'text-[#c5cfe0]',
          )}>
            {s.sub.split('.')[0]}.…
          </div>
        </div>
      ))}
    </div>
  )
}
