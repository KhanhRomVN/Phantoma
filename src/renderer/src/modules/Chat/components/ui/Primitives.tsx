import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { AV_TONES, PLATFORMS, TONE } from '../../constants';
import type { PlatformId, TipSide, Tone } from '../../types';
import { favicon } from '../../utils';

interface TipProps {
  text: string;
  children: ReactNode;
  side?: TipSide;
}

export function Tip({ text, children, side = 'bottom' }: TipProps) {
  const [open, setOpen] = useState(false);
  const pos: CSSProperties =
    side === 'right'
      ? { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 8 }
      : side === 'top'
        ? { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6 }
        : { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 6 };
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          className="absolute z-50 whitespace-nowrap pointer-events-none text-[11px] px-2 py-1 rounded-md bg-tooltip-background text-text-primary border border-border shadow-lg"
          style={pos}
        >
          {text}
        </span>
      )}
    </span>
  );
}

interface PillProps {
  tone?: Tone;
  icon?: LucideIcon;
  children: ReactNode;
  solid?: boolean;
  className?: string;
}

export function Pill({
  tone = 'primary',
  icon: Icon,
  children,
  solid = false,
  className = '',
}: PillProps) {
  const t = TONE[tone];
  const look = solid
    ? `${t.bg} text-background border-transparent`
    : `${t.soft} ${t.text} ${t.line}`;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 h-[18px] text-[10px] font-medium whitespace-nowrap border ${look} ${className}`}
    >
      {Icon && <Icon size={10} />}
      {children}
    </span>
  );
}

interface IconBtnProps {
  icon: LucideIcon;
  tip: string;
  onClick?: () => void;
  active?: boolean;
  tone?: Tone;
  size?: number;
  side?: TipSide;
  badge?: boolean;
}

export function IconBtn({
  icon: Icon,
  tip,
  onClick,
  active,
  tone = 'primary',
  size = 15,
  side,
  badge,
}: IconBtnProps) {
  const t = TONE[tone];
  const look = active
    ? `${t.text} ${t.soft} ${t.line}`
    : 'text-text-secondary bg-transparent border-transparent';
  return (
    <Tip text={tip} side={side}>
      <button
        onClick={onClick}
        className={`ch-hv2 relative flex items-center justify-center rounded-md w-7 h-7 border ${look}`}
      >
        <Icon size={size} />
        {badge && <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${t.bg}`} />}
      </button>
    </Tip>
  );
}

interface ToggleProps {
  on: boolean;
  onChange: (v: boolean) => void;
  tone?: Tone;
}

export function Toggle({ on, onChange, tone = 'primary' }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative rounded-full shrink-0 ${on ? TONE[tone].bg : 'bg-border'}`}
      style={{ width: 28, height: 16 }}
    >
      <span
        className="absolute top-[2px] rounded-full bg-text-foreground"
        style={{ width: 12, height: 12, left: on ? 14 : 2, transition: 'left .15s' }}
      />
    </button>
  );
}

interface ThinProps {
  value: number;
  tone: Tone;
  h?: number;
}

export function Thin({ value, tone, h = 3 }: ThinProps) {
  return (
    <div className="w-full rounded-full overflow-hidden bg-border" style={{ height: h }}>
      <div className={`h-full rounded-full ${TONE[tone].bg}`} style={{ width: `${value}%` }} />
    </div>
  );
}

interface AvatarProps {
  name: string;
  size?: number;
  ring?: Tone;
}

export function Avatar({ name, size = 34, ring }: AvatarProps) {
  const clean = name.replace(/[#@]/g, '');
  const t = TONE[AV_TONES[clean.charCodeAt(0) % AV_TONES.length]];
  const ringCls = ring ? `ring-1 ring-offset-2 ring-offset-panel-background ${TONE[ring].ring}` : '';
  return (
    <div
      className={`shrink-0 rounded-full flex items-center justify-center font-semibold border ${t.text} ${t.soft} ${t.line} ${ringCls}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {clean.charAt(0).toUpperCase()}
    </div>
  );
}

interface LogoProps {
  platform: PlatformId;
  size?: number;
}

export function Logo({ platform, size = 16 }: LogoProps) {
  return (
    <img
      src={favicon(PLATFORMS[platform].domain)}
      alt={PLATFORMS[platform].label}
      width={size}
      height={size}
      className="rounded-[4px] shrink-0 bg-text-foreground"
    />
  );
}