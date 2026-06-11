// src/renderer/src/features/Tool/components/RightPanel/TargetInfo/index.tsx
import { cn } from '../../../shared/lib/utils';
import type { SubTarget } from '../../../features/Tool/types/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_ICON: Record<string, string> = {
  website: '🌐', server: '🖥', app: '📱', api: '⚡', domain: '🔗', network: '🔀', device: '📡',
}

const STATUS_COLOR: Record<string, string> = {
  active:   'text-cyan-400',
  scanning: 'text-amber-400',
  done:     'text-green-400',
  idle:     'text-[#6b7a96]',
  offline:  'text-red-400',
}

const STATUS_DOT: Record<string, string> = {
  active:   'bg-cyan-400',
  scanning: 'bg-amber-400 animate-pulse',
  done:     'bg-green-400',
  idle:     'bg-[#3d4a61]',
  offline:  'bg-red-400',
}

function riskLabel(score: number) {
  if (score >= 80) return { label: 'CRITICAL', cls: 'text-red-400 border-red-500/30 bg-red-500/8' }
  if (score >= 60) return { label: 'HIGH',     cls: 'text-orange-400 border-orange-500/30 bg-orange-500/8' }
  if (score >= 40) return { label: 'MEDIUM',   cls: 'text-amber-400 border-amber-500/30 bg-amber-500/8' }
  return                  { label: 'LOW',      cls: 'text-green-400 border-green-500/30 bg-green-500/8' }
}

// ─── TargetInfo (main export) ─────────────────────────────────────────────────

export function TargetInfo({ subTarget }: { subTarget: SubTarget }) {
  const risk = subTarget.riskScore !== undefined ? riskLabel(subTarget.riskScore) : null

  return (
    <div className="flex flex-col overflow-hidden border-t border-[#1e2535]" style={{ height: '30%' }}>
      {/* header */}
      <div className="flex items-center gap-2 px-3 h-[38px] border-b border-[#1e2535] bg-[#0f1319] shrink-0">
        <svg className="w-3.5 h-3.5 text-[#6b7a96] shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <circle cx="8" cy="8" r="5" />
          <path d="M8 3v1M8 12v1M3 8h1M12 8h1" />
          <circle cx="8" cy="8" r="1.5" fill="currentColor" />
        </svg>
        <span className="font-[Rajdhani,sans-serif] text-[13px] font-bold tracking-wider text-[#c5cfe0] uppercase flex-1">
          Target Info
        </span>
      </div>

      {/* content */}
      <div className="flex-1 overflow-y-auto px-3 py-2.5 bg-[#0f1319] [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[#252e42]">
        {/* name row */}
        <div className="flex items-center gap-2 mb-2">
          <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOT[subTarget.status])} />
          <span className="text-[9.5px] shrink-0 leading-none">{TYPE_ICON[subTarget.type] ?? '🎯'}</span>
          <span className="text-[12px] font-semibold text-[#c5cfe0] truncate flex-1">{subTarget.name}</span>
          {risk && (
            <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0', risk.cls)}>
              {risk.label}
            </span>
          )}
        </div>

        {/* address */}
        <div className="text-[10px] font-mono text-[#6b7a96] truncate mb-2.5 pl-3.5">
          {subTarget.address}
        </div>

        {/* meta grid */}
        <div className="grid grid-cols-2 gap-1.5 text-[9.5px]">
          <div className="bg-[#111520] border border-[#1e2535] rounded px-2 py-1.5">
            <div className="text-[8.5px] text-[#3d4a61] uppercase tracking-wide mb-0.5">Type</div>
            <div className="text-[#c5cfe0] capitalize">{subTarget.type}</div>
          </div>
          <div className="bg-[#111520] border border-[#1e2535] rounded px-2 py-1.5">
            <div className="text-[8.5px] text-[#3d4a61] uppercase tracking-wide mb-0.5">Status</div>
            <div className={cn('capitalize', STATUS_COLOR[subTarget.status])}>{subTarget.status}</div>
          </div>
          {subTarget.riskScore !== undefined && (
            <div className="bg-[#111520] border border-[#1e2535] rounded px-2 py-1.5">
              <div className="text-[8.5px] text-[#3d4a61] uppercase tracking-wide mb-0.5">Risk Score</div>
              <div className={cn('font-bold', risk?.cls.split(' ')[0])}>{subTarget.riskScore}/100</div>
            </div>
          )}
          {subTarget.id && (
            <div className="bg-[#111520] border border-[#1e2535] rounded px-2 py-1.5">
              <div className="text-[8.5px] text-[#3d4a61] uppercase tracking-wide mb-0.5">ID</div>
              <div className="text-[#6b7a96] font-mono truncate">{subTarget.id}</div>
            </div>
          )}
        </div>

        {/* tags */}
        {subTarget.tags && subTarget.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {subTarget.tags.map((tag) => (
              <span key={tag} className="text-[8.5px] px-1.5 py-0.5 rounded bg-[#161b26] border border-[#252e42] text-[#6b7a96]">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
