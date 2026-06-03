import { cn } from '../../../shared/lib/utils'
import { SeverityLevel } from '../../../features/Tool/types/types'
import { SEVERITY_CLASS } from '../../../features/Tool/constants/severity'

interface SeverityPillProps {
  level: SeverityLevel
  className?: string
}

export function SeverityPill({ level, className }: SeverityPillProps) {
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0 text-[9.5px] font-bold rounded', SEVERITY_CLASS[level], className)}>
      {level}
    </span>
  )
}
