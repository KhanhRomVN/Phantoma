import { cn } from '../../../../../../shared/lib/utils'
import { PortStatus } from '../../../../types/phantom'

const PORT_CLASS: Record<PortStatus, string> = {
  open:     'bg-green-500/10 text-green-400 border border-green-500/20',
  filtered: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  vuln:     'bg-red-500/15 text-red-400 border border-red-500/30 animate-pulse',
}

export function PortTag({ port, status }: { port: string; status: PortStatus }) {
  return (
    <span className={cn('px-1.5 py-0 text-[10px] font-bold rounded', PORT_CLASS[status])}>
      {port}
    </span>
  )
}
