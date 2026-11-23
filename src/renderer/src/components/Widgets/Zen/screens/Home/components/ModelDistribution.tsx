/**
 * ------------------------------------------------------------------
 * ModelDistributionCard
 * ------------------------------------------------------------------
 * Card phân bố requests theo model: donut chart + danh sách model.
 *
 * Main features:
 * - Donut có khe hở giữa các cung, tâm hiển thị tổng requests
 * - Mỗi model là một dòng: màu + favicon + tên + % + thanh tỷ lệ + req/tokens
 * - Hover dòng ↔ hover cung: highlight hai chiều, tâm donut hiện % của model
 * - Fixed row height với scroll nếu nhiều models
 * - Fixed desktop layout (no responsive breakpoints)
 * ------------------------------------------------------------------
 */

import React, { useMemo, useState } from 'react';
import { $ } from '@renderer/utils/color';

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

const COLORS = [
  'rgb(59, 130, 246)',
  'rgb(245, 158, 11)',
  'rgb(139, 92, 246)',
  'rgb(16, 185, 129)',
  'rgb(244, 63, 94)',
];
const SIZE = 120;
const STROKE = 12;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;
const ARC_GAP = 2;
const ROW_H = 48;
const ROW_GAP = 2;
const MAX_VISIBLE = 3;

function formatTokens(v: number): string {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return String(v);
}

const ModelDistributionCard: React.FC<Props> = ({
  modelDistribution,
  providerFavicons,
  title,
  emptyText,
}) => {
  const [hovered, setHovered] = useState<number | null>(null);

  const n = modelDistribution.length;
  const total = modelDistribution.reduce((s, m) => s + m.total_requests, 0);
  const safeTotal = total || 1;

  const arcs = useMemo(() => {
    const gap = n > 1 ? ARC_GAP : 0;
    let offset = 0;
    return modelDistribution.map((m, i) => {
      const slice = (m.total_requests / safeTotal) * CIRC;
      const dash = Math.max(slice - gap, 0);
      const arc = { i, dash, offset: offset + gap / 2, color: COLORS[i % COLORS.length] };
      offset += slice;
      return arc;
    });
  }, [modelDistribution, safeTotal, n]);

  const cx = SIZE / 2;
  const hoveredModel = hovered !== null ? modelDistribution[hovered] : null;

  return (
    <div className="bg-card-background rounded-lg p-3.5 box-border flex flex-col gap-3">
      <style>{`
        .zen-dist-list {
          max-height: ${MAX_VISIBLE * ROW_H + (MAX_VISIBLE - 1) * ROW_GAP}px;
          overflow-y: auto;
          overflow-x: hidden;
          overscroll-behavior: contain;
        }
        .zen-dist-list::-webkit-scrollbar { width: 6px; }
        .zen-dist-list::-webkit-scrollbar-track { background: transparent; }
        .zen-dist-list::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.4); border-radius: 3px; }
        .zen-dist-list::-webkit-scrollbar-thumb:hover { background: rgba(128,128,128,0.6); }
        .zen-dist-row { transition: background-color 0.15s ease, opacity 0.15s ease; }
      `}</style>

      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.05em] opacity-80 text-text-primary">
          {title}
        </div>
        {n > 0 && (
          <span 
            className="text-[10px] font-semibold px-2 py-0.5 rounded-[5px]"
            style={{ 
              color: $('--text-secondary'),
              backgroundColor: 'rgba(255,255,255,0.06)'
            }}
          >
            {n} {n === 1 ? 'model' : 'models'}
          </span>
        )}
      </div>

      {n === 0 ? (
        <span className="text-[11px] opacity-50 italic text-text-secondary">{emptyText}</span>
      ) : (
        <div className="flex gap-3 items-center">
          {/* Donut */}
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
                const active = hovered === a.i;
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
                      transition: 'stroke-width 0.15s ease, opacity 0.15s ease',
                    }}
                    onMouseEnter={() => setHovered(a.i)}
                  />
                );
              })}
            </g>
            <text
              x={cx}
              y={cx - 5}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xl font-bold fill-current"
              style={{ fill: $('--text-primary') }}
            >
              {hoveredModel
                ? `${Math.round((hoveredModel.total_requests / safeTotal) * 100)}%`
                : formatTokens(total)}
            </text>
            <text
              x={cx}
              y={cx + 14}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[10px] fill-current"
              style={{ fill: $('--text-secondary') }}
            >
              {hoveredModel ? `${hoveredModel.total_requests} req` : 'requests'}
            </text>
          </svg>

          {/* List */}
          <div
            className="zen-dist-list flex-1 min-w-0 flex flex-col gap-0.5"
            style={n > MAX_VISIBLE ? { paddingRight: '4px' } : undefined}
            onMouseLeave={() => setHovered(null)}
          >
            {modelDistribution.map((m, i) => {
              const pct = (m.total_requests / safeTotal) * 100;
              const color = COLORS[i % COLORS.length];
              const favicon = providerFavicons[m.provider_id];
              const active = hovered === i;
              return (
                <div
                  key={`${m.provider_id}:${m.model_id}`}
                  className="zen-dist-row flex flex-col justify-center px-2 py-1.5 rounded-md min-w-0"
                  title={`${m.model_id} · ${m.provider_id}\n${m.total_requests} requests · ${m.total_tokens.toLocaleString()} tokens`}
                  onMouseEnter={() => setHovered(i)}
                  style={{
                    height: `${ROW_H}px`,
                    flexShrink: 0,
                    backgroundColor: active ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
                    opacity: hovered === null || active ? 1 : 0.55,
                  }}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2 h-2 rounded-sm shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    {favicon && (
                      <img
                        src={favicon}
                        alt=""
                        width={13}
                        height={13}
                        className="rounded-sm shrink-0"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <span 
                      className="flex-1 min-w-0 text-xs font-medium overflow-hidden text-ellipsis whitespace-nowrap"
                      style={{ color: $('--text-primary') }}
                    >
                      {m.model_id}
                    </span>
                    <span 
                      className="text-xs font-bold shrink-0" 
                      style={{ 
                        fontVariantNumeric: 'tabular-nums',
                        color: $('--text-primary')
                      }}
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
                        style={{
                          width: `${pct}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                    <span 
                      className="text-[10px] whitespace-nowrap" 
                      style={{ 
                        fontVariantNumeric: 'tabular-nums',
                        color: $('--text-secondary')
                      }}
                    >
                      {m.total_requests} req · {formatTokens(m.total_tokens)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(ModelDistributionCard);