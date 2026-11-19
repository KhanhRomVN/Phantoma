import { Fragment, useId } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { SRC_ACCENT } from '../../constants/theme';
import type { SourceType } from '../../types/monitor.types';
import { Favicon, getFaviconUrl } from '@renderer/utils/favicon';
import { SRC_META } from '../../constants/meta';
import { c, tc } from '../../utils/color';

export function PlatformIcon({ type, size = 16 }: { type: SourceType; size?: number }) {
  return (
    <span style={{ width: size, height: size, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: Math.max(3, size * 0.2), overflow: 'hidden' }}>
      <Favicon
        url={getFaviconUrl(SRC_META[type].url, size * 2)}
        size={size}
        alt={SRC_META[type].label}
        fallbackIcon={
          <span style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.55, fontWeight: 700, color: '#fff', background: `rgba(${SRC_ACCENT[type]},.6)` }}>
            {SRC_META[type].short.charAt(0)}
          </span>
        }
      />
    </span>
  );
}

export function Sparkline({
  data,
  tone = 'success',
  w = 84,
  h = 24,
}: {
  data: number[];
  tone?: string;
  w?: number;
  h?: number;
}) {
  const gid = `sp${useId().replace(/:/g, '')}`;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - 2 - ((v - min) / Math.max(1, max - min)) * (h - 4),
  ]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: tc(tone, 0.35) }} />
          <stop offset="1" style={{ stopColor: tc(tone, 0) }} />
        </linearGradient>
      </defs>
      <path d={`${d} L${w} ${h} L0 ${h} Z`} style={{ fill: `url(#${gid})` }} />
      <path
        d={d}
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={
          {
            stroke: tc(tone),
            strokeDasharray: 400,
            animation: 'mndraw 1.2s ease-out both',
            ['--len' as string]: 400,
          } as CSSProperties
        }
      />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2" style={{ fill: tc(tone) }} />
    </svg>
  );
}

export function Ring({
  value,
  size = 36,
  stroke = 4,
  tone = 'success',
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: string;
  label?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <span
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} style={{ stroke: c('border') }} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - Math.min(100, value) / 100)}
          style={{
            stroke: tc(tone),
            transition: 'stroke-dashoffset .6s ease-out',
            filter: `drop-shadow(0 0 3px ${tc(tone, 0.5)})`,
          }}
        />
      </svg>
      {label !== undefined && (
        <span className="mono" style={{ position: 'absolute', fontSize: Math.max(8, size * 0.3), fontWeight: 700 }}>
          {label}
        </span>
      )}
    </span>
  );
}

export function HealthRing({ uptime, latency, err }: { uptime: number; latency: number; err: number }) {
  const rings: [number, string][] = [
    [uptime, 'success'],
    [Math.max(4, 100 - latency / 12), 'info'],
    [Math.max(4, 100 - err * 4), 'warn'],
  ];
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" style={{ transform: 'rotate(-90deg)' }} aria-label="Monitor health">
      {rings.map(([v, t], i) => {
        const r = 15 - i * 4.5;
        const circ = 2 * Math.PI * r;
        return (
          <g key={t}>
            <circle cx="17" cy="17" r={r} fill="none" strokeWidth="2.4" style={{ stroke: c('border') }} />
            <circle
              cx="17"
              cy="17"
              r={r}
              fill="none"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - Math.min(100, v) / 100)}
              style={{ stroke: tc(t) }}
            />
          </g>
        );
      })}
    </svg>
  );
}

export function SourceAvatar({
  name,
  type,
  size = 36,
  read,
}: {
  name: string;
  type: SourceType;
  size?: number;
  read?: boolean;
}) {
  const a = SRC_ACCENT[type];
  return (
    <span style={{ position: 'relative', width: size, height: size, flexShrink: 0, display: 'inline-flex' }}>
      {read && (
        <span
          title="Read"
          style={{
            position: 'absolute',
            inset: -3,
            borderRadius: Math.max(6, size * 0.28) + 3,
            border: `1.5px solid rgba(${a},.5)`,
          }}
        />
      )}
      <span
        className="avs"
        style={{
          width: size,
          height: size,
          borderRadius: Math.max(6, size * 0.28),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          color: '#fff',
          fontSize: size * 0.4,
          background: c('tp', 0.1),
        }}
        title={name}
      >
        <PlatformIcon type={type} size={Math.round(size * 0.6)} />
      </span>
    </span>
  );
}

export function SignalWave({ height = 44 }: { height?: number }) {
  const mk = (amp: number, phase: number): string => {
    let d = `M0 ${height / 2}`;
    for (let x = 0; x <= 640; x += 8) {
      d += ` L${x} ${(height / 2 + Math.sin(x / 38 + phase) * amp * Math.sin(x / 160 + 1)).toFixed(1)}`;
    }
    return d;
  };
  return (
    <svg width="100%" height={height} viewBox={`0 0 640 ${height}`} preserveAspectRatio="none" aria-hidden style={{ display: 'block' }}>
      <path d={mk(14, 0)} fill="none" strokeWidth="1.6" style={{ stroke: c('primary', 0.9), strokeDasharray: '10 6', animation: 'mnwave 6s linear infinite' }} />
      <path d={mk(9, 2)} fill="none" strokeWidth="1.2" style={{ stroke: c('info', 0.7), strokeDasharray: '4 8', animation: 'mnwave 9s linear infinite reverse' }} />
      <path d={mk(5, 4)} fill="none" strokeWidth="1" style={{ stroke: c('success', 0.5), strokeDasharray: '2 10', animation: 'mnwave 12s linear infinite' }} />
    </svg>
  );
}

export function RadarMini({ active }: { active: number }) {
  const blips: [number, number][] = [
    [38, 14],
    [18, 30],
    [40, 40],
  ];
  return (
    <div title={`${active} monitors scanning`} style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
      <svg width="64" height="64" viewBox="0 0 56 56" aria-hidden>
        {[26, 17, 8].map((r) => (
          <circle key={r} cx="28" cy="28" r={r} fill="none" strokeWidth="1" style={{ stroke: c('success', 0.28) }} />
        ))}
        <line x1="2" y1="28" x2="54" y2="28" style={{ stroke: c('success', 0.18) }} />
        <line x1="28" y1="2" x2="28" y2="54" style={{ stroke: c('success', 0.18) }} />
        <g style={{ transformOrigin: '28px 28px', animation: 'mnrad 3.6s linear infinite' }}>
          <path d="M28 28 L28 2 A26 26 0 0 1 46 9 Z" style={{ fill: c('success', 0.3) }} />
        </g>
        {blips.map(([x, y], k) => (
          <circle key={k} cx={x} cy={y} r="2" style={{ fill: c('success'), animation: `mnbreathe ${2 + k * 0.7}s ease-in-out infinite` }} />
        ))}
      </svg>
    </div>
  );
}

export function TimeMarker({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0 2px' }}>
      <span className="div-grad" style={{ flex: 1 }} />
      <span className="sub" style={{ fontWeight: 500, letterSpacing: '.02em' }}>
        {label}
      </span>
      <span className="div-grad" style={{ flex: 1 }} />
    </div>
  );
}

export function HeatGrid({
  data,
  labels,
  tone = 'primary',
  hl,
  onHover,
}: {
  data: number[][];
  labels: string[];
  tone?: string;
  hl?: [number, number] | null;
  onHover?: (d: number, h: number) => void;
}) {
  const max = Math.max(1, ...data.flat());
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '24px repeat(24, minmax(0, 1fr))', gap: 3, alignItems: 'center' }}>
      <span />
      {Array.from({ length: 24 }, (_, h) => (
        <span key={h} className="sub mono" style={{ fontSize: 9, textAlign: 'center' }}>
          {h % 3 === 0 ? h : ''}
        </span>
      ))}
      {data.map((row, d) => (
        <Fragment key={d}>
          <span className="sub mono" style={{ fontSize: 10 }}>
            {labels[d]}
          </span>
          {row.map((v, h) => (
            <span
              key={h}
              title={`${labels[d]} ${h}:00 · ${v} signals`}
              onMouseEnter={() => onHover?.(d, h)}
              style={{
                aspectRatio: '1',
                borderRadius: 3,
                background: v ? tc(tone, 0.1 + (0.9 * v) / max) : c('ts', 0.07),
                outline: hl && hl[0] === d && hl[1] === h ? `1px solid ${c('tp', 0.85)}` : 'none',
                animation: `mnpop .4s ease-out ${(d * 24 + h) * 4}ms both`,
              }}
            />
          ))}
        </Fragment>
      ))}
    </div>
  );
}