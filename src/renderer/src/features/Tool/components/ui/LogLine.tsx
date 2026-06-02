import { cn } from '../../../../shared/lib/utils'

const TAG_COLOR: Record<string, string> = {
  green:  'text-green-400',
  red:    'text-red-400',
  amber:  'text-amber-400',
  cyan:   'text-cyan-400',
  purple: 'text-purple-400',
  gray:   'text-zinc-500',
}

interface LogLineProps {
  ts: string
  tag: string
  tagColor: string
  msg: string
}

export function LogLine({ ts, tag, tagColor, msg }: LogLineProps) {
  return (
    <div className="flex gap-2 text-[10.5px] leading-6 font-mono">
      <span className="text-zinc-600 shrink-0 w-14">{ts}</span>
      <span className={cn('shrink-0 w-12 text-right font-bold', TAG_COLOR[tagColor] ?? 'text-zinc-400')}>{tag}</span>
      <span className="text-zinc-300 break-all">{msg}</span>
    </div>
  )
}
