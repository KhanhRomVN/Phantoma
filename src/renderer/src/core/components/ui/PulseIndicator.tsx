type PulseColor = 'green' | 'cyan' | 'amber' | 'red'

const COLOR_CLASS: Record<PulseColor, string> = {
  green: 'bg-green-400',
  cyan:  'bg-cyan-400',
  amber: 'bg-amber-400',
  red:   'bg-red-400',
}

export function PulseIndicator({ color = 'green' }: { color?: PulseColor }) {
  return (
    <span className={`inline-block w-1.5 h-1.5 rounded-full animate-pulse shrink-0 ${COLOR_CLASS[color]}`} />
  )
}
