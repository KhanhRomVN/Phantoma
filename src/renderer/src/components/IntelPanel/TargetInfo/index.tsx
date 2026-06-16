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
  idle:     'text-text-secondary',
  offline:  'text-red-400',
}

const STATUS_DOT: Record<string, string> = {
  active:   'bg-cyan-400',
  scanning: 'bg-amber-400 animate-pulse',
  done:     'bg-green-400',
  idle:     'bg-text-secondary',
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
    <div className="flex flex-col overflow-hidden border-t border-divider" style={{ height: '30%' }}>
      {/* header */}
      <div className="flex items-center gap-2 px-3 h-[38px] border-b border-divider bg-background shrink-0">
        <svg className="w-3.5 h-3.5 text-text-secondary shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <circle cx="8" cy="8" r="5" />
          <path d="M8 3v1M8 12v1M3 8h1M12 8h1" />
          <circle cx="8" cy="8" r="1.5" fill="currentColor" />
        </svg>
        <span className="font-[Rajdhani,sans-serif] text-[13px] font-bold tracking-wider text-text-primary uppercase flex-1">
          Target Info
        </span>
      </div>

      {/* content */}
      <div className="flex-1 overflow-y-auto px-3 py-2.5 bg-background [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-border">
        {/* name row */}
        <div className="flex items-center gap-2 mb-2">
          <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOT[subTarget.status])} />
          <span className="text-[9.5px] shrink-0 leading-none">{TYPE_ICON[subTarget.type] ?? '🎯'}</span>
          <span className="text-[12px] font-semibold text-text-primary truncate flex-1">{subTarget.name}</span>
          {risk && (
            <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0', risk.cls)}>
              {risk.label}
            </span>
          )}
        </div>

        {/* address */}
        <div className="text-[10px] font-mono text-text-secondary truncate mb-2.5 pl-3.5">
          {subTarget.address}
        </div>

        {/* meta grid */}
        <div className="grid grid-cols-2 gap-1.5 text-[9.5px]">
          <div className="bg-card-background border border-divider rounded px-2 py-1.5">
            <div className="text-[8.5px] text-text-secondary uppercase tracking-wide mb-0.5">Type</div>
            <div className="text-text-primary capitalize">{subTarget.type}</div>
          </div>
          <div className="bg-card-background border border-divider rounded px-2 py-1.5">
            <div className="text-[8.5px] text-text-secondary uppercase tracking-wide mb-0.5">Status</div>
            <div className={cn('capitalize', STATUS_COLOR[subTarget.status])}>{subTarget.status}</div>
          </div>
          {subTarget.riskScore !== undefined && (
            <div className="bg-card-background border border-divider rounded px-2 py-1.5">
              <div className="text-[8.5px] text-text-secondary uppercase tracking-wide mb-0.5">Risk Score</div>
              <div className={cn('font-bold', risk?.cls.split(' ')[0])}>{subTarget.riskScore}/100</div>
            </div>
          )}
          {subTarget.id && (
            <div className="bg-card-background border border-divider rounded px-2 py-1.5">
              <div className="text-[8.5px] text-text-secondary uppercase tracking-wide mb-0.5">ID</div>
              <div className="text-text-secondary font-mono truncate">{subTarget.id}</div>
            </div>
          )}
        </div>

        {/* tags */}
        {subTarget.tags && subTarget.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {subTarget.tags.map((tag) => (
              <span key={tag} className="text-[8.5px] px-1.5 py-0.5 rounded bg-sidebar-item-hover border border-border text-text-secondary">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
