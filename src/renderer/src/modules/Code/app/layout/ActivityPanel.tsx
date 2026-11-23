/**
 * ------------------------------------------------------------------
 * Activity Panel (Right Side)
 * ------------------------------------------------------------------
 * Right sidebar panel container with horizontal topbar for tab
 * switching (File Explorer, Search, Design, History). Includes a
 * resizable width handle on the LEFT edge (200px–600px) and
 * delegates content rendering to the active tab component.
 *
 * Design tab: leaving it restores the previous content view, while
 * the design session (open design, agent UI) is kept in the store so
 * clicking the Design icon again brings it back.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useEffect, useRef, useState } from 'react';

// ── UI ─
import {
  Folder,
  Search as SearchIcon,
  Palette,
  Users,
  Bug,
  Sparkles,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

// ── Hooks ─
import { useCodeStore, type ContentViewMode } from '../../shared/stores/code.store';
import { useDesignStore } from '../../features/design/stores/design.store';
import { useDebugStore } from '../../features/debug/stores/debug.store';
import { useActivityPanelStore, useCurrentBranchKey } from '../stores/activity-panel.store';

// ── Components ─
import Tooltip from '@renderer/components/ui/Tooltip/Tooltip';
import { $ } from '@renderer/utils/color';
import { useAccentColors } from '@renderer/hooks/useAccentColors';
import { FileExplore } from '../../features/file-explorer';
import { Search } from '../../features/search';
import { Design } from '../../features/design';
import { Debug } from '../../features/debug';
import { Account } from '../../features/account';
import { Skill } from '../../features/skills';
import { NoSessionEmpty } from './NoSessionEmpty';

// ── Utils ──
import { cn } from '@renderer/utils/cn';

// ── Motion ──
import { AnimatePresence, motion } from 'framer-motion';
import { SPRING, TWEEN, panelSwap } from '../../shared/constants/motion.constants';

// ─── Constants ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'explore', icon: <Folder className="w-4 h-4" />, label: 'File Explorer' },
  { id: 'search', icon: <SearchIcon className="w-4 h-4" />, label: 'Search' },
  {
    id: 'design',
    icon: <Palette className="w-4 h-4" />,
    label: 'Design',
  },
  { id: 'debug', icon: <Bug className="w-4 h-4" />, label: 'Run & Debug' },
  { id: 'skill', icon: <Sparkles className="w-4 h-4" />, label: 'Skills' },
  { id: 'account', icon: <Users className="w-4 h-4" />, label: 'Accounts' },
];

const MIN_WIDTH = 200;
const MAX_WIDTH = 600;

// ─── Activity Bar (topbar / collapsed rail) ─────────────────────────────
interface TabItem {
  id: string;
  icon: React.ReactNode;
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
    bg: $('--card-background-hover'),
    border: $('--divider'),
    hover: $('--card-background-hover'),
  };
};

function ActivityBar({
  activeTab,
  onTabChange,
  tabs,
  collapsed = false,
  onToggleCollapse,
  hideCollapseButton = false,
  collapseEnabled = false,
}: ActivityBarProps) {
  const { accentColors, UNIFIED_ACCENT } = useAccentColors();
  const debugBusy = useDebugStore((s) => s.status !== 'idle');

  if (typeof accentColors !== 'undefined' && accentColors.length > 0) {
    setAccentColorsForActivityBar(accentColors, UNIFIED_ACCENT);
  }

  // Collapsed rail: expand icon on top, vertical icon list below
  if (collapsed) {
    return (
      <div className="flex-1 min-h-0 w-full bg-panel-background flex flex-col items-center z-10 overflow-y-auto [&::-webkit-scrollbar]:w-0">
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
                      'text-text-secondary hover:bg-card-hover hover:text-text-primary',
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

  return (
    <div
      className="relative w-full shrink-0 bg-panel-background border-b border-border flex flex-row z-10 overflow-x-auto [&::-webkit-scrollbar]:h-0"
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
                  'text-text-secondary hover:bg-card-hover hover:text-text-primary',
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
                  <AnimatePresence initial={false}>
                    {isActive && (
                      <motion.span
                        key="label"
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden text-xs font-semibold leading-none whitespace-nowrap"
                      >
                        {tab.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
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
                  : 'text-text-secondary hover:bg-card-hover hover:text-text-primary',
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

// ─── Component ──────────────────────────────────────────────────────────
export function ActivityPanel() {
  // ── Store — select riêng activityPanelTab thay vì toàn bộ project ──
  const isAccountPanelOpen = useCodeStore((s) => s.isAccountPanelOpen);
  const setAccountPanelOpen = useCodeStore((s) => s.setAccountPanelOpen);
  const branchKey = useCurrentBranchKey();
  const noSession = !branchKey || branchKey.endsWith('::');
  const [fallbackTab, setFallbackTab] = useState<string>('explore');
  const storedTab = useActivityPanelStore((s) => (branchKey ? s.tabs[branchKey] : undefined));
  const branchTab: string = (branchKey ? storedTab : fallbackTab) ?? 'explore';
  const setBranchTab = useActivityPanelStore((s) => s.setTab);
  const isSkillPanelOpen = useCodeStore((s) => s.isSkillPanelOpen);
  const setSkillPanelOpen = useCodeStore((s) => s.setSkillPanelOpen);
  const activityPanelTab = isAccountPanelOpen ? 'account' : isSkillPanelOpen ? 'skill' : branchTab;
  const activityPanelWidth = useCodeStore((s) => s.activityPanelWidth);
  const setActivityPanelWidth = useCodeStore((s) => s.setActivityPanelWidth);
  const contentViewMode = useCodeStore((s) => s.contentViewMode);
  const setContentViewMode = useCodeStore((s) => s.setContentViewMode);
  const hasActiveDesign = useDesignStore((s) => s.activeDesignId !== null);
  const debugBusy = useDebugStore((s) => s.status !== 'idle');

  // ── State ──
  const [isResizing, setIsResizing] = useState(false);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const [designMounted, setDesignMounted] = useState(activityPanelTab === 'design');
  // ASSUMED: autoCollapse = chế độ thu gọn (bật thì chỉ expand khi hover, tắt thì luôn expand)
  const [autoCollapse, setAutoCollapse] = useState(false);
  const [hovered, setHovered] = useState(false);
  const collapsed = autoCollapse && !hovered;
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (activityPanelTab === 'design') setDesignMounted(true);
  }, [activityPanelTab]);

  // ── Refs ──
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const lastViewModeRef = useRef<ContentViewMode>('files');

  useEffect(() => {
    if (contentViewMode !== 'design') lastViewModeRef.current = contentViewMode;
  }, [contentViewMode]);

  useEffect(() => {
    if (branchTab !== 'design' && useCodeStore.getState().contentViewMode === 'design') {
      setContentViewMode(lastViewModeRef.current);
    }
  }, [branchKey]);

  // ── Handlers ──
  const handleTabChange = (tab: string) => {
    if (tab === 'skill') {
      if (contentViewMode === 'design') setContentViewMode(lastViewModeRef.current);
      setSkillPanelOpen(true);
      return;
    }
    setSkillPanelOpen(false);
    if (tab === 'account') {
      if (contentViewMode === 'design') setContentViewMode(lastViewModeRef.current);
      setAccountPanelOpen(true);
      return;
    }
    setAccountPanelOpen(false);
    if (tab === 'design') {
      if (hasActiveDesign && !noSession) setContentViewMode('design');
    } else if (contentViewMode === 'design') {
      setContentViewMode(lastViewModeRef.current);
    }
    if (branchKey) setBranchTab(branchKey, tab as any);
    else setFallbackTab(tab);
  };

  // Resize from LEFT edge: dragging left increases width, dragging right decreases
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = activityPanelWidth;

    let frame = 0;
    let latest = startWidthRef.current;
    const handleMouseMove = (ev: MouseEvent) => {
      // Inverted delta because we resize from the left edge
      const delta = startXRef.current - ev.clientX;
      latest = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidthRef.current + delta));
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setDragWidth(latest);
      });
    };

    const handleMouseUp = () => {
      cancelAnimationFrame(frame);
      setActivityPanelWidth(latest);
      setDragWidth(null);
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const renderContent = () => {
    if (noSession && ['explore', 'search', 'design', 'debug'].includes(activityPanelTab)) {
      const tab = TABS.find((t) => t.id === activityPanelTab);
      return <NoSessionEmpty label={tab?.label ?? ''} />;
    }
    switch (activityPanelTab) {
      case 'explore':
        return <FileExplore />;
      case 'search':
        return <Search />;
      case 'design':
        return null;
      case 'debug':
        return <Debug />;
      case 'skill':
        return <Skill />;
      case 'account':
        return <Account />;

      default:
        return <FileExplore />;
    }
  };

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => setHovered(false), 300);
  };

  const handleToggleCollapse = () => setAutoCollapse((v) => !v);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + B to toggle collapse
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setAutoCollapse((v) => !v);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  // ── Render ──
  return (
    <motion.div
      className="flex flex-col h-full bg-panel-background border-l border-border relative flex-shrink-0"
      initial={false}
      animate={{ width: collapsed ? 44 : (dragWidth ?? activityPanelWidth) }}
      transition={isResizing ? TWEEN.none : SPRING.panel}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Resize handle on LEFT edge */}
      <div
        className={cn(
          'absolute left-0 top-0 h-full w-1 cursor-col-resize transition-colors hover:bg-primary/30',
          isResizing && 'bg-primary/50',
          collapsed && 'hidden',
        )}
        onMouseDown={handleMouseDown}
        style={{ zIndex: 10 }}
      />

      {/* Topbar: height matches panel width */}
      <ActivityBar
        activeTab={activityPanelTab}
        onTabChange={handleTabChange}
        tabs={TABS.map((t) => (t.id === 'debug' ? { ...t, busy: debugBusy } : t))}
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
        collapseEnabled={autoCollapse}

      />

      {/* Content area below topbar */}
      <div className={cn('flex-1 overflow-hidden flex flex-col min-w-0', collapsed && 'hidden')}>
        {designMounted && (
          <div
            className={cn(
              'min-h-0 flex-1 flex-col',
              activityPanelTab === 'design' && !noSession ? 'flex' : 'hidden',
            )}
          >
            <Design />
          </div>
        )}
        <AnimatePresence mode="wait" initial={false}>
          {(activityPanelTab !== 'design' || noSession) && (
            <motion.div
              key={activityPanelTab}
              variants={panelSwap}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex-1 min-h-0 min-w-0 flex flex-col"
            >
              {renderContent()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}