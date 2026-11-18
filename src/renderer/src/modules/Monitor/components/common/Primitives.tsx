import { useState } from 'react';
import type { ReactNode } from 'react';
import type { Bell } from 'lucide-react';
import { X } from 'lucide-react';
import { c, tc } from '../../utils/color';

export function Avatar({ name, hue, size = 30 }: { name: string; hue: number; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: Math.max(6, size * 0.25),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        color: '#fff',
        fontSize: size * 0.4,
        background: `linear-gradient(135deg, hsl(${hue} 65% 52%), hsl(${(hue + 40) % 360} 60% 40%))`,
      }}
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </div>
  );
}

export function Pill({
  tone = 'muted',
  dot = true,
  children,
}: {
  tone?: string;
  dot?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        whiteSpace: 'nowrap',
        borderRadius: 6,
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 500,
        background: tc(tone, 0.1),
        color: tc(tone),
      }}
    >
      {dot && <span style={{ width: 6, height: 6, borderRadius: 9, background: tc(tone) }} />}
      {children}
    </span>
  );
}

export const StatusPill = ({
  map,
  k,
}: {
  map: Record<string, [string, string, ...string[]]>;
  k: string;
}) => <Pill tone={map[k][1]}>{map[k][0]}</Pill>;

export function IconBox({
  icon: Icon,
  tone = 'muted',
  size = 28,
}: {
  icon: typeof Bell;
  tone?: string;
  size?: number;
}) {
  return (
    <span
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: tc(tone, 0.1),
        color: tc(tone),
      }}
    >
      <Icon size={size * 0.5} />
    </span>
  );
}

export function Section({
  title,
  icon,
  tone = 'muted',
  action,
  children,
}: {
  title: string;
  icon?: typeof Bell;
  tone?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="sec">
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
          {icon && <IconBox icon={icon} tone={tone} size={24} />}
          {title}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export const InfoRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="row">
    <span className="sub">{label}</span>
    <span style={{ textAlign: 'right' }}>{children}</span>
  </div>
);

export const Empty = ({ text }: { text: string }) => (
  <div className="sub" style={{ padding: '24px 0', textAlign: 'center' }}>
    {text}
  </div>
);

export function CopyText({
  value,
  mono,
  children,
}: {
  value: string;
  mono?: boolean;
  children?: ReactNode;
}) {
  const [done, setDone] = useState(false);
  return (
    <button
      className={`tr ${mono ? 'mono' : ''}`}
      title="Click to copy"
      style={{ color: done ? c('success') : undefined }}
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(value).catch(() => undefined);
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
    >
      {children ?? value}
    </button>
  );
}

export function Modal({
  title,
  onClose,
  children,
  footer,
  width = 440,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        background: 'rgba(4,4,9,.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width,
          maxWidth: '94vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: c('card'),
          border: `1px solid ${c('border')}`,
          borderRadius: 14,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            borderBottom: `1px solid ${c('border')}`,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {title}
          <button className="ico" style={{ width: 24, height: 24 }} onClick={onClose}>
            <X size={14} />
          </button>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {children}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '0 16px 16px' }}>
          <button className="soft" onClick={onClose}>
            Close
          </button>
          {footer}
        </div>
      </div>
    </div>
  );
}