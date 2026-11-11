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

// ── UI ──
import { ChevronsRight, ChevronsLeft } from 'lucide-react';
import Tooltip from '@renderer/components/ui/Tooltip/Tooltip';

// ── Utils ──
import { $ } from '@renderer/utils/color';
import { cn } from '@renderer/utils/cn';

// ── Hooks ──
import { useAccentColors } from '@renderer/hooks/useAccentColors';
import { useDebugStore } from '../../stores/useDebugStore';

// ─── Interfaces ─────────────────────────────────────────────────────────
interface TabItem {
  id: string;
  icon: ReactNode;
  label: string;
  busy?: boolean;
}

/** Height matches ProjectPanel header (h-[44px]) */
const TOPBAR_HEIGHT = 44;

interface ActivityBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: TabItem[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  hideCollapseButton?: boolean;
  collapseEnabled?: boolean;
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
export function ActivityBar({ activeTab, onTabChange, tabs, collapsed = false, onToggleCollapse, hideCollapseButton = false, collapseEnabled = false }: ActivityBarProps) {
  // ── Store ──
  const { accentColors, UNIFIED_ACCENT } = useAccentColors();
  const debugBusy = useDebugStore((s) => s.status !== 'idle');

  if (typeof accentColors !== 'undefined' && accentColors.length > 0) {
    setAccentColorsForActivityBar(accentColors, UNIFIED_ACCENT);
  }

  // ── Render (collapsed rail: expand icon on top, vertical icon list below) ──
  if (collapsed) {
    return (
      <div className="flex-1 min-h-0 w-full bg-sidebar-background flex flex-col items-center z-10 overflow-y-auto [&::-webkit-scrollbar]:w-0">
        <div
          className="flex w-full shrink-0 items-center justify-center border-b border-border"
          style={{ height: TOPBAR_HEIGHT }}
        >
          <Tooltip content="Expand panel" side="left" sideOffset={4}>
            <button
              onClick={onToggleCollapse}
              className="flex h-7 w-7 items-center justify-center rounded-md text-[--tab-color] bg-[--tab-color-bg] transition-colors"
              style={
                {
                  '--tab-color': getTabColor('collapse').base,
                  '--tab-color-bg': getTabColor('collapse').bg,
                } as React.CSSProperties
              }
              aria-pressed={true}
              aria-label="Expand panel"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>
        <div className="flex flex-col items-center gap-1 py-2">
          {tabs.map((tab) => {
            const tabColor = getTabColor(tab.id);
            const isActive = activeTab === tab.id;
            const busy = !!tab.busy || (tab.id === 'debug' && debugBusy);

            return (
              <Tooltip key={tab.id} content={tab.label} side="left" sideOffset={4}>
                <button
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-0 outline-none transition-all duration-200',
                    !isActive &&
                      !busy &&
                      'text-text-secondary hover:bg-sidebar-item-hover hover:text-text-primary',
                    isActive && 'text-[--tab-color] bg-[--tab-color-bg]',
                  )}
                  style={
                    isActive || busy
                      ? ({
                          '--tab-color': tabColor?.base || $('--text-primary'),
                          '--tab-color-bg': tabColor?.bg || 'rgba(54,134,255,0.1)',
                          ...(busy ? { color: '#34d399' } : {}),
                        } as React.CSSProperties)
                      : undefined
                  }
                >
                  <div className="flex h-3.5 w-3.5 items-center justify-center">{tab.icon}</div>
                </button>
              </Tooltip>
            );
          })}
        </div>
      </div>
    );
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
          const busy = !!tab.busy || (tab.id === 'debug' && debugBusy);

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'relative p-1.5 rounded-md flex items-center justify-center gap-1.5 shrink-0 border-0 outline-none focus:outline-none focus-visible:outline-none transition-all duration-200',
                !isActive &&
                  !busy &&
                  'text-text-secondary hover:bg-sidebar-item-hover hover:text-text-primary',
                isActive && 'px-2.5 text-[--tab-color] bg-[--tab-color-bg]',
              )}
              style={
                isActive || busy
                  ? ({
                      '--tab-color': tabColor?.base || $('--text-primary'),
                      '--tab-color-bg': tabColor?.bg || 'rgba(54,134,255,0.1)',
                      ...(busy ? { color: '#34d399' } : {}),
                    } as React.CSSProperties)
                  : undefined
              }
            >
              <Tooltip content={tab.label} side="bottom" sideOffset={4}>
                <div className="flex items-center justify-center gap-1.5">
              {busy && !isActive && (
                <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
                  <rect
                    x="0.75"
                    y="0.75"
                    rx="6"
                    ry="6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    style={{ width: 'calc(100% - 1.5px)', height: 'calc(100% - 1.5px)' }}
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="0"
                      to="-14"
                      dur="0.8s"
                      repeatCount="indefinite"
                    />
                  </rect>
                </svg>
              )}
              <div className="flex items-center justify-center shrink-0 w-3.5 h-3.5">
                {tab.icon}
              </div>
              {isActive && (
                <span className="text-xs font-semibold leading-none whitespace-nowrap">
                  {tab.label}
                </span>
              )}
                </div>
              </Tooltip>
            </button>
          );
        })}
      </div>
      {!hideCollapseButton && onToggleCollapse && (
        <div className="ml-auto flex items-center pr-2">
          <Tooltip content={collapsed ? 'Expand panel' : 'Collapse panel'} side="bottom" sideOffset={4}>
            <button
              onClick={onToggleCollapse}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                collapseEnabled
                  ? 'text-[--tab-color] bg-[--tab-color-bg]'
                  : 'text-text-secondary hover:bg-sidebar-item-hover hover:text-text-primary',
              )}
              style={
                collapseEnabled
                  ? ({
                      '--tab-color': getTabColor('collapse').base,
                      '--tab-color-bg': getTabColor('collapse').bg,
                    } as React.CSSProperties)
                  : undefined
              }
              aria-pressed={collapseEnabled}
              aria-label={collapsed ? 'Expand panel' : 'Collapse panel'}
            >
              {collapsed ? <ChevronsLeft className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />}
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
