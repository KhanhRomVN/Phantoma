import React from 'react';
import { Check, Moon, Sun } from 'lucide-react';
import type { ThemeConfig } from '../../../../theme/theme-loader';
import { toRgb } from './themeColor';

interface ThemeCardProps {
  theme: ThemeConfig;
  selected: boolean;
  preview?: boolean;
  onSelect: (theme: ThemeConfig) => void;
}

const ACCENTS = ['blue', 'green', 'purple', 'pink', 'teal', 'yellow'] as const;

const Bar: React.FC<{ color: string; w: string; o?: number }> = ({ color, w, o = 1 }) => (
  <span className="block h-1 rounded-full" style={{ background: color, width: w, opacity: o }} />
);

const ThemeCard: React.FC<ThemeCardProps> = ({ theme, selected, preview, onSelect }) => {
  const c = (key: string) => toRgb((theme.tailwind as unknown as Record<string, string>)[key]);
  const primary = c('primary');
  const line = c('border');
  const TypeIcon = theme.type === 'dark' ? Moon : Sun;

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(theme)}
      className="group relative flex flex-col overflow-hidden rounded-xl text-left outline-none transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: c('background'),
        border: `1px solid ${selected ? primary : line}`,
        boxShadow: selected ? `0 0 0 2px ${primary}55` : undefined,
      }}
    >
      <div className="relative flex h-[84px]">
        <div
          className="flex w-[22%] flex-col gap-1.5 p-2"
          style={{ background: c('panelBackground'), borderRight: `1px solid ${line}` }}
        >
          <span className="h-2 w-2 rounded-sm" style={{ background: primary }} />
          <Bar color={c('textSecondary')} w="80%" o={0.4} />
          <Bar color={c('textSecondary')} w="60%" o={0.4} />
          <Bar color={c('textSecondary')} w="70%" o={0.4} />
        </div>
        <div className="flex flex-1 flex-col gap-2 p-2.5">
          <div className="flex flex-col gap-1">
            <Bar color={c('textPrimary')} w="45%" />
            <Bar color={c('textSecondary')} w="70%" o={0.5} />
          </div>
          <div className="flex gap-1.5">
            {(['blue', 'green', 'purple', 'pink'] as const).map((k) => (
              <span
                key={k}
                className="h-5 flex-1 rounded-md"
                style={{ background: `${c(k)}33`, border: `1px solid ${c(k)}66` }}
              />
            ))}
          </div>
          <div className="flex gap-1.5">
            <span className="h-2.5 w-9 rounded-full" style={{ background: primary }} />
            <span
              className="h-2.5 w-9 rounded-full"
              style={{ background: c('cardBackground'), border: `1px solid ${line}` }}
            />
          </div>
        </div>
      </div>

      <div className="flex h-1.5">
        {[primary, ...ACCENTS.map((k) => c(k))].map((color, i) => (
          <span key={`${color}-${i}`} className="h-full flex-1" style={{ background: color }} />
        ))}
      </div>

      <div
        className="flex items-center justify-between gap-2 px-3 py-2.5"
        style={{ background: c('cardBackground'), borderTop: `1px solid ${line}` }}
      >
        <div className="min-w-0">
          <div className="truncate text-[12.5px] font-semibold" style={{ color: c('textPrimary') }}>
            {theme.name}
          </div>
          <div
            className="mt-0.5 flex items-center gap-1 text-[10.5px] uppercase tracking-wider"
            style={{ color: c('textSecondary') }}
          >
            <TypeIcon className="h-3 w-3" />
            {theme.type}
            {preview && <span style={{ color: primary }}>· preview</span>}
          </div>
        </div>
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white transition-all duration-200"
          style={{
            background: primary,
            opacity: selected ? 1 : 0,
            transform: selected ? 'scale(1)' : 'scale(0.5)',
          }}
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      </div>
    </button>
  );
};

export default ThemeCard;