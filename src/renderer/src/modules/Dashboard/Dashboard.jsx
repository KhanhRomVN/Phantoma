/* ═══════════════════════════════════════════════════════════════════════
   PHANTOMA · MISSION CONTROL
   Analytics-first dashboard cho 12 module (Archive · Chat · Code · Strike
   · Recon · Proxy · Profile · Monitor · Reverse · Fleet · AccountFarm
   · Scenario). Theme + atoms reuse từ Fleet.jsx.
   ═══════════════════════════════════════════════════════════════════════ */
import { Fragment, useId, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Boxes,
  ChevronRight,
  Clock,
  Code2,
  Database,
  Download,
  Eye,
  Filter,
  Fingerprint,
  Flame,
  Globe,
  Layers,
  MapPin,
  MessageSquare,
  Minus,
  Network,
  Radar,
  Radio,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Smartphone,
  Target,
  Terminal,
  Users,
  Workflow,
  Zap,
} from 'lucide-react';

/* ───────────────────────── Theme (Fleet.jsx) ───────────────────────── */
const T = {
  primary: 'rgb(139,109,255)',
  success: 'rgb(52,211,153)',
  error: 'rgb(244,63,94)',
  warn: 'rgb(251,191,36)',
  info: 'rgb(34,211,238)',
  pink: 'rgb(244,114,182)',
  blue: 'rgb(96,165,250)',
  orange: 'rgb(251,146,60)',
  bg: 'rgb(7,7,13)',
  panel: 'rgb(10,10,18)',
  card: 'rgb(15,15,26)',
  hover: 'rgb(23,23,40)',
  dropdown: 'rgb(17,17,29)',
  dropHover: 'rgb(26,26,45)',
  border: 'rgb(38,38,58)',
  text: 'rgb(244,244,251)',
  sub: 'rgb(154,154,184)',
  gray: 'rgb(106,106,140)',
};
const a = (c, o) => c.replace('rgb(', 'rgba(').replace(')', `,${o})`);
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

/* ───────────────────────── Helpers ───────────────────────── */
const clamp = (v, lo = 2, hi = 98) => Math.max(lo, Math.min(hi, v));
const seedOf = (s) => Array.from(String(s)).reduce((h, ch) => h + ch.charCodeAt(0), 0);
const heat = (v) => (v >= 85 ? T.error : v >= 65 ? T.warn : v >= 45 ? T.success : T.info);
const series = (seed, n = 24, base = 50, amp = 30) =>
  Array.from({ length: n }, (_, i) =>
    clamp(base + Math.sin(i * 0.7 + seed) * amp * 0.6 + Math.cos(i * 1.9 + seed * 2) * amp * 0.4),
  );
const trend = (seed, n = 30, base = 46, amp = 16, slope = 0.9) =>
  Array.from({ length: n }, (_, i) =>
    clamp(
      base +
        i * slope +
        Math.sin(i * 0.63 + seed) * amp * 0.55 +
        Math.cos(i * 1.71 + seed * 1.7) * amp * 0.3,
    ),
  );
const fmt = (n) => n.toLocaleString('en-US');

/* ───────────────────────── Atoms ───────────────────────── */
const Chip = ({ children, color = T.sub, ...p }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      borderRadius: 5,
      padding: '1px 5px',
      fontSize: 10.5,
      background: a(color, 0.12),
      color,
      whiteSpace: 'nowrap',
    }}
    {...p}
  >
    {children}
  </span>
);

function Bar({ v, w = 56, color }) {
  return (
    <div
      style={{ height: 4, borderRadius: 99, overflow: 'hidden', width: w, background: T.border }}
    >
      <div
        style={{ height: '100%', borderRadius: 99, width: `${v}%`, background: color || heat(v) }}
      />
    </div>
  );
}

function Spark({ data, color = T.primary, h = 30, w = 160, fill = true }) {
  const step = w / Math.max(1, data.length - 1);
  const pts = data.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / 100) * h).toFixed(1)}`);
  return (
    <svg
      width="100%"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ height: h, display: 'block' }}
    >
      {fill && <polygon points={`0,${h} ${pts.join(' ')} ${w},${h}`} fill={a(color, 0.13)} />}
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const MiniBars = ({ data, color = T.primary, h = 26, gap = 2 }) => {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap, height: h, width: '100%' }}>
      {data.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            minWidth: 1,
            borderRadius: 2,
            height: `${Math.max(9, (v / max) * 100)}%`,
            background: i === data.length - 1 ? color : a(color, 0.32),
          }}
        />
      ))}
    </div>
  );
};

const MiniStack = ({ parts, h = 7 }) => (
  <div
    style={{
      display: 'flex',
      height: h,
      borderRadius: 99,
      overflow: 'hidden',
      gap: 1,
      background: T.border,
    }}
  >
    {parts.map((p, i) => (
      <div key={i} style={{ flex: p.v, background: p.c, opacity: 0.85 }} />
    ))}
  </div>
);

const MiniDots = ({ on, total, color }) => (
  <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', height: 26, alignContent: 'center' }}>
    {Array.from({ length: total }).map((_, i) => (
      <span
        key={i}
        style={{
          width: 6,
          height: 6,
          borderRadius: 2,
          background: i < on ? color : a(color, 0.16),
        }}
      />
    ))}
  </div>
);

const Delta = ({ v, suffix = '%', invert = false, size = 10.5 }) => {
  const up = v > 0,
    flat = Math.abs(v) < 0.05;
  const good = invert ? v < 0 : v > 0;
  const c = flat ? T.gray : good ? T.success : T.error;
  const I = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        color: c,
        fontSize: size,
        whiteSpace: 'nowrap',
      }}
    >
      <I size={size + 1} />
      {Math.abs(v) % 1 === 0 ? Math.abs(v) : Math.abs(v).toFixed(1)}
      {suffix}
    </span>
  );
};

const IconBtn = ({ icon: I, title, onClick, color = T.sub, size = 28 }) => (
  <button
    title={title}
    onClick={onClick}
    style={{
      width: size,
      height: size,
      borderRadius: 7,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: a(color, 0.1),
      color,
      border: 'none',
    }}
  >
    <I size={14} />
  </button>
);

const Btn = ({ icon: I, children, primary, onClick, small, title }) => {
  const c = primary ? T.primary : T.text;
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        height: small ? 26 : 30,
        padding: children ? '0 10px' : '0 8px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        borderRadius: 8,
        fontSize: 11.5,
        cursor: 'pointer',
        border: 'none',
        background: primary ? a(c, 0.16) : T.hover,
        color: c,
      }}
    >
      {I && <I size={13} />}
      {children}
    </button>
  );
};

const Toggle = ({ on, onChange }) => (
  <button
    onClick={onChange}
    style={{
      position: 'relative',
      height: 16,
      width: 30,
      borderRadius: 99,
      cursor: 'pointer',
      border: 'none',
      background: on ? T.primary : T.border,
      padding: 0,
    }}
  >
    <span
      style={{
        position: 'absolute',
        top: 2,
        left: on ? 16 : 2,
        width: 12,
        height: 12,
        borderRadius: 99,
        background: '#fff',
        transition: 'left .15s',
      }}
    />
  </button>
);

const Card = ({ title, sub, icon: I, right, children, pad = true, accent = T.primary, style }) => (
  <div
    style={{
      background: T.card,
      borderRadius: 12,
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      overflow: 'hidden',
      ...style,
    }}
  >
    {(title || right) && (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '10px 12px 2px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          {I && <I size={14} style={{ color: accent, flexShrink: 0 }} />}
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 12.5,
                color: T.text,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {title}
            </div>
            {sub && (
              <div
                style={{
                  fontSize: 10,
                  color: T.gray,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {sub}
              </div>
            )}
          </div>
        </div>
        {right}
      </div>
    )}
    <div style={{ padding: pad ? '7px 12px 12px' : 0, flex: 1, minWidth: 0 }}>{children}</div>
  </div>
);

const Empty = ({ icon: I, text }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      padding: '18px 0',
      color: T.gray,
    }}
  >
    <I size={22} />
    <span style={{ fontSize: 12 }}>{text}</span>
  </div>
);

const SectionTitle = ({ children, hint, right }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 2px 8px' }}>
    <span style={{ fontSize: 10, letterSpacing: 1.7, textTransform: 'uppercase', color: T.gray }}>
      {children}
    </span>
    {hint && (
      <span style={{ fontSize: 10, color: a(T.gray, 0.75), whiteSpace: 'nowrap' }}>· {hint}</span>
    )}
    <div style={{ flex: 1, height: 1, background: T.border, opacity: 0.55 }} />
    {right}
  </div>
);

/* ───────────────────────── Charts ───────────────────────── */
function MultiLine({ list, height = 178, unit = '' }) {
  const [hi, setHi] = useState(null);
  const n = list[0].values.length;
  const vbW = 660,
    padL = 30,
    padR = 8,
    padT = 10,
    padB = 20;
  const vbH = height;
  const maxV = Math.max(...list.flatMap((s) => s.values)) * 1.18;
  const xp = (i) => padL + (i * (vbW - padL - padR)) / (n - 1);
  const yp = (v) => padT + (1 - v / maxV) * (vbH - padT - padB);
  const path = (vals) =>
    vals.map((v, i) => `${i ? 'L' : 'M'}${xp(i).toFixed(1)} ${yp(v).toFixed(1)}`).join(' ');
  const axis = [0, 0.25, 0.5, 0.75, 1];
  const dayLabel = (i) => (i === n - 1 ? 'now' : `-${n - 1 - i}d`);

  const move = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    setHi(Math.round(p * (n - 1)));
  };

  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${vbW} ${vbH}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height, display: 'block' }}
        onMouseMove={move}
        onMouseLeave={() => setHi(null)}
      >
        {axis.map((t, k) => {
          const y = yp(maxV * (1 - t));
          return (
            <g key={k}>
              <line
                x1={padL}
                x2={vbW - padR}
                y1={y}
                y2={y}
                stroke={a(T.border, 0.75)}
                strokeWidth="1"
                strokeDasharray={k === 4 ? '0' : '3 5'}
              />
              <text x={padL - 6} y={y + 3} textAnchor="end" fontSize="9" fill={T.gray}>
                {Math.round(maxV * (1 - t))}
                {unit}
              </text>
            </g>
          );
        })}
        {hi != null && (
          <line
            x1={xp(hi)}
            x2={xp(hi)}
            y1={padT}
            y2={vbH - padB}
            stroke={a(T.text, 0.28)}
            strokeWidth="1"
          />
        )}
        {list.map((s, k) => (
          <path
            key={k}
            d={path(s.values)}
            fill="none"
            stroke={s.color}
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={s.dash ? '4 4' : undefined}
          />
        ))}
        {hi != null &&
          list.map((s, k) => (
            <circle
              key={k}
              cx={xp(hi)}
              cy={yp(s.values[hi])}
              r="3"
              fill={T.bg}
              stroke={s.color}
              strokeWidth="2"
            />
          ))}
        {axis.map((t, k) => {
          const i = Math.round(t * (n - 1));
          return (
            <text
              key={k}
              x={xp(i)}
              y={vbH - 4}
              textAnchor={k === 0 ? 'start' : k === 4 ? 'end' : 'middle'}
              fontSize="9"
              fill={T.gray}
            >
              {dayLabel(i)}
            </text>
          );
        })}
      </svg>
      {hi != null && (
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: `${Math.min(88, Math.max(12, (xp(hi) / vbW) * 100))}%`,
            transform: 'translateX(-50%)',
            background: T.dropdown,
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            padding: '6px 8px',
            pointerEvents: 'none',
            zIndex: 4,
            minWidth: 116,
            boxShadow: '0 10px 26px rgba(0,0,0,.55)',
          }}
        >
          <div style={{ fontSize: 9.5, color: T.gray, marginBottom: 4 }}>{dayLabel(hi)}</div>
          {list.map((s) => (
            <div
              key={s.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 10.5,
                lineHeight: 1.6,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 2, background: s.color }} />
              <span style={{ color: T.sub, flex: 1 }}>{s.name}</span>
              <span style={{ color: T.text, fontFamily: MONO }}>{s.values[hi]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Donut({ items, size = 120, thickness = 13, center, sub, gap = 2 }) {
  const total = items.reduce((s, i) => s + i.v, 0) || 1;
  const R = size / 2 - thickness / 2 - 1;
  const C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={R}
          fill="none"
          stroke={a(T.border, 0.7)}
          strokeWidth={thickness}
        />
        {items.map((it, k) => {
          const len = (it.v / total) * C;
          const off = acc;
          acc += len;
          return (
            <circle
              key={k}
              cx={size / 2}
              cy={size / 2}
              r={R}
              fill="none"
              stroke={it.c}
              strokeWidth={thickness}
              strokeDasharray={`${Math.max(0.6, len - gap)} ${C}`}
              strokeDashoffset={-off}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      {(center || sub) && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0,
          }}
        >
          {center && (
            <span
              style={{
                fontSize: size > 70 ? 19 : 11,
                fontFamily: MONO,
                color: T.text,
                lineHeight: 1.1,
              }}
            >
              {center}
            </span>
          )}
          {sub && <span style={{ fontSize: 9, color: T.gray }}>{sub}</span>}
        </div>
      )}
    </div>
  );
}

function HealthRing({ value, size = 150 }) {
  const rawId = useId();
  const id = useMemo(() => 'hg' + rawId.replace(/:/g, ''), [rawId]);
  const r = size / 2 - 12,
    C = 2 * Math.PI * r,
    p = value / 100;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div
        style={{
          position: 'absolute',
          inset: -6,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(139,109,255,.16), rgba(34,211,238,.05) 55%, transparent 72%)',
        }}
      />
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)', display: 'block', position: 'relative' }}
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={T.primary} />
            <stop offset="100%" stopColor={T.info} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={a(T.border, 0.85)}
          strokeWidth="8"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${C * p} ${C}`}
          style={{ transition: 'stroke-dasharray .6s' }}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r - 13}
          fill="none"
          stroke={a(T.primary, 0.22)}
          strokeWidth="1"
          strokeDasharray="2 6"
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
        }}
      >
        <span
          style={{ fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', color: T.gray }}
        >
          Health
        </span>
        <span
          style={{
            fontSize: 29,
            fontFamily: MONO,
            color: T.text,
            lineHeight: 1,
            letterSpacing: -1,
          }}
        >
          {value}
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
            fontSize: 10,
            color: T.success,
          }}
        >
          <ArrowUpRight size={10} />
          +2.1 · 7d
        </span>
      </div>
    </div>
  );
}

function HeatGrid({ rows, data, colorBase = T.primary, cols = 24 }) {
  const max = Math.max(...data.flat()) || 1;
  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `26px repeat(${cols}, minmax(0,1fr))`,
          gap: 2,
        }}
      >
        {rows.map((r, ri) => (
          <Fragment key={ri}>
            <div style={{ fontSize: 9, color: T.gray, display: 'flex', alignItems: 'center' }}>
              {r}
            </div>
            {data[ri].map((v, ci) => (
              <div
                key={ci}
                title={`${r} · ${String(ci).padStart(2, '0')}h — ${v} events`}
                style={{
                  height: 13,
                  borderRadius: 2,
                  background:
                    v / max < 0.06 ? a(T.border, 0.55) : a(colorBase, 0.08 + 0.82 * (v / max)),
                }}
              />
            ))}
          </Fragment>
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 5,
          paddingLeft: 28,
          fontSize: 9,
          color: T.gray,
        }}
      >
        {[0, 6, 12, 18, 23].map((h) => (
          <span key={h}>{String(h).padStart(2, '0')}h</span>
        ))}
      </div>
    </div>
  );
}

function FunnelChart({ stages }) {
  const max = stages[0].v;
  const H = 30,
    vbW = 220,
    vbH = stages.length * H;
  const cx = vbW / 2;
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
      <div style={{ width: 84, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        {stages.map((s) => (
          <div
            key={s.label}
            style={{
              height: H,
              display: 'flex',
              alignItems: 'center',
              fontSize: 10.5,
              color: T.sub,
            }}
          >
            {s.label}
          </div>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${vbW} ${vbH}`}
        preserveAspectRatio="none"
        style={{ flex: 1, height: vbH, display: 'block' }}
      >
        {stages.map((s, i) => {
          const w1 = (s.v / max) * (vbW - 8);
          const w2 = ((stages[i + 1]?.v ?? s.v) / max) * (vbW - 8);
          const y0 = i * H + 1.5,
            y1 = i * H + H - 1.5;
          return (
            <polygon
              key={i}
              points={`${cx - w1 / 2},${y0} ${cx + w1 / 2},${y0} ${cx + w2 / 2},${y1} ${cx - w2 / 2},${y1}`}
              fill={a(s.c, 0.22)}
              stroke={a(s.c, 0.65)}
              strokeWidth="1"
            />
          );
        })}
      </svg>
      <div style={{ width: 78, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        {stages.map((s, i) => {
          const conv = i === 0 ? 100 : (s.v / stages[i - 1].v) * 100;
          return (
            <div
              key={s.label}
              style={{
                height: H,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'flex-end',
              }}
            >
              <span style={{ fontSize: 11.5, fontFamily: MONO, color: T.text }}>{fmt(s.v)}</span>
              <span style={{ fontSize: 9, color: conv < 30 ? T.error : T.gray }}>
                {conv.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScatterPlot({ pts, height = 148 }) {
  const W = 300,
    H = height,
    pad = 22;
  const x = (v) => pad + (v / 100) * (W - pad * 2);
  const y = (v) => H - pad - (v / 100) * (H - pad * 2);
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p.x, 0) / n;
  const my = pts.reduce((s, p) => s + p.y, 0) / n;
  const num = pts.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0);
  const den = pts.reduce((s, p) => s + (p.x - mx) ** 2, 0) || 1;
  const b = num / den;
  const c0 = my - b * mx;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height, display: 'block' }}
    >
      {[0, 25, 50, 75, 100].map((t) => (
        <g key={t}>
          <line
            x1={x(t)}
            x2={x(t)}
            y1={pad}
            y2={H - pad}
            stroke={a(T.border, 0.5)}
            strokeWidth="0.6"
          />
          <line
            x1={pad}
            x2={W - pad}
            y1={y(t)}
            y2={y(t)}
            stroke={a(T.border, 0.5)}
            strokeWidth="0.6"
          />
        </g>
      ))}
      <line
        x1={x(0)}
        y1={y(c0)}
        x2={x(100)}
        y2={y(c0 + b * 100)}
        stroke={a(T.info, 0.55)}
        strokeWidth="1.4"
        strokeDasharray="4 4"
      />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={x(p.x)} cy={y(p.y)} r={3 + p.r * 0.42} fill={a(p.c, 0.14)} />
          <circle cx={x(p.x)} cy={y(p.y)} r="2.6" fill={p.c} opacity="0.95" />
        </g>
      ))}
      <text x={W - pad} y={H - 5} textAnchor="end" fontSize="8.5" fill={T.gray}>
        proxy health →
      </text>
      <text x={4} y={pad - 6} fontSize="8.5" fill={T.gray}>
        ↑ success
      </text>
    </svg>
  );
}

function GeoMap({ nodes }) {
  const W = 360,
    H = 176;
  const LAND = [
    'M 15,30 L 32,20 L 58,19 L 86,17 L 106,21 L 126,38 L 116,46 L 108,51 L 104,58 L 100,64 L 88,60 L 84,68 L 96,80 L 80,70 L 72,62 L 62,54 L 50,48 L 36,40 L 22,36 Z',
    'M 120,21 L 138,18 L 148,25 L 142,34 L 128,32 Z',
    'M 100,80 L 116,78 L 132,80 L 145,88 L 142,97 L 132,105 L 126,113 L 120,123 L 114,133 L 110,145 L 104,136 L 106,124 L 102,110 L 98,96 L 96,86 Z',
    'M 164,62 L 168,54 L 180,52 L 194,56 L 206,58 L 216,62 L 224,72 L 231,79 L 226,88 L 220,100 L 214,112 L 206,120 L 198,116 L 192,106 L 186,98 L 178,92 L 172,82 L 166,72 Z',
    'M 170,54 L 176,48 L 180,44 L 186,42 L 192,36 L 198,30 L 206,26 L 212,22 L 214,30 L 208,38 L 202,44 L 196,50 L 188,52 L 180,54 L 174,56 Z',
    'M 214,34 L 226,28 L 240,24 L 258,22 L 274,20 L 292,18 L 310,20 L 326,24 L 340,28 L 348,34 L 352,42 L 340,48 L 332,54 L 326,60 L 318,66 L 306,70 L 296,74 L 288,80 L 280,84 L 272,80 L 262,76 L 252,72 L 244,72 L 240,64 L 232,60 L 224,56 L 218,46 Z',
    'M 294,102 L 312,100 L 330,104 L 336,114 L 332,124 L 320,130 L 306,126 L 296,118 L 292,110 Z',
    'M 316,52 L 320,50 L 322,56 L 318,60 Z',
    'M 169,42 L 174,40 L 176,46 L 171,48 Z',
  ];
  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {LAND.map((d, i) => (
          <path
            key={i}
            d={d}
            fill={a(T.primary, 0.07)}
            stroke={a(T.primary, 0.16)}
            strokeWidth="0.5"
          />
        ))}
        {[35, 65, 95, 125].map((yy) => (
          <line
            key={yy}
            x1="0"
            x2={W}
            y1={yy}
            y2={yy}
            stroke={a(T.border, 0.35)}
            strokeWidth="0.4"
          />
        ))}
        {nodes.map((nd, i) => {
          const cx = nd.lon + 180,
            cy = 90 - nd.lat;
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={3.4 + nd.v / 9} fill={a(nd.c, 0.13)} />
              <circle cx={cx} cy={cy} r={1.9} fill={nd.c} />
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        {[
          ['VN', 68, T.primary],
          ['SG', 14, T.info],
          ['JP', 18, T.info],
          ['US', 7, T.success],
          ['EU', 9, T.pink],
          ['Khác', 12, T.gray],
        ].map(([l, v, c]) => (
          <span
            key={l}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              fontSize: 9.5,
              color: T.sub,
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: 99, background: c }} />
            {l}
            <b style={{ color: T.text, fontFamily: MONO, fontWeight: 400 }}>{v}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── Mock data ───────────────────────── */
const KPIS = [
  {
    label: 'Findings',
    value: '1,284',
    unit: 'tổng',
    delta: 18.2,
    color: T.primary,
    spark: trend(3, 20, 38, 16, 1.5),
    note: '214 validated · 34 critical',
  },
  {
    label: 'Campaign active',
    value: '42',
    unit: 'chiến dịch',
    delta: 9.1,
    color: T.info,
    spark: trend(7, 20, 48, 13, 0.7),
    note: '18 chạy theo lịch',
  },
  {
    label: 'Accounts alive',
    value: '84.8',
    unit: '%',
    delta: -1.2,
    color: T.success,
    spark: trend(11, 20, 70, 9, -0.2),
    note: '412/486 · 20 challenge',
  },
  {
    label: 'Scenario success',
    value: '94.1',
    unit: '%',
    delta: 0.8,
    color: T.pink,
    spark: trend(5, 20, 72, 8, 0.3),
    note: '8,912 lần chạy / 7 ngày',
  },
  {
    label: 'Proxy healthy',
    value: '87.2',
    unit: '%',
    delta: -3.1,
    color: T.orange,
    spark: trend(9, 20, 62, 15, -0.6),
    note: '129/148 · 7 chết',
  },
  {
    label: 'Alerts open',
    value: '34',
    unit: 'cần xử lý',
    delta: 41,
    invert: true,
    color: T.error,
    spark: trend(2, 20, 38, 20, 1.2),
    note: '5 critical · 11 high',
  },
];

const PILLARS = [
  { name: 'Recon', v: 92, d: 3.1, c: T.success },
  { name: 'Strike', v: 78, d: -1.4, c: T.error },
  { name: 'Identity', v: 84, d: 0.9, c: T.pink },
  { name: 'Infra', v: 91, d: -2.7, c: T.orange },
  { name: 'Automation', v: 88, d: 4.2, c: T.info },
];

const MODULES = [
  {
    key: 'archive',
    name: 'Archive',
    icon: Database,
    color: T.primary,
    tag: 'Kho trung tâm',
    value: '12,482',
    unit: 'artifacts',
    delta: 12.4,
    viz: 'stack',
    stack: [
      { v: 34, c: T.primary },
      { v: 28, c: T.info },
      { v: 18, c: T.blue },
      { v: 12, c: T.orange },
      { v: 8, c: T.pink },
    ],
    chips: ['exploits 34%', 'payloads 28%'],
  },
  {
    key: 'chat',
    name: 'Chat',
    icon: MessageSquare,
    color: T.info,
    tag: 'Đa nền tảng',
    value: '8,912',
    unit: 'hội thoại',
    delta: 6.1,
    viz: 'bars',
    chips: ['214 chưa đọc', '5 nền tảng'],
  },
  {
    key: 'code',
    name: 'Code',
    icon: Code2,
    color: T.blue,
    tag: 'Workspace đa dự án',
    value: '14',
    unit: 'dự án',
    delta: 2,
    viz: 'area',
    chips: ['62 task mở', '8 agent'],
  },
  {
    key: 'strike',
    name: 'Strike',
    icon: Zap,
    color: T.error,
    tag: 'HTTP(S) engine',
    value: '1,284',
    unit: 'findings',
    delta: 18.2,
    viz: 'bars',
    chips: ['42 campaign', '3.4k req/s'],
  },
  {
    key: 'recon',
    name: 'Recon',
    icon: Radar,
    color: T.success,
    tag: 'AI trinh sát',
    value: '1,208',
    unit: 'nguồn',
    delta: 9.6,
    viz: 'area',
    chips: ['96 ops', '342 báo cáo'],
  },
  {
    key: 'proxy',
    name: 'Proxy',
    icon: Network,
    color: T.orange,
    tag: 'Pool dùng chung',
    value: '129',
    unit: '/148 sống',
    delta: -3.1,
    viz: 'ring',
    ring: 87,
    chips: ['12 chậm', '7 chết'],
  },
  {
    key: 'profile',
    name: 'Profile',
    icon: Fingerprint,
    color: T.pink,
    tag: 'Định danh & tài khoản',
    value: '412',
    unit: '/486 sống',
    delta: -1.2,
    viz: 'ring',
    ring: 85,
    chips: ['48 dormant', '20 challenge'],
  },
  {
    key: 'monitor',
    name: 'Monitor',
    icon: Eye,
    color: T.warn,
    tag: 'Theo dõi liên tục',
    value: '1,842',
    unit: 'event/24h',
    delta: 14.7,
    viz: 'bars',
    chips: ['76 monitor', '34 cảnh báo'],
  },
  {
    key: 'reverse',
    name: 'Reverse',
    icon: Boxes,
    color: T.blue,
    tag: 'Dịch ngược app & game',
    value: '64',
    unit: 'app · 18 game',
    delta: 4,
    viz: 'bars',
    chips: ['1,124 asset', '9 secret'],
  },
  {
    key: 'fleet',
    name: 'Fleet',
    icon: Smartphone,
    color: T.success,
    tag: 'Thiết bị từ xa',
    value: '132',
    unit: '/148 online',
    delta: 0.8,
    viz: 'dots',
    onDots: 22,
    chips: ['76 mobile', '42 desktop'],
  },
  {
    key: 'farm',
    name: 'AccountFarm',
    icon: Users,
    color: T.primary,
    tag: 'Nuôi tài khoản',
    value: '68',
    unit: 'đang warm-up',
    delta: -5.4,
    viz: 'area',
    chips: ['412 sống', '12 khóa/tuần'],
  },
  {
    key: 'scenario',
    name: 'Scenario',
    icon: Workflow,
    color: T.info,
    tag: 'Kịch bản có lịch',
    value: '94.1',
    unit: '% thành công',
    delta: 0.8,
    viz: 'area',
    chips: ['8,912 run', '3 đang chạy'],
  },
];

const THROUGHPUT = [
  { name: 'Strike', color: T.primary, values: trend(5, 24, 40, 14, 0.9) },
  { name: 'Recon', color: T.success, values: trend(9, 24, 30, 11, 0.5) },
  { name: 'Monitor', color: T.warn, values: trend(3, 24, 22, 9, 0.3) },
  { name: 'Scenario', color: T.info, values: trend(7, 24, 34, 12, 1.1) },
  { name: 'Baseline', color: T.gray, values: trend(1, 24, 36, 6, 0.35), dash: true },
];

const FUNNEL = [
  { label: 'Targets', v: 1284, c: T.primary },
  { label: 'Scanned', v: 962, c: T.blue },
  { label: 'Exposed', v: 318, c: T.info },
  { label: 'Exploitable', v: 104, c: T.warn },
  { label: 'Validated', v: 41, c: T.success },
];

const HEAT_ROWS = ['Strike', 'Recon', 'Monitor', 'Scenario', 'Chat', 'Fleet'];
const HEAT_DATA = HEAT_ROWS.map((r, ri) => {
  const sd = seedOf(r);
  return Array.from({ length: 24 }, (_, h) => {
    const peak = 9 + ((sd + ri * 3) % 5); // giờ cao điểm
    const active = 1 - Math.min(1, Math.abs(h - peak) / 9); // gần peak → cao
    return Math.round(2 + active * 60 * (0.55 + ((sd + h * 7) % 11) / 22));
  });
});

const PROXY_COHORT = { VN: 68, SG: 14, JP: 18, US: 4, DE: 5, Khác: 8 };

const SCATTER = [
  { x: 94, y: 96, r: 16, c: T.success },
  { x: 91, y: 93, r: 14, c: T.success },
  { x: 88, y: 91, r: 12, c: T.info },
  { x: 86, y: 88, r: 11, c: T.info },
  { x: 82, y: 90, r: 13, c: T.success },
  { x: 79, y: 84, r: 9, c: T.info },
  { x: 73, y: 81, r: 8, c: T.blue },
  { x: 68, y: 78, r: 9, c: T.blue },
  { x: 64, y: 74, r: 7, c: T.blue },
  { x: 58, y: 68, r: 8, c: T.orange },
  { x: 54, y: 71, r: 6, c: T.blue },
  { x: 49, y: 63, r: 7, c: T.orange },
  { x: 42, y: 58, r: 6, c: T.orange },
  { x: 36, y: 62, r: 5, c: T.orange },
  { x: 31, y: 49, r: 6, c: T.warn },
  { x: 24, y: 44, r: 5, c: T.warn },
  { x: 18, y: 38, r: 6, c: T.error },
  { x: 12, y: 31, r: 4, c: T.error },
  { x: 68, y: 52, r: 5, c: T.warn },
  { x: 44, y: 78, r: 5, c: T.success },
  { x: 90, y: 41, r: 4, c: T.error },
  { x: 62, y: 35, r: 4, c: T.warn },
];

const GEO = [
  { lat: 52, lon: -62, v: 9, c: T.pink },
  { lat: 48, lon: 22, v: 14, c: T.info },
  { lat: 56, lon: 38, v: 11, c: T.info },
  { lat: 26, lon: -12, v: 7, c: T.primary },
  { lat: 22, lon: 12, v: 12, c: T.orange },
  { lat: 8, lon: 66, v: 9, c: T.success },
  { lat: 32, lon: 98, v: 22, c: T.primary },
  { lat: 24, lon: 112, v: 17, c: T.primary },
  { lat: -6, lon: 108, v: 12, c: T.info },
  { lat: 36, lon: 138, v: 10, c: T.pink },
  { lat: 34, lon: -118, v: 6, c: T.success },
  { lat: 40, lon: -74, v: 5, c: T.blue },
];

const ARCHIVE_KINDS = [
  { label: 'Exploit', v: 384, c: T.primary },
  { label: 'Payload', v: 412, c: T.info },
  { label: 'Wordlist', v: 186, c: T.blue },
  { label: 'Template', v: 148, c: T.orange },
  { label: 'PoC CVE', v: 96, c: T.pink },
  { label: 'Script', v: 58, c: T.success },
];

const CHAT_MIX = [
  { label: 'Messenger', v: 38, c: T.blue },
  { label: 'Telegram', v: 27, c: T.info },
  { label: 'WhatsApp', v: 19, c: T.success },
  { label: 'Zalo', v: 11, c: T.primary },
  { label: 'Discord', v: 5, c: T.pink },
];

const SCENARIOS = [
  {
    name: 'Warm-up Facebook',
    dev: 'Pixel 7 · A01',
    pct: 62,
    state: 'running',
    dur: '11m 20s',
    acc: T.success,
  },
  {
    name: 'Scan Binance balance',
    dev: 'MacBook Air · M01',
    pct: 38,
    state: 'running',
    dur: '1m 48s',
    acc: T.success,
  },
  {
    name: 'Shopee order sync',
    dev: 'iPhone 13 · I01',
    pct: 81,
    state: 'queued',
    dur: '3m 02s',
    acc: T.warn,
  },
  {
    name: 'Check Ads Manager',
    dev: 'Mini PC · W01',
    pct: 14,
    state: 'running',
    dur: '0m 44s',
    acc: T.success,
  },
  {
    name: 'SEO keyword push',
    dev: 'Galaxy S23 · A02',
    pct: 100,
    state: 'done',
    dur: '20m 09s',
    acc: T.success,
  },
];

const ACCOUNT_SERIES = [
  { name: 'Alive', color: T.success, values: trend(4, 20, 62, 8, 0.3) },
  { name: 'Challenge', color: T.warn, values: trend(8, 20, 18, 6, -0.1) },
  { name: 'Dead', color: T.error, values: trend(12, 20, 8, 5, -0.15) },
];

const PROXY_HEALTH = [
  { name: 'Residential', ok: 46, bad: 2 },
  { name: '4G/5G', ok: 22, bad: 1 },
  { name: 'VPN', ok: 8, bad: 2 },
  { name: 'Datacenter', ok: 2, bad: 3 },
];

const SERVICES = [
  { name: 'Code API', ok: 100, d: 0.2 },
  { name: 'Strike engine', ok: 99.4, d: -0.1 },
  { name: 'Archive FS', ok: 100, d: 0 },
  { name: 'Chat gateway', ok: 97.8, d: 0.4 },
  { name: 'Recon workers', ok: 96.1, d: -1.3 },
  { name: 'Backlog queue', ok: 91.5, d: 2.2 },
];

const ANOMALY = [
  {
    module: 'Strike',
    t: '22:14',
    sev: 'critical',
    text: 'Tỷ lệ 5xx tăng vọt trên campaign CVE-2024-3400 khi proxy JP bị rotate',
  },
  {
    module: 'Proxy',
    t: '21:48',
    sev: 'high',
    text: '7 proxy datacenter SG chết liên tiếp trong 6 phút → latency tăng 3.2x',
  },
  {
    module: 'Profile',
    t: '20:02',
    sev: 'high',
    text: '20 profile bị checkpoint cùng lúc — cùng dải fingerprint',
  },
  {
    module: 'AccountFarm',
    t: '18:37',
    sev: 'warn',
    text: 'Tỷ lệ khóa tài khoản tuần này 12 — gấp đôi baseline',
  },
  {
    module: 'Scenario',
    t: '17:51',
    sev: 'info',
    text: 'Warm-up Facebook giảm detect 42% sau khi giãn delay',
  },
];

const CORRELATION = [
  { label: 'Proxy health ↔ acc alive', v: 0.82, c: T.success },
  { label: 'Scenario success ↔ acc alive', v: 0.76, c: T.success },
  { label: 'Findings ↔ campaign activity', v: 0.64, c: T.info },
  { label: 'Reverse assets ↔ PoC', v: 0.48, c: T.warn },
  { label: 'Chat volume ↔ monitor alert', v: 0.31, c: T.orange },
];

const TICKER = [
  {
    icon: Target,
    c: T.primary,
    text: 'Strike hoàn tất campaign CVE-2024-3400 · +41 findings validated',
  },
  { icon: RefreshCw, c: T.info, text: 'Proxy pool tự xoay 12 proxy · latency trung bình 64ms' },
  { icon: Bell, c: T.warn, text: 'Monitor phát hiện 3 bài viết mới trên forum về leak API key' },
  {
    icon: Database,
    c: T.primary,
    text: 'Archive sync 186 payload từ exploit update · index rebuilt',
  },
  { icon: Workflow, c: T.pink, text: 'Scenario lên lịch 42 warm-up trong khung 08:00–10:00' },
  { icon: Globe, c: T.success, text: 'Fleet: 132/148 thiết bị online · 2 VPS đang maintenance' },
];

const SEV = {
  critical: { label: 'Critical', c: T.error },
  high: { label: 'High', c: T.warn },
  warn: { label: 'Warning', c: T.orange },
  info: { label: 'Info', c: T.info },
};

/* ───────────────────────── Main ───────────────────────── */
export default function PhantomaDashboard() {
  const [range, setRange] = useState('7d');
  const [burst, setBurst] = useState(true);
  const [hoverMod, setHoverMod] = useState(null);
  const [hoverGeo, setHoverGeo] = useState(null);

  const live = Math.round(1284 + (burst ? 96 : 42));
  const health = 87;

  /* ticker shuffled for freshness */
  const ticker = useMemo(() => [...TICKER], []);

  return (
    <div
      style={{
        height: '100vh',
        overflow: 'auto',
        background: T.bg,
        color: T.text,
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        padding: 12,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: 1880, margin: '0 auto' }}>
        {/* ═══ HEADER ═══ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            flexWrap: 'wrap',
            marginBottom: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div
              style={{
                position: 'relative',
                width: 38,
                height: 38,
                borderRadius: 10,
                background: a(T.primary, 0.16),
                color: T.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Radar size={19} />
              <span
                style={{
                  position: 'absolute',
                  top: -3,
                  right: -3,
                  width: 9,
                  height: 9,
                  borderRadius: 99,
                  background: T.success,
                  boxShadow: `0 0 0 2px ${T.bg}`,
                }}
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 17, lineHeight: 1.15 }}>Phantoma</span>
                <span
                  style={{
                    fontSize: 10.5,
                    letterSpacing: 1.4,
                    textTransform: 'uppercase',
                    color: T.primary,
                  }}
                >
                  Mission Control
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: T.sub }}>
                Toàn cảnh 12 module · analytics-first · cập nhật 8s trước
              </div>
            </div>
          </div>

          <div style={{ flex: 1 }} />

          {/* Live ticker strip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: T.card,
              borderRadius: 9,
              padding: '4px 9px',
              minWidth: 260,
              maxWidth: 520,
              overflow: 'hidden',
              flex: '1 1 260px',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 9.5,
                letterSpacing: 1.2,
                color: T.error,
                flexShrink: 0,
                textTransform: 'uppercase',
              }}
            >
              <span style={{ position: 'relative', display: 'flex', width: 6, height: 6 }}>
                <span
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 99,
                    background: T.error,
                    opacity: 0.55,
                    animation: 'phPing 1.6s ease-out infinite',
                  }}
                />
                <span
                  style={{
                    position: 'relative',
                    width: 6,
                    height: 6,
                    borderRadius: 99,
                    background: T.error,
                  }}
                />
              </span>
              Live
            </span>
            <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  gap: 26,
                  width: 'max-content',
                  animation: 'phTicker 44s linear infinite',
                  animationPlayState: burst ? 'running' : 'paused',
                }}
              >
                {[...ticker, ...ticker].map((tk, i) => {
                  const I = tk.icon;
                  return (
                    <span
                      key={i}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 11,
                        color: T.sub,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <I size={12} style={{ color: tk.c, flexShrink: 0 }} />
                      {tk.text}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                background: T.card,
                borderRadius: 9,
                padding: 2,
              }}
            >
              {['24h', '7d', '30d'].map((rg) => (
                <button
                  key={rg}
                  onClick={() => setRange(rg)}
                  style={{
                    height: 24,
                    padding: '0 9px',
                    borderRadius: 7,
                    fontSize: 11,
                    cursor: 'pointer',
                    border: 'none',
                    background: range === rg ? a(T.primary, 0.18) : 'transparent',
                    color: range === rg ? T.primary : T.sub,
                  }}
                >
                  {rg}
                </button>
              ))}
            </div>
            <Toggle on={burst} onChange={() => setBurst((b) => !b)} />
            <span style={{ fontSize: 10.5, color: burst ? T.sub : T.gray }}>realtime</span>
            <IconBtn icon={RefreshCw} title="Làm mới" color={T.info} />
            <IconBtn icon={Download} title="Xuất báo cáo" />
            <IconBtn icon={Settings} title="Cấu hình dashboard" />
          </div>
        </div>

        {/* ═══ KPI STRIP ═══ */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(172px, 1fr))',
            gap: 8,
          }}
        >
          {KPIS.map((k) => (
            <div
              key={k.label}
              style={{
                background: T.card,
                borderRadius: 11,
                padding: '8px 10px 6px',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                borderTop: `2px solid ${a(k.color, 0.55)}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 10.5,
                    color: T.sub,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {k.label}
                </span>
                <Delta v={k.delta} invert={k.invert} />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span
                  style={{
                    fontSize: 21,
                    fontFamily: MONO,
                    color: T.text,
                    lineHeight: 1.05,
                    letterSpacing: -0.6,
                  }}
                >
                  {k.value}
                </span>
                <span style={{ fontSize: 9.5, color: T.gray }}>{k.unit}</span>
              </div>
              <div style={{ marginBottom: 1 }}>
                <Spark data={k.spark} color={k.color} h={23} />
              </div>
              <div
                style={{
                  fontSize: 9.5,
                  color: T.gray,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {k.note}
              </div>
            </div>
          ))}
        </div>

        {/* ═══ MAIN GRID ═══ */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: 8,
            marginTop: 8,
          }}
        >
          {/* Health hero */}
          <Card
            title="System health"
            sub="Composite 12 module · 7 ngày"
            icon={Shield}
            accent={T.primary}
            style={{ gridColumn: 'span 1' }}
            right={<Chip color={T.success}>ổn định</Chip>}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <HealthRing value={health} size={132} />
              <div
                style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}
              >
                {PILLARS.map((p) => (
                  <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 54, fontSize: 10.5, color: T.sub }}>{p.name}</span>
                    <div style={{ flex: 1 }}>
                      <Bar v={p.v} w="100%" color={p.c} />
                    </div>
                    <span
                      style={{
                        width: 24,
                        fontSize: 10.5,
                        fontFamily: MONO,
                        color: T.text,
                        textAlign: 'right',
                      }}
                    >
                      {p.v}
                    </span>
                    <Delta v={p.d} size={9} />
                  </div>
                ))}
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0,1fr))',
                gap: 6,
                marginTop: 9,
              }}
            >
              {[
                ['Uptime', '99.97%', T.success],
                ['MTTD', '4m 12s', T.info],
                ['MTTR', '38m', T.warn],
              ].map(([l, v, c]) => (
                <div key={l} style={{ background: T.panel, borderRadius: 8, padding: '5px 7px' }}>
                  <div style={{ fontSize: 9, color: T.gray }}>{l}</div>
                  <div style={{ fontSize: 13, fontFamily: MONO, color: c }}>{v}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Throughput chart */}
          <Card
            title="Throughput theo module"
            sub={`${range === '24h' ? 'Tổng sự kiện 24 giờ' : range === '30d' ? 'Tổng sự kiện 30 ngày' : 'Tổng sự kiện 7 ngày'} · event/hour`}
            icon={Activity}
            accent={T.info}
            style={{ gridColumn: 'span 1' }}
            right={
              <div
                style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}
              >
                {THROUGHPUT.map((s) => (
                  <span
                    key={s.name}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      fontSize: 9.5,
                      color: T.sub,
                    }}
                  >
                    <span style={{ width: 7, height: 2, borderRadius: 99, background: s.color }} />
                    {s.name}
                  </span>
                ))}
              </div>
            }
          >
            <MultiLine list={THROUGHPUT} height={168} />
          </Card>

          {/* Anomaly feed */}
          <Card
            title="Anomaly signals"
            sub="Ưu tiên theo mức độ · phát hiện tự động"
            icon={AlertTriangle}
            accent={T.error}
            style={{ gridColumn: 'span 1' }}
            right={
              <Btn icon={Filter} small>
                Lọc
              </Btn>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {ANOMALY.map((an, i) => {
                const sv = SEV[an.sev],
                  c = sv.c;
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 7,
                      padding: '6px 6px',
                      borderRadius: 7,
                    }}
                  >
                    <span
                      style={{
                        width: 3,
                        alignSelf: 'stretch',
                        borderRadius: 99,
                        background: c,
                        flexShrink: 0,
                        minHeight: 22,
                      }}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}
                      >
                        <Chip color={c}>{sv.label}</Chip>
                        <span style={{ fontSize: 9.5, color: T.gray }}>
                          {an.module} · {an.t}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: T.text, marginTop: 2, lineHeight: 1.35 }}>
                        {an.text}
                      </div>
                    </div>
                    <ChevronRight
                      size={12}
                      style={{ color: T.gray, marginTop: 6, flexShrink: 0 }}
                    />
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* ═══ SECTION: MODULE CONSTELLATION ═══ */}
        <SectionTitle
          hint="12 module · góc nhìn phân tích, không phải danh sách"
          right={
            <span style={{ fontSize: 10.5, color: T.gray }}>
              <span style={{ color: T.success }}>▲</span> delta vs{' '}
              {range === '24h' ? 'hôm qua' : range === '30d' ? '30 ngày trước' : 'tuần trước'}
            </span>
          }
        >
          Module signals
        </SectionTitle>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(206px, 1fr))',
            gap: 8,
          }}
        >
          {MODULES.map((m) => {
            const I = m.icon,
              on = hoverMod === m.key;
            return (
              <div
                key={m.key}
                onMouseEnter={() => setHoverMod(m.key)}
                onMouseLeave={() => setHoverMod(null)}
                style={{
                  background: on ? T.hover : T.card,
                  borderRadius: 11,
                  padding: '8px 10px 9px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5,
                  cursor: 'pointer',
                  transition: 'background .15s',
                  border: `1px solid ${on ? a(m.color, 0.36) : 'transparent'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 7,
                      background: a(m.color, 0.14),
                      color: m.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <I size={14} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: T.text,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {m.name}
                    </div>
                    <div
                      style={{
                        fontSize: 9.5,
                        color: T.gray,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {m.tag}
                    </div>
                  </div>
                  <Delta
                    v={m.delta}
                    size={9}
                    invert={['proxy', 'profile', 'farm'].includes(m.key)}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span
                    style={{ fontSize: 17, fontFamily: MONO, color: T.text, letterSpacing: -0.4 }}
                  >
                    {m.value}
                  </span>
                  <span style={{ fontSize: 9.5, color: T.gray }}>{m.unit}</span>
                </div>

                {m.viz === 'area' && (
                  <Spark data={trend(seedOf(m.key), 18, 30, 13, 0.8)} color={m.color} h={26} />
                )}
                {m.viz === 'bars' && (
                  <MiniBars data={series(seedOf(m.key), 14, 45, 34)} color={m.color} h={26} />
                )}
                {m.viz === 'stack' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <MiniStack parts={m.stack} h={7} />
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 9,
                        color: T.gray,
                      }}
                    >
                      <span>
                        {m.stack[0].v}% {ARCHIVE_KINDS[0].label.toLowerCase()}
                      </span>
                      <span>6 loại</span>
                    </div>
                  </div>
                )}
                {m.viz === 'ring' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MiniDots
                      on={m.onDots ?? Math.round((m.ring / 100) * 28)}
                      total={28}
                      color={m.color}
                    />
                    <span style={{ fontSize: 10.5, fontFamily: MONO, color: heat(m.ring) }}>
                      {m.ring}%
                    </span>
                  </div>
                )}
                {m.viz === 'dots' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MiniDots on={m.onDots ?? 22} total={24} color={m.color} />
                    <span style={{ fontSize: 10.5, fontFamily: MONO, color: T.success }}>132</span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {m.chips.map((ch) => (
                    <Chip key={ch} color={m.color}>
                      {ch}
                    </Chip>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* ═══ SECTION: DEEP DIVES ═══ */}
        <SectionTitle hint="drill-down signal: tương quan, phân bố, funnel">
          Deep analysis
        </SectionTitle>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 8,
          }}
        >
          {/* Funnel */}
          <Card
            title="Strike kill-chain funnel"
            sub="1,284 targets → 41 validated · 7 ngày"
            icon={Zap}
            accent={T.error}
            right={<Chip color={T.error}>conv 3.2%</Chip>}
          >
            <FunnelChart stages={FUNNEL} />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0,1fr))',
                gap: 6,
                marginTop: 8,
              }}
            >
              {[
                ['Top WAF', 'Cloudflare', T.orange],
                ['Top CVE', 'CVE-2024-3400', T.error],
                ['Tỷ lệ PoC', '38.4%', T.success],
              ].map(([l, v, c]) => (
                <div
                  key={l}
                  style={{ background: T.panel, borderRadius: 8, padding: '5px 7px', minWidth: 0 }}
                >
                  <div style={{ fontSize: 9, color: T.gray }}>{l}</div>
                  <div
                    style={{
                      fontSize: 10.5,
                      color: c,
                      fontFamily: MONO,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {v}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Heatmap */}
          <Card
            title="Activity heatmap"
            sub="event density theo module × giờ · 24h"
            icon={Flame}
            accent={T.warn}
            right={<Chip color={T.warn}>peak 09h–11h</Chip>}
          >
            <HeatGrid rows={HEAT_ROWS} data={HEAT_DATA} cols={24} colorBase={T.primary} />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 4,
                marginTop: 8,
                fontSize: 9,
                color: T.gray,
              }}
            >
              <span>low</span>
              {[0.08, 0.24, 0.42, 0.62, 0.86].map((o, k) => (
                <span
                  key={k}
                  style={{ width: 13, height: 9, borderRadius: 2, background: a(T.primary, o) }}
                />
              ))}
              <span>high</span>
            </div>
          </Card>

          {/* Scatter correlation */}
          <Card
            title="Proxy health ↔ scenario success"
            sub="148 proxy · r = 0.71 (Spearman)"
            icon={Target}
            accent={T.info}
            right={<Chip color={T.info}>r = 0.71</Chip>}
          >
            <ScatterPlot pts={SCATTER} height={150} />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 5,
                fontSize: 9.5,
                color: T.gray,
              }}
            >
              <span>mỗi điểm = 1 proxy · kích thước = traffic</span>
              <span style={{ color: T.info }}>↗ xu hướng dương</span>
            </div>
          </Card>
        </div>

        {/* ═══ SECONDARY ROW ═══ */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 8,
            marginTop: 8,
          }}
        >
          {/* Account health */}
          <Card
            title="Account health"
            sub="Profile + AccountFarm · cohort 30 ngày"
            icon={Users}
            accent={T.primary}
            right={<Delta v={-1.2} invert />}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Donut
                size={96}
                thickness={11}
                center="84.8%"
                sub="alive"
                items={[
                  { v: 412, c: T.success },
                  { v: 48, c: T.warn },
                  { v: 26, c: T.error },
                ]}
              />
              <div
                style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}
              >
                {[
                  ['Alive', 412, T.success],
                  ['Dormant', 48, T.warn],
                  ['Dead', 26, T.error],
                ].map(([l, v, c]) => (
                  <div
                    key={l}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5 }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: 99, background: c }} />
                    <span style={{ color: T.sub, flex: 1 }}>{l}</span>
                    <span style={{ color: T.text, fontFamily: MONO }}>{v}</span>
                  </div>
                ))}
                <div style={{ fontSize: 9.5, color: T.gray, marginTop: 2 }}>
                  warm-up: 68 · khóa 12/tuần
                </div>
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              <MultiLine list={ACCOUNT_SERIES} height={96} />
            </div>
          </Card>

          {/* Proxy health */}
          <Card
            title="Proxy pool health"
            sub="148 proxy · 4 loại"
            icon={Network}
            accent={T.orange}
            right={<Delta v={-3.1} invert />}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {PROXY_HEALTH.map((p) => {
                const total = p.ok + p.bad,
                  pct = (p.ok / total) * 100;
                return (
                  <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 64, fontSize: 10.5, color: T.sub }}>{p.name}</span>
                    <div style={{ flex: 1 }}>
                      <MiniStack
                        h={7}
                        parts={[
                          { v: p.ok, c: T.success },
                          { v: p.bad, c: T.error },
                        ]}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontFamily: MONO,
                        color: pct < 80 ? T.warn : T.success,
                        width: 34,
                        textAlign: 'right',
                      }}
                    >
                      {pct.toFixed(0)}%
                    </span>
                    <span style={{ fontSize: 9.5, color: T.gray, width: 26, textAlign: 'right' }}>
                      {p.ok}/{total}
                    </span>
                  </div>
                );
              })}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0,1fr))',
                gap: 6,
                marginTop: 9,
              }}
            >
              {[
                ['Latency', '64ms', T.success],
                ['Chết 24h', '7', T.error],
                ['Rotation', '12', T.info],
              ].map(([l, v, c]) => (
                <div key={l} style={{ background: T.panel, borderRadius: 8, padding: '4px 7px' }}>
                  <div style={{ fontSize: 9, color: T.gray }}>{l}</div>
                  <div style={{ fontSize: 12.5, fontFamily: MONO, color: c }}>{v}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Archive distribution */}
          <Card
            title="Archive composition"
            sub="12,482 artifacts · tag taxonomy"
            icon={Database}
            accent={T.blue}
            right={<Delta v={12.4} />}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Donut
                size={96}
                thickness={11}
                center="12.4k"
                sub="artifacts"
                items={ARCHIVE_KINDS.map((x) => ({ v: x.v, c: x.c }))}
              />
              <div
                style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}
              >
                {ARCHIVE_KINDS.map((x) => (
                  <div
                    key={x.label}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5 }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: 2, background: x.c }} />
                    <span
                      style={{
                        color: T.sub,
                        flex: 1,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {x.label}
                    </span>
                    <span style={{ color: T.text, fontFamily: MONO }}>{x.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Chat + Monitor */}
          <Card
            title="Chat & Monitor pulse"
            sub="hội thoại vs cảnh báo · 24h"
            icon={MessageSquare}
            accent={T.info}
            right={<Chip color={T.info}>8,912 msg</Chip>}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Donut
                size={76}
                thickness={10}
                center="8.9k"
                sub="messages"
                items={CHAT_MIX.map((x) => ({ v: x.v, c: x.c }))}
              />
              <div
                style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}
              >
                {CHAT_MIX.map((x) => (
                  <div
                    key={x.label}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10 }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: 2, background: x.c }} />
                    <span style={{ color: T.sub, flex: 1 }}>{x.label}</span>
                    <span style={{ color: T.text, fontFamily: MONO }}>{x.v}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div
              style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 6 }}
            >
              {[
                ['Chưa đọc', '214', T.warn],
                ['Auto-reply', '73%', T.success],
                ['Monitor alert', '34', T.error],
              ].map(([l, v, c]) => (
                <div key={l} style={{ background: T.panel, borderRadius: 8, padding: '4px 7px' }}>
                  <div style={{ fontSize: 9, color: T.gray }}>{l}</div>
                  <div style={{ fontSize: 12, fontFamily: MONO, color: c }}>{v}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ═══ THIRD ROW ═══ */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 8,
            marginTop: 8,
          }}
        >
          {/* Geo */}
          <Card
            title="Geographic distribution"
            sub="148 proxy & 132 thiết bị online"
            icon={Globe}
            accent={T.primary}
            style={{ gridColumn: 'span 1' }}
          >
            <GeoMap nodes={GEO} />
          </Card>

          {/* Scenario live runs */}
          <Card
            title="Scenario runs"
            sub="kịch bản đang/đã chạy · live"
            icon={Workflow}
            accent={T.pink}
            right={
              <div style={{ display: 'flex', gap: 4 }}>
                <Chip color={T.success}>3 running</Chip>
                <Chip color={T.warn}>queued</Chip>
              </div>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {SCENARIOS.map((s) => (
                <div key={s.name} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: T.text,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {s.name}
                    </span>
                    <span style={{ fontSize: 10, fontFamily: MONO, color: s.acc, flexShrink: 0 }}>
                      {s.dur}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ flex: 1 }}>
                      <Bar v={s.pct} w="100%" color={s.acc} />
                    </div>
                    <span style={{ fontSize: 9.5, color: T.gray, width: 40, textAlign: 'right' }}>
                      {s.pct}%
                    </span>
                  </div>
                  <div style={{ fontSize: 9.5, color: T.gray }}>{s.dev}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Correlation mosaic */}
          <Card
            title="Cross-module correlation"
            sub="|ρ| trên 30 ngày · cường độ liên hệ"
            icon={Network}
            accent={T.info}
            right={<Chip color={T.info}>5 cặp</Chip>}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {CORRELATION.map((c) => (
                <div key={c.label} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10.5,
                        color: T.sub,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {c.label}
                    </span>
                    <span style={{ fontSize: 10.5, fontFamily: MONO, color: c.c, flexShrink: 0 }}>
                      {c.v.toFixed(2)}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 4,
                      borderRadius: 99,
                      background: T.border,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${c.v * 100}%`,
                        height: '100%',
                        background: c.c,
                        borderRadius: 99,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Services */}
          <Card
            title="Service SLO"
            sub="100% = uptime 7 ngày"
            icon={Shield}
            accent={T.success}
            right={<Chip color={T.success}>ổn định</Chip>}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {SERVICES.map((s) => (
                <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      width: 88,
                      fontSize: 10.5,
                      color: T.sub,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {s.name}
                  </span>
                  <div style={{ flex: 1 }}>
                    <Bar
                      v={s.ok}
                      w="100%"
                      color={s.ok >= 99 ? T.success : s.ok >= 96 ? T.warn : T.error}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontFamily: MONO,
                      color: T.text,
                      width: 40,
                      textAlign: 'right',
                    }}
                  >
                    {s.ok}%
                  </span>
                  <Delta v={s.d} size={9} invert />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ═══ FOOTER STRIP ═══ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 12,
            flexWrap: 'wrap',
            background: T.card,
            borderRadius: 10,
            padding: '8px 12px',
            fontSize: 10.5,
            color: T.sub,
          }}
        >
          <span style={{ color: T.gray }}>Phantoma Mission Control</span>
          <span>·</span>
          <span>
            <b style={{ color: T.text, fontFamily: MONO }}>{live.toLocaleString('en-US')}</b> live
            events/sec
          </span>
          <span>·</span>
          <span>
            <b style={{ color: T.text, fontFamily: MONO }}>148</b> proxy ·{' '}
            <b style={{ color: T.text, fontFamily: MONO }}>132</b> devices ·{' '}
            <b style={{ color: T.text, fontFamily: MONO }}>412</b> accounts
          </span>
          <div style={{ flex: 1 }} />
          <span>
            <Clock
              size={11}
              style={{ display: 'inline-block', marginRight: 3, verticalAlign: '-1px' }}
            />
            Cập nhật 8s trước
          </span>
          <span>·</span>
          <span style={{ color: T.success }}>● All systems nominal</span>
        </div>

        <div style={{ height: 6 }} />
      </div>

      <style>{`
        @keyframes phTicker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes phPing { 0% { transform: scale(.6); opacity: .8; } 100% { transform: scale(2.6); opacity: 0; } }

        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: ${T.bg}; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 99px; }
        ::-webkit-scrollbar-thumb:hover { background: rgb(56, 56, 82); }
        ::-webkit-scrollbar-corner { background: ${T.bg}; }

        ::selection { background: ${a(T.primary, 0.3)}; color: ${T.text}; }
        :focus-visible { outline: 2px solid ${a(T.primary, 0.5)}; outline-offset: 2px; border-radius: 6px; }

        select option { background: ${T.dropdown}; color: ${T.text}; }
        button, input, select, textarea { font-family: inherit; }
        input::placeholder { color: ${T.gray}; }

        .ph-ticker-wrap:hover div[style*="animation"] { animation-play-state: paused !important; }

        @media (max-width: 680px) { .ph-ticker-wrap { display: none; } }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation: none !important; transition: none !important; }
        }
      `}</style>
    </div>
  );
}
