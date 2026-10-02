/**
 * ------------------------------------------------------------------
 * Activity Bar (Topbar)
 * ------------------------------------------------------------------
 * Horizontal top bar for switching between Activity panel views
 * (File Explorer, Search, Source Control). Each tab icon is
 * color-coded using a hash of its ID mapped to the current accent
 * color palette.
 *
 * Main features:
 * - Horizontal tab bar with icon buttons
 * - Active tab gets a colored bottom border + background tint
 * - Color derived deterministically from tab ID via hash
 * - Uses global accent color palette from useAccentColors
 * - Height matches parent panel width for square aspect ratio
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { ReactNode } from 'react';

// ── Utils ──
import { $ } from '@renderer/utils/color';
import { cn } from '@renderer/shared/utils/cn';

// ── Hooks ──
import { useAccentColors } from '@renderer/shared/hooks/useAccentColors';

// ─── Interfaces ─────────────────────────────────────────────────────────
interface TabItem {
  id: string;
  icon: ReactNode;
  label: string;
}

/** Height matches ProjectPanel header (h-[44px]) */
const TOPBAR_HEIGHT = 44;

interface ActivityBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: TabItem[];
}

// ─── Color Helper ───────────────────────────────────────────────────────
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

// ─── Component ──────────────────────────────────────────────────────────
export function ActivityBar({ activeTab, onTabChange, tabs }: ActivityBarProps) {
  // ── Store ──
  const { accentColors, UNIFIED_ACCENT } = useAccentColors();

  if (typeof accentColors !== 'undefined' && accentColors.length > 0) {
    setAccentColorsForActivityBar(accentColors, UNIFIED_ACCENT);
  }

  // ── Render ──
  return (
    <div
      className="relative w-full shrink-0 bg-sidebar-background border-b border-border flex flex-row z-10 overflow-x-auto [&::-webkit-scrollbar]:h-0"
      style={{ height: TOPBAR_HEIGHT }}
    >
      <div className="flex flex-row gap-1 h-full px-2 items-center">
        {tabs.map((tab) => {
          const tabColor = getTabColor(tab.id);
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'relative p-1.5 rounded-md flex items-center justify-center transition-all duration-200',
                !isActive &&
                  'text-text-secondary hover:bg-sidebar-item-hover hover:text-text-primary',
                isActive && 'text-[--tab-color] bg-[--tab-color-bg]',
                'border-b-2 border-solid border-transparent',
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
              <div className="flex items-center justify-center shrink-0 w-3.5 h-3.5">
                {tab.icon}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
