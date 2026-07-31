import { ReactNode } from 'react';
import { $ } from '@renderer/utils/color';
import { cn } from '@renderer/shared/lib/utils';
import { useAccentColors } from '@renderer/shared/hooks/useAccentColors';

interface TabItem {
  id: string;
  icon: ReactNode;
  label: string;
}

interface ActivityBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: TabItem[];
}

// ─── Color Helper ──────────────────────────────────────────────────────────
let accentColorsCache: string[] = ['rgb(54, 134, 255)'];
let unifiedAccentCache = 'rgb(54, 134, 255)';

const setAccentColorsForActivityBar = (colors: string[], unified: string) => {
  accentColorsCache = colors.length > 0 ? colors : [unified];
  unifiedAccentCache = unified;
};

const getTabColor = (tabId: string) => {
  let hash = 0;
  for (let i = 0; i < tabId.length; i++) {
    hash = tabId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % accentColorsCache.length;
  const color = accentColorsCache[index] || accentColorsCache[0] || unifiedAccentCache;

  const rgbMatch = color.match(/\d+/g);
  if (rgbMatch && rgbMatch.length >= 3) {
    const r = rgbMatch[0];
    const g = rgbMatch[1];
    const b = rgbMatch[2];
    return {
      base: color,
      bg: `rgba(${r}, ${g}, ${b}, 0.1)`,
      border: `rgba(${r}, ${g}, ${b}, 0.3)`,
      hover: `rgba(${r}, ${g}, ${b}, 0.2)`,
    };
  }
  return {
    base: color || unifiedAccentCache,
    bg: $('--sidebar-item-hover'),
    border: $('--divider'),
    hover: $('--sidebar-item-hover'),
  };
};

// ─── ActivityBar ─────────────────────────────────────────────────────────────
export function ActivityBar({ activeTab, onTabChange, tabs }: ActivityBarProps) {
  const { accentColors, UNIFIED_ACCENT } = useAccentColors();

  if (typeof accentColors !== 'undefined' && accentColors.length > 0) {
    setAccentColorsForActivityBar(accentColors, UNIFIED_ACCENT);
  }

  return (
    <div className="relative h-full w-12 shrink-0 bg-sidebar-background border-r border-border flex flex-col z-10 overflow-y-auto [&::-webkit-scrollbar]:w-0">
      <div className="flex flex-col gap-1 w-full py-2 items-center">
        {tabs.map((tab) => {
          const tabColor = getTabColor(tab.id);
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'relative w-9 h-9 px-0 rounded-md justify-center mx-auto transition-all duration-200',
                !isActive &&
                  'text-text-secondary hover:bg-sidebar-item-hover hover:text-text-primary',
                isActive && 'text-[--tab-color] bg-[--tab-color-bg]',
                'border-l-2 border-solid border-transparent',
              )}
              style={
                isActive
                  ? ({
                      '--tab-color': tabColor?.base || $('--text-primary'),
                      '--tab-color-bg': tabColor?.bg || 'rgba(54,134,255,0.1)',
                    } as React.CSSProperties)
                  : undefined
              }
              title={tab.label}
            >
              <div className="flex items-center justify-center shrink-0 w-4 h-4">{tab.icon}</div>
              {isActive && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] rounded-r"
                  style={{
                    height: '50%',
                    backgroundColor: tabColor?.base || $('--text-primary'),
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
