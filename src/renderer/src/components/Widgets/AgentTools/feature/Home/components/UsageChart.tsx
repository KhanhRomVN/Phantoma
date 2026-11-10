import { memo, useMemo, useState } from 'react'
import { $ } from '@renderer/utils/color'
import { formatTokens, type DailyUsage } from '../utils/stats'

interface UsageChartProps {
  daily: DailyUsage[]
}

interface Point {
  x: number
  y: number
}

const CHART_H = 120
const CHART_W = 600
const Y_TICKS = 4
const SESSION_COLOR = 'rgb(59, 130, 246)'
const TOKEN_COLOR = 'rgb(16, 185, 129)'

function buildMonotonePath(pts: Point[]): string {
  const n = pts.length
  if (n < 2) return ''
  const dx: number[] = []
  const s: number[] = []
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1].x - pts[i].x)
    s.push((pts[i + 1].y - pts[i].y) / (dx[i] || 1))
  }
  const m: number[] = new Array(n)
  m[0] = s[0]
  m[n - 1] = s[n - 2]
  for (let i = 1; i < n - 1; i++) {
    m[i] = s[i - 1] * s[i] <= 0 ? 0 : (s[i - 1] + s[i]) / 2
  }
  for (let i = 0; i < n - 1; i++) {
    if (s[i] === 0) {
      m[i] = 0
      m[i + 1] = 0
      continue
    }
    const a = m[i] / s[i]
    const b = m[i + 1] / s[i]
    const h = a * a + b * b
    if (h > 9) {
      const t = 3 / Math.sqrt(h)
      m[i] = t * a * s[i]
      m[i + 1] = t * b * s[i]
    }
  }
  let d = `M ${pts[0].x},${pts[0].y}`
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3
    d += ` C ${pts[i].x + h},${pts[i].y + m[i] * h} ${pts[i + 1].x - h},${pts[i + 1].y - m[i + 1] * h} ${pts[i + 1].x},${pts[i + 1].y}`
  }
  return d
}

function niceCeil(v: number): number {
  if (v <= 0) return 1
  const exp = Math.pow(10, Math.floor(Math.log10(v)))
  const f = v / exp
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10
  return nice * exp
}

const formatSessions = (v: number): string => (Number.isInteger(v) ? String(v) : v.toFixed(1))

const formatDay = (date: string): string => {
  const [, mm, dd] = date.split('-')
  return `${dd}/${mm}`
}

export const UsageChart = memo<UsageChartProps>(({ daily }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const n = daily.length
  const sessVals = useMemo(() => daily.map((d) => d.sessions), [daily])
  const tokVals = useMemo(() => daily.map((d) => d.tokens), [daily])
  const totalSess = sessVals.reduce((a, b) => a + b, 0)
  const totalTok = tokVals.reduce((a, b) => a + b, 0)
  const yMaxSess = niceCeil(Math.max(...sessVals, 1))
  const yMaxTok = niceCeil(Math.max(...tokVals, 1))
  const isEmpty = totalSess === 0 && totalTok === 0

  const peakIdx = useMemo(() => {
    let best = -1
    sessVals.forEach((v, i) => {
      if (v > 0 && (best === -1 || v > sessVals[best])) best = i
    })
    return best
  }, [sessVals])

  const xOf = (i: number): number => ((i + 0.5) / Math.max(n, 1)) * CHART_W
  const tokPoints: Point[] = tokVals.map((v, i) => ({
    x: xOf(i),
    y: CHART_H - (v / yMaxTok) * CHART_H
  }))
  const tokLine = buildMonotonePath(tokPoints)
  const tokArea = tokLine ? `${tokLine} L ${xOf(n - 1)},${CHART_H} L ${xOf(0)},${CHART_H} Z` : ''


  const hovered = hoveredIdx !== null ? daily[hoveredIdx] : null

  return (
    <div className="bg-card-background rounded-lg p-3.5 box-border flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-primary opacity-80">
          Usage
        </span>
        <div className="inline-flex gap-3 text-[10px] font-semibold">
          <span className="inline-flex items-center gap-1.5" style={{ color: SESSION_COLOR }}>
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: SESSION_COLOR }} />
            Sessions
          </span>
          <span className="inline-flex items-center gap-1.5" style={{ color: TOKEN_COLOR }}>
            <span className="w-2.5 h-[3px] rounded-sm" style={{ backgroundColor: TOKEN_COLOR }} />
            Tokens
          </span>
        </div>
      </div>


      <div className="flex gap-2">
        <div className="relative w-7 shrink-0 mb-[18px]">
          {Array.from({ length: Y_TICKS + 1 }, (_, i) => (
            <span
              key={i}
              className="absolute right-0 text-[9px] leading-none opacity-75"
              style={{
                top: `${(i / Y_TICKS) * 100}%`,
                transform: 'translateY(-50%)',
                color: SESSION_COLOR,
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {formatSessions((yMaxSess * (Y_TICKS - i)) / Y_TICKS)}
            </span>
          ))}
        </div>

        <div className="flex-1 min-w-0 flex flex-col">
          <div
            className="relative min-h-[120px] flex-1"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const rel = (e.clientX - rect.left) / rect.width
              setHoveredIdx(Math.max(0, Math.min(n - 1, Math.floor(rel * n))))
            }}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            {Array.from({ length: Y_TICKS + 1 }, (_, i) => (
              <div
                key={i}
                className="absolute left-0 right-0 pointer-events-none border-t"
                style={{
                  top: `${(i / Y_TICKS) * 100}%`,
                  borderColor: i === Y_TICKS ? $('--border') : 'rgba(128,128,128,0.22)',
                  borderStyle: i === Y_TICKS ? 'solid' : 'dashed'
                }}
              />
            ))}

            <div className="absolute inset-0 flex items-stretch">
              {daily.map((d, i) => {
                const isHover = hoveredIdx === i
                const isPeak = i === peakIdx
                return (
                  <div
                    key={d.date}
                    className="flex-1 min-w-0 relative rounded"
                    style={{ backgroundColor: isHover ? 'rgba(255,255,255,0.06)' : 'transparent' }}
                  >
                    {d.sessions > 0 && (
                      <div
                        className="absolute left-[12%] right-[12%] bottom-0 rounded-t min-h-[2px] transition-opacity duration-100"
                        style={{
                          height: `${(d.sessions / yMaxSess) * 100}%`,
                          background: `linear-gradient(to top, color-mix(in srgb, ${SESSION_COLOR} 35%, transparent), ${SESSION_COLOR})`,
                          opacity: isHover || isPeak ? 1 : 0.6
                        }}
                      />
                    )}
                  </div>
                )
              })}
            </div>

            <svg
              viewBox={`0 0 ${CHART_W} ${CHART_H}`}
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
            >
              <defs>
                <linearGradient id="agent-home-tok-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" style={{ stopColor: TOKEN_COLOR }} stopOpacity="0.22" />
                  <stop offset="100%" style={{ stopColor: TOKEN_COLOR }} stopOpacity="0" />
                </linearGradient>
              </defs>
              {tokArea && <path d={tokArea} fill="url(#agent-home-tok-grad)" />}
              {tokLine && (
                <path
                  d={tokLine}
                  fill="none"
                  stroke={TOKEN_COLOR}
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>

            {hovered && hoveredIdx !== null && (
              <>
                <div
                  className="absolute w-2.5 h-2.5 rounded-full border-2 pointer-events-none"
                  style={{
                    left: `${((hoveredIdx + 0.5) / n) * 100}%`,
                    top: `${(1 - tokVals[hoveredIdx] / yMaxTok) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: TOKEN_COLOR,
                    borderColor: $('--card-background')
                  }}
                />
                <div
                  className="absolute -translate-x-1/2 -translate-y-full rounded-md px-2.5 py-[7px] text-[11px] pointer-events-none z-10 whitespace-nowrap border shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
                  style={{
                    left: `${Math.min(Math.max(((hoveredIdx + 0.5) / n) * 100, 12), 88)}%`,
                    top: -6,
                    backgroundColor: $('--dropdown-background'),
                    borderColor: $('--border'),
                    color: $('--text-primary')
                  }}
                >
                  <div className="font-semibold mb-1">{hovered.date}</div>
                  <div className="flex flex-col gap-[3px]">
                    <div className="flex items-center justify-between gap-3.5">
                      <span>Sessions</span>
                      <span className="font-semibold">{hovered.sessions}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3.5">
                      <span>Tokens</span>
                      <span className="font-semibold">{hovered.tokens.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {isEmpty && (
              <div className="absolute inset-0 flex items-center justify-center text-[11px] italic opacity-60 pointer-events-none text-text-secondary">
                No activity in this period
              </div>
            )}
          </div>

          <div className="relative h-3 mt-1.5">
            {daily.map((d, i) =>
              i % 2 === 0 || i === n - 1 ? (
                <span
                  key={d.date}
                  className="absolute text-[9px] leading-3 whitespace-nowrap text-text-secondary"
                  style={{
                    left: `${((i + 0.5) / n) * 100}%`,
                    transform: 'translateX(-50%)',
                    opacity: hoveredIdx === i ? 1 : 0.6
                  }}
                >
                  {formatDay(d.date)}
                </span>
              ) : null
            )}
          </div>
        </div>

        <div className="relative w-8 shrink-0 mb-[18px]">
          {Array.from({ length: Y_TICKS + 1 }, (_, i) => (
            <span
              key={i}
              className="absolute left-0 text-[9px] leading-none opacity-75"
              style={{
                top: `${(i / Y_TICKS) * 100}%`,
                transform: 'translateY(-50%)',
                color: TOKEN_COLOR,
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {formatTokens((yMaxTok * (Y_TICKS - i)) / Y_TICKS)}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
})

UsageChart.displayName = 'UsageChart'