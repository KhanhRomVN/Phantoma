/**
 * ------------------------------------------------------------------
 * DailyUsageChart
 * ------------------------------------------------------------------
 * Biểu đồ đường hiển thị số requests theo giờ trong ngày.
 * Dùng đường cong mượt (Catmull-Rom → cubic bezier) thay vì polyline gấp khúc.
 *
 * Main features:
 * - Vẽ line chart 24 giờ với area fill
 * - Tooltip hiển thị chi tiết requests/tokens khi hover
 * - Responsive theo container width (ResizeObserver)
 * ------------------------------------------------------------------
 */

import React, { useRef, useState, useEffect } from 'react';

interface HourEntry {
  date: string;
  requests: number;
  tokens: number;
}
interface Props {
  usage: HourEntry[];
  title: string;
}

const LINE_COLOR = 'rgb(var(--primary))';
const CHART_H = 120;
const CHART_W = 600;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface Point {
  x: number;
  y: number;
}

// Catmull-Rom → cubic bezier path
function buildSmoothPath(points: Point[]): string {
  if (points.length < 2) return '';
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

const DailyUsageChart: React.FC<Props> = ({ usage, title }) => {
  const [tooltip, setTooltip] = useState<{ hour: number; svgX: number; svgY: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(200);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dataMap = new Map<number, HourEntry>();
  usage.forEach((u) => {
    const h = parseInt(u.date.split(':')[0], 10);
    if (!isNaN(h)) dataMap.set(h, u);
  });

  const currentHour = new Date().getHours();
  const maxReq = Math.max(...HOURS.map((h) => dataMap.get(h)?.requests ?? 0), 1);

  const xOf = (h: number) => (h / 23) * CHART_W;
  const yOf = (h: number) => {
    const req = dataMap.get(h)?.requests ?? 0;
    return CHART_H - (req / maxReq) * CHART_H;
  };

  // Build smooth path for past/present hours only
  const pastPointsData = HOURS.filter((h) => h <= currentHour).map((h) => ({
    x: xOf(h),
    y: yOf(h),
  }));
  const pastPath = buildSmoothPath(pastPointsData);

  // Area fill under past line
  const areaPoints = [
    `${xOf(0)},${CHART_H}`,
    ...HOURS.filter((h) => h <= currentHour).map((h) => `${xOf(h)},${yOf(h)}`),
    `${xOf(currentHour)},${CHART_H}`,
  ].join(' ');

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const hour = Math.round(relX * 23);
    const clampedH = Math.max(0, Math.min(23, hour));
    const dotX = rect.left + (xOf(clampedH) / CHART_W) * rect.width;
    const dotY = rect.top + (yOf(clampedH) / CHART_H) * rect.height;
    setTooltip({ hour: clampedH, svgX: dotX, svgY: dotY });
  };

  return (
    <div className="rounded-lg p-3.5 box-border border border-border hover:border-primary transition-all duration-200 ease-in-out">
      <div className="text-[11px] font-semibold uppercase tracking-[0.05em] mb-2.5 opacity-80 text-primary">
        {title}
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="w-full block overflow-visible"
          style={{ height: `${CHART_H}px` }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
        >
          <defs>
            <linearGradient id="lineAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={LINE_COLOR} stopOpacity="0.25" />
              <stop offset="100%" stopColor={LINE_COLOR} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          {pastPointsData.length > 1 && (
            <polygon points={areaPoints} fill="url(#lineAreaGrad)" />
          )}

          {/* Past line — smooth curve */}
          {pastPath && (
            <path
              d={pastPath}
              fill="none"
              stroke={LINE_COLOR}
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* Hover dot */}
          {tooltip !== null && (
            <circle
              cx={xOf(tooltip.hour)}
              cy={yOf(tooltip.hour)}
              r={3}
              fill={tooltip.hour <= currentHour ? LINE_COLOR : 'rgba(128,128,128,0.5)'}
              stroke="rgb(var(--background))"
              strokeWidth="1.5"
            />
          )}
        </svg>

        {/* X-axis labels — density based on container width */}
        <div ref={containerRef} className="flex mt-1 relative h-3">
          {(() => {
            const maxLabels = Math.max(2, Math.floor(containerWidth / 28));
            const step = Math.ceil(23 / (maxLabels - 1));
            const labelHours: number[] = [];
            for (let h = 0; h <= 23; h += step) labelHours.push(h);
            if (labelHours[labelHours.length - 1] !== 23) labelHours.push(23);
            return labelHours.map((h) => (
              <span
                key={h}
                className="absolute -translate-x-1/2 text-[9px] opacity-60 whitespace-nowrap text-text-secondary"
                style={{
                  left: `${(h / 23) * 100}%`,
                }}
              >
                {String(h).padStart(2, '0')}h
              </span>
            ));
          })()}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip !== null &&
        (() => {
          const entry = dataMap.get(tooltip.hour);
          return (
            <div
              className="fixed -translate-x-1/2 -translate-y-full rounded-md px-2.5 py-1.5 text-[11px] pointer-events-none z-[9999] whitespace-nowrap bg-dropdown-background border text-primary shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
              style={{
                left: tooltip.svgX,
                top: tooltip.svgY - 8,
              }}
            >
              <div className="font-semibold mb-[3px]">
                {String(tooltip.hour).padStart(2, '0')}:00 –{' '}
                {String(tooltip.hour + 1).padStart(2, '0')}:00
              </div>
              <div className="opacity-75 leading-relaxed">
                <div>{entry?.requests ?? 0} requests</div>
                <div>{(entry?.tokens ?? 0).toLocaleString()} tokens</div>
              </div>
            </div>
          );
        })()}
    </div>
  );
};

export default React.memo(DailyUsageChart);