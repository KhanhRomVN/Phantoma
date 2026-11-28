/**
 * ------------------------------------------------------------------
 * SettingsSection
 * ------------------------------------------------------------------
 * UI nhóm cài đặt (header + body) dùng chung cho các tab Settings,
 * kèm style input/chevron dùng chung của General.
 * ------------------------------------------------------------------
 */

import React from 'react';

export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: '13px',
  backgroundColor: 'rgb(var(--input-background))',
  border: '1px solid rgb(var(--border))',
  borderRadius: '8px',
  color: 'rgb(var(--text-primary))',
  outline: 'none',
  boxSizing: 'border-box',
  height: '34px',
};

export const ChevronDownIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

interface SettingsSectionProps {
  icon: React.ReactNode;
  color: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

const toSoftBg = (color: string, alpha = 0.15): string => {
  const raw = color.replace('#', '');
  if (color.startsWith('#') && /^[0-9a-fA-F]{6}$/.test(raw)) {
    const r = parseInt(raw.slice(0, 2), 16);
    const g = parseInt(raw.slice(2, 4), 16);
    const b = parseInt(raw.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  // Không phải hex 6 ký tự (rgb(), hsl(), var(), ...) → để CSS tự pha màu
  return `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`;
};

const SettingsSection: React.FC<SettingsSectionProps> = ({
  icon,
  color,
  title,
  description,
  action,
  children,
}) => {
  return (
    <section className="flex flex-col gap-3.5">
      {/* Header */}
      <div className="flex items-start gap-2.5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: toSoftBg(color), color }}
        >
          {icon}
        </div>
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span className="text-sm font-semibold text-text-primary tracking-wide">{title}</span>
          {description && (
            <span className="text-xs text-text-secondary opacity-75 leading-snug">
              {description}
            </span>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {/* Body */}
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
};

export default SettingsSection;
