import { cn } from '../../../../shared/lib/utils'

const FILL_COLORS: Record<string, string> = {
  green:  'bg-green-400',
  cyan:   'bg-cyan-400',
  amber:  'bg-amber-400',
  red:    'bg-red-400',
  purple: 'bg-purple-400',
  gray:   'bg-[#3d4a61]',
}

interface ProgressBarProps {
  pct: number
  color?: string
  className?: string
}

export function ProgressBar({ pct, color = 'cyan', className }: ProgressBarProps) {
  return (
    <div className={cn('h-[3px] w-full rounded-full bg-[#252e42] overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-full transition-all', FILL_COLORS[color] ?? 'bg-[#3d4a61]')}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  )
}
