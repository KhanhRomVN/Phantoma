import React, { useState } from 'react';

const COLORS = [
  'var(--primary, #3b82f6)',
  'var(--warn, #d97706)',
  'var(--purple, #8b5cf6)',
  'var(--success, #10b981)',
  'var(--error, #f43f5e)',
];
const COLLAPSE_THRESHOLD = 4;
const SIZE = 96;
const STROKE = 11;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;
const GAP_DEG = 0;

interface ModelEntry {
  model_id: string;
  provider_id: string;
  total_requests: number;
  total_tokens: number;
}

interface Props {
  modelDistribution: ModelEntry[];
  providerFavicons: Record<string, string>;
  title: string;
  emptyText: string;
}

interface TooltipState {
  index: number;
  x: number;
  y: number;
}

const ModelDistributionCard: React.FC<Props> = ({
  modelDistribution,
  providerFavicons,
  title,
  emptyText,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const total = modelDistribution.reduce((s, m) => s + m.total_requests, 0) || 1;
  const visible = expanded ? modelDistribution : modelDistribution.slice(0, COLLAPSE_THRESHOLD);
  const hasMore = modelDistribution.length > COLLAPSE_THRESHOLD;

  const arcs = (() => {
    if (modelDistribution.length === 0) return [];
    const gapRad = (GAP_DEG / 360) * CIRC;
    const totalGap = gapRad * modelDistribution.length;
    const usable = CIRC - totalGap;
    let offset = 0;
    return modelDistribution.map((m, i) => {
      const dash = (m.total_requests / total) * usable;
      const arc = {
        index: i,
        dash,
        gap: CIRC - dash,
        offset,
        color: COLORS[i % COLORS.length],
        model: m,
      };
      offset += dash + gapRad;
      return arc;
    });
  })();

  const cx = SIZE / 2;
  const cy = SIZE / 2;

  return (
    <div className="rounded-lg p-3.5 box-border border border-border hover:border-primary transition-all duration-200 ease-in-out">
      {/* Title */}
      <div className="text-[11px] font-semibold uppercase tracking-[0.05em] mb-3 opacity-80 text-primary">
        {title}
      </div>

      {modelDistribution.length === 0 ? (
        <span className="text-[11px] opacity-50 italic">{emptyText}</span>
      ) : (
        <div className="flex gap-4 items-start">
          {/* Circle */}
          <div className="relative shrink-0">
            <svg width={SIZE} height={SIZE} className="block">
              {/* Track */}
              <circle
                cx={cx}
                cy={cy}
                r={R}
                fill="none"
                stroke="var(--border, rgba(128,128,128,0.15))"
                strokeWidth={STROKE}
              />
              {/* Arcs */}
              <g transform={`rotate(-90 ${cx} ${cy})`}>
                {arcs.map((arc) => (
                  <circle
                    key={arc.index}
                    cx={cx}
                    cy={cy}
                    r={R}
                    fill="none"
                    stroke={arc.color}
                    strokeWidth={STROKE}
                    strokeDasharray={`${arc.dash} ${arc.gap}`}
                    strokeDashoffset={-arc.offset}
                    strokeLinecap="butt"
                    className="cursor-pointer"
                    onMouseEnter={(e) => {
                      const rect = (
                        e.currentTarget.closest('svg') as SVGSVGElement
                      ).getBoundingClientRect();
                      setTooltip({
                        index: arc.index,
                        x: rect.left + SIZE / 2,
                        y: rect.top,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </g>
              {/* Center label */}
              <text
                x={cx}
                y={cy - 6}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[17px] font-bold text-text-primary"
              >
                {modelDistribution.length}
              </text>
              <text
                x={cx}
                y={cy + 11}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[10px] text-text-secondary"
              >
                models
              </text>
            </svg>

            {/* Tooltip */}
            {tooltip !== null &&
              (() => {
                const m = modelDistribution[tooltip.index];
                const pct = Math.round((m.total_requests / total) * 100);
                return (
                  <div
                    className="fixed -translate-x-1/2 -translate-y-full rounded-md px-2.5 py-[7px] text-[11px] pointer-events-none z-[9999] whitespace-nowrap bg-dropdown-background border text-primary shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
                    style={{
                      left: tooltip.x,
                      top: tooltip.y - 8,
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                          backgroundColor: COLORS[tooltip.index % COLORS.length],
                        }}
                      />
                      <span className="font-semibold">{m.model_id}</span>
                    </div>
                    <div className="opacity-75 leading-relaxed">
                      <div>
                        {m.total_requests} requests ({pct}%)
                      </div>
                      <div>{m.total_tokens.toLocaleString()} tokens</div>
                      <div className="text-[10px] opacity-60">{m.provider_id}</div>
                    </div>
                  </div>
                );
              })()}
          </div>

          {/* Model list — grid */}
          <div className="flex-1 min-w-0 grid grid-cols-2 gap-2 content-start">
            {visible.map((m, i) => {
              const pct = Math.round((m.total_requests / total) * 100);
              const favicon = providerFavicons[m.provider_id];
              const isLong = m.model_id.length > 18;
              return (
                <div
                  key={m.model_id}
                  className="flex items-center gap-[5px] min-w-0"
                  style={isLong ? { gridColumn: '1 / -1' } : {}}
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: COLORS[i % COLORS.length],
                    }}
                  />
                  {favicon && (
                    <img
                      src={favicon}
                      alt=""
                      width={13}
                      height={13}
                      className="rounded-[2px] shrink-0"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <span className="text-xs font-medium overflow-hidden text-ellipsis whitespace-nowrap flex-1">
                    {m.model_id} <span className="opacity-60 font-normal">{pct}%</span>
                  </span>
                </div>
              );
            })}

            {hasMore && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="col-span-full bg-transparent border-none cursor-pointer text-[11px] text-left py-0.5 mt-0.5 text-primary"
              >
                {expanded
                  ? '▲ Show less'
                  : `▼ +${modelDistribution.length - COLLAPSE_THRESHOLD} more`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelDistributionCard;
