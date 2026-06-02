import { cn } from '../../../../shared/lib/utils'

const FILL_COLORS: Record<string, string> = {
  green:  'bg-green-400',
  cyan:   'bg-cyan-400',
  amber:  'bg-amber-400',
  red:    'bg-red-400',
  purple: 'bg-purple-400',
  gray:   'bg-zinc-600',
}

interface ProgressBarProps {
  pct: number
  color?: string
  className?: string
}

export function ProgressBar({ pct, color = 'cyan', className }: ProgressBarProps) {
  return (
    <div className={cn('h-0.5 w-full rounded-full bg-zinc-800 overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-full transition-all', FILL_COLORS[color] ?? 'bg-zinc-600')}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  )
}
