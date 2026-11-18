import { ChevronRight, Inbox, Zap } from 'lucide-react';
import type { Bell } from 'lucide-react';
import type { CSSProperties } from 'react';
import { PRI_LABEL, PRI_TONE, SRC_META } from '../../../constants/meta';
import type { Priority, SourceType } from '../../../types/monitor.types';
import { c, tc } from '../../../utils/color';
import { IconBox, Pill } from '../../common/Primitives';

export function SystemCard({
  icon: Icon,
  tone,
  text,
  cta,
  onClick,
}: {
  icon: typeof Bell;
  tone: string;
  text: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <div
      className="card card-pop"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 10,
        background: `linear-gradient(90deg, ${tc(tone, 0.1)}, transparent 70%), ${c('card')}`,
        border: `1px dashed ${tc(tone, 0.3)}`,
      }}
    >
      <IconBox icon={Icon} tone={tone} size={26} />
      <span style={{ flex: 1, minWidth: 0 }}>{text}</span>
      <button className="soft" style={{ height: 26 }} onClick={onClick}>
        {cta}
        <ChevronRight size={12} />
      </button>
    </div>
  );
}

export function EmptyArt({
  title,
  sub,
  actions,
}: {
  title: string;
  sub: string;
  actions: { label: string; icon: typeof Bell; run: () => void }[];
}) {
  const dots = ['primary', 'info', 'warn'];
  return (
    <div
      className="card noise"
      style={{
        padding: '36px 20px 28px',
        textAlign: 'center',
        overflow: 'hidden',
        borderRadius: 14,
        background: `radial-gradient(80% 90% at 50% 0%, ${c('primary', 0.16)}, transparent 70%), ${c('card')}`,
      }}
    >
      <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 14px' }}>
        {[0, 1, 2].map((k) => (
          <span
            key={k}
            style={{
              position: 'absolute',
              inset: k * 18,
              borderRadius: '50%',
              border: `1px dashed ${c('ts', 0.34 - k * 0.07)}`,
              animation: `mnorbit ${14 + k * 6}s linear infinite ${k % 2 ? 'reverse' : 'normal'}`,
            }}
          >
            <i
              style={{
                position: 'absolute',
                top: -3,
                left: '50%',
                width: 6,
                height: 6,
                borderRadius: 6,
                background: tc(dots[k]),
                boxShadow: `0 0 10px ${tc(dots[k])}`,
              }}
            />
          </span>
        ))}
        <span
          style={{
            position: 'absolute',
            inset: 42,
            borderRadius: '50%',
            background: c('primary', 0.16),
            color: c('primary'),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'mnbreathe 3.4s ease-in-out infinite',
          }}
        >
          <Inbox size={20} />
        </span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
      <div className="sub" style={{ margin: '4px auto 16px', maxWidth: 320, lineHeight: 1.5 }}>
        {sub}
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
        {actions.map((a) => (
          <button key={a.label} className="soft" onClick={a.run}>
            <a.icon size={13} />
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PlatformBadge({ type }: { type: SourceType }) {
  return <span style={{ fontSize: 11, fontWeight: 500, color: c('ts') }}>{SRC_META[type].label}</span>;
}

export function PriorityPill({ p }: { p: Priority }) {
  return (
    <Pill tone={PRI_TONE[p]} dot={false}>
      <Zap size={11} />
      Priority: {PRI_LABEL[p]}
    </Pill>
  );
}

export function TagChip({
  name,
  on,
  count,
  onClick,
}: {
  name: string;
  on?: boolean;
  count?: number;
  onClick?: () => void;
}) {
  return (
    <button
      className={`chip ${on ? 'on' : ''}`}
      style={on ? { background: c('primary', 0.15), color: c('primary') } : { padding: '2px 8px', fontSize: 11 }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      #{name}
      {count !== undefined && <span style={{ opacity: 0.6 }}>{count}</span>}
    </button>
  );
}


export function CheckDraw() {
  return (
    <span aria-hidden style={{ position: 'absolute', right: 56, top: 10, width: 30, height: 30, pointerEvents: 'none' }}>
      <span
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: `2px solid ${c('warn')}`,
          animation: 'mnringout .9s ease-out forwards',
        }}
      />
      <svg width="30" height="30" viewBox="0 0 30 30">
        <circle cx="15" cy="15" r="13" style={{ fill: c('warn', 0.15), stroke: c('warn') }} strokeWidth="1.5" />
        <path
          d="M9 15.5 L13.5 20 L21.5 11"
          fill="none"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={
            {
              stroke: c('warn'),
              strokeDasharray: 40,
              animation: 'mndraw .5s ease-out .15s both',
              ['--len' as string]: 40,
            } as CSSProperties
          }
        />
      </svg>
    </span>
  );
}