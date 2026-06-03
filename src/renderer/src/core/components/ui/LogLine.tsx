import { cn } from '../../../shared/lib/utils'

const TAG_COLOR: Record<string, string> = {
  green:  'text-green-400',
  red:    'text-red-400',
  amber:  'text-amber-400',
  cyan:   'text-cyan-400',
  purple: 'text-purple-400',
  gray:   'text-[#6b7a96]',
}

interface LogLineProps {
  ts: string
  tag: string
  tagColor: string
  msg: string
}

export function LogLine({ ts, tag, tagColor, msg }: LogLineProps) {
  return (
    <div className="flex gap-2 text-[10.5px] leading-[1.7] font-mono">
      <span className="text-[#3d4a61] shrink-0 w-14">{ts}</span>
      <span className={cn('shrink-0 w-12 text-right font-bold', TAG_COLOR[tagColor] ?? 'text-[#6b7a96]')}>{tag}</span>
      <span className="text-[#c5cfe0] break-all">{msg}</span>
    </div>
  )
}
