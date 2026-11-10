import { memo, useMemo, useState } from 'react'
import { $ } from '@renderer/utils/color'
import { getFaviconUrl } from '@renderer/utils/favicon'
import { formatTokens, type ModelUsage } from '../utils/stats'

interface ModelDistributionProps {
  models: ModelUsage[]
}

const COLORS = [
  'rgb(59, 130, 246)',
  'rgb(245, 158, 11)',
  'rgb(139, 92, 246)',
  'rgb(16, 185, 129)',
  'rgb(244, 63, 94)'
]
const SIZE = 120
const STROKE = 12
const R = (SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * R
const ARC_GAP = 2
const ROW_H = 48
const ROW_GAP = 2
const MAX_VISIBLE = 3

export const ModelDistribution = memo<ModelDistributionProps>(({ models }) => {
  const [hovered, setHovered] = useState<number | null>(null)

  const n = models.length
  const total = models.reduce((s, m) => s + m.sessions, 0)
  const safeTotal = total || 1

  const arcs = useMemo(() => {
    const gap = n > 1 ? ARC_GAP : 0
    let offset = 0
    return models.map((m, i) => {
      const slice = (m.sessions / safeTotal) * CIRC
      const dash = Math.max(slice - gap, 0)
      const arc = { i, dash, offset: offset + gap / 2, color: COLORS[i % COLORS.length] }
      offset += slice
      return arc
    })
  }, [models, safeTotal, n])

  const cx = SIZE / 2
  const hoveredModel = hovered !== null ? models[hovered] : null

  return (
    <div className="bg-card-background rounded-lg p-3.5 box-border flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-primary opacity-80">
          Model Distribution
        </span>
        {n > 0 && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-[5px] text-text-secondary bg-text-primary/10">
            {n} {n === 1 ? 'model' : 'models'}
          </span>
        )}
      </div>

      {n === 0 ? (
        <span className="text-[11px] opacity-50 italic text-text-secondary">No model data</span>
      ) : (
        <div className="flex gap-3 items-center">
          <svg
            className="block shrink-0"
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            onMouseLeave={() => setHovered(null)}
          >
            <circle
              cx={cx}
              cy={cx}
              r={R}
              fill="none"
              stroke={$('--border')}
              strokeWidth={STROKE}
              style={{ opacity: 0.15 }}
            />
            <g transform={`rotate(-90 ${cx} ${cx})`}>
              {arcs.map((a) => {
                const active = hovered === a.i
                return (
                  <circle
                    key={a.i}
                    cx={cx}
                    cy={cx}
                    r={R}
                    fill="none"
                    stroke={a.color}
                    strokeWidth={active ? STROKE + 3 : STROKE}
                    strokeDasharray={`${a.dash} ${CIRC - a.dash}`}
                    strokeDashoffset={-a.offset}
                    strokeLinecap="butt"
                    opacity={hovered === null || active ? 1 : 0.4}
                    style={{
                      cursor: 'pointer',
                      transition: 'stroke-width 0.15s ease, opacity 0.15s ease'
                    }}
                    onMouseEnter={() => setHovered(a.i)}
                  />
                )
              })}
            </g>
            <text
              x={cx}
              y={cx - 5}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xl font-bold"
              style={{ fill: $('--text-primary') }}
            >
              {hoveredModel ? `${Math.round((hoveredModel.sessions / safeTotal) * 100)}%` : total}
            </text>
            <text
              x={cx}
              y={cx + 14}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[10px]"
              style={{ fill: $('--text-secondary') }}
            >
              {hoveredModel ? `${hoveredModel.sessions} sessions` : 'sessions'}
            </text>
          </svg>

          <div
            className="flex-1 min-w-0 flex flex-col overflow-y-auto overflow-x-hidden overscroll-contain"
            style={{
              gap: `${ROW_GAP}px`,
              maxHeight: `${MAX_VISIBLE * ROW_H + (MAX_VISIBLE - 1) * ROW_GAP}px`,
              paddingRight: n > MAX_VISIBLE ? '4px' : undefined
            }}
            onMouseLeave={() => setHovered(null)}
          >
            {models.map((m, i) => {
              const pct = (m.sessions / safeTotal) * 100
              const color = COLORS[i % COLORS.length]
              const active = hovered === i
              return (
                <div
                  key={`${m.agentId}:${m.modelId}`}
                  className="flex flex-col justify-center px-2 py-1.5 rounded-md min-w-0 transition-[background-color,opacity] duration-150"
                  title={`${m.modelId} · ${m.agentId}\n${m.sessions} sessions · ${m.tokens.toLocaleString()} tokens`}
                  onMouseEnter={() => setHovered(i)}
                  style={{
                    height: `${ROW_H}px`,
                    flexShrink: 0,
                    backgroundColor: active ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
                    opacity: hovered === null || active ? 1 : 0.55
                  }}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                    <img
                      src={getFaviconUrl(m.url, 32)}
                      alt=""
                      width={13}
                      height={13}
                      className="rounded-sm shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                    <span className="flex-1 min-w-0 text-xs font-medium truncate text-text-primary">
                      {m.modelId}
                    </span>
                    <span
                      className="text-xs font-bold shrink-0 text-text-primary"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {Math.round(pct)}%
                    </span>
                  </div>

                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 mt-[5px]">
                    <div
                      className="h-1 rounded-sm overflow-hidden"
                      style={{ backgroundColor: 'rgba(128, 128, 128, 0.15)' }}
                    >
                      <div
                        className="h-full rounded-sm"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                    <span
                      className="text-[10px] whitespace-nowrap text-text-secondary"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {m.sessions} sess · {formatTokens(m.tokens)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
})

ModelDistribution.displayName = 'ModelDistribution'