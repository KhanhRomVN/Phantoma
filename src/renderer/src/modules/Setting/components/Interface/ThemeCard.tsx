import React from 'react';
import { Check, Moon, Sun } from 'lucide-react';
import type { ThemeConfig } from '../../../../theme/theme-loader';
import { toRgb } from './themeColor';

interface ThemeCardProps {
  theme: ThemeConfig;
  selected: boolean;
  onSelect: (theme: ThemeConfig) => void;
}

const Line: React.FC<{ color: string; width: string; opacity?: number }> = ({
  color,
  width,
  opacity = 1,
}) => (
  <span
    className="block h-1.5 rounded-full"
    style={{ background: color, width, opacity }}
  />
);

const ThemeCard: React.FC<ThemeCardProps> = ({ theme, selected, onSelect }) => {
  const c = (key: keyof ThemeConfig['tailwind']) => toRgb(theme.tailwind[key]);
  const border = `1px solid ${c('border')}`;
  const TypeIcon = theme.type === 'dark' ? Moon : Sun;

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(theme)}
      className={`group relative text-left rounded-2xl border p-2.5 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        selected
          ? 'border-primary ring-2 ring-primary/40 bg-primary/5 shadow-lg'
          : 'border-border bg-card-background hover:border-primary/60'
      }`}
    >
      <div
        className="relative overflow-hidden rounded-xl transition-transform duration-300 group-hover:scale-[1.015]"
        style={{ background: c('background'), border }}
      >
        <div
          className="flex h-5 items-center gap-1 px-2"
          style={{ background: c('sidebarBackground'), borderBottom: border }}
        >
          {(['red', 'yellow', 'green'] as const).map((k) => (
            <span key={k} className="h-1.5 w-1.5 rounded-full" style={{ background: c(k) }} />
          ))}
          <span className="ml-2">
            <Line color={c('textSecondary')} width="40px" opacity={0.4} />
          </span>
        </div>

        <div className="flex h-24">
          <div
            className="w-1/4 space-y-1.5 p-2"
            style={{ background: c('sidebarBackground'), borderRight: border }}
          >
            <Line color={c('primary')} width="100%" />
            <Line color={c('textSecondary')} width="75%" opacity={0.35} />
            <Line color={c('textSecondary')} width="60%" opacity={0.35} />
            <Line color={c('textSecondary')} width="85%" opacity={0.35} />
          </div>

          <div className="flex-1 space-y-2 p-2.5">
            <div className="space-y-1.5">
              <Line color={c('textPrimary')} width="50%" />
              <Line color={c('textSecondary')} width="75%" opacity={0.5} />
            </div>
            <div
              className="space-y-1.5 rounded-md p-2"
              style={{ background: c('cardBackground'), border }}
            >
              <Line color={c('blue')} width="45%" />
              <Line color={c('green')} width="65%" />
              <Line color={c('purple')} width="35%" />
              <div className="flex gap-1.5 pt-1">
                <span
                  className="h-2.5 w-8 rounded-full"
                  style={{ background: c('buttonSolidBackground') }}
                />
                <span
                  className="h-2.5 w-8 rounded-full"
                  style={{ background: c('buttonSoftBackground'), border }}
                />
              </div>
            </div>
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(120% 80% at 100% 0%, ${c('primary')}22, transparent 60%)`,
          }}
        />
      </div>

      <div className="flex items-center justify-between gap-3 px-1.5 pb-1 pt-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold tracking-tight text-text-primary">
            {theme.name}
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-[11px] uppercase tracking-wider text-text-secondary">
            <TypeIcon className="h-3 w-3" />
            {theme.type}
          </div>
        </div>
        <div className="flex shrink-0 -space-x-1.5">
          {[c('primary'), ...(theme.accentColors || []).slice(0, 4)].map((color, i) => (
            <span
              key={`${color}-${i}`}
              className="h-4 w-4 rounded-full border-2 border-card-background"
              style={{ background: color }}
            />
          ))}
        </div>
      </div>

      <span
        className={`absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white shadow-md transition-all duration-300 ${
          selected ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
        }`}
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
    </button>
  );
};

export default ThemeCard;