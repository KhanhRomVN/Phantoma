import React from 'react';

interface GroupSectionProps {
  icon: React.ReactNode;
  color: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

const toSoftBg = (hex: string, alpha = 0.15): string => {
  const raw = hex.replace('#', '');
  if (raw.length !== 6) return `rgba(128,128,128,${alpha})`;
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const GroupSection: React.FC<GroupSectionProps> = ({
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
          <span className="text-sm font-semibold text-text-primary tracking-wide">
            {title}
          </span>
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

export default GroupSection;