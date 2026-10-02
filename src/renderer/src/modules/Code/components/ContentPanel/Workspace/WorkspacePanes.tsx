/**
 * Renders the 2x2 pane grid with tabs.
 *
 * Panel bodies live in ONE flat list (keyed by panel id) and are positioned
 * absolutely, so moving a tab between panes never unmounts it
 * (terminals keep their sessions).
 *
 * Tabs are dragged with plain mouse events (see useWorkspaceInteractions),
 * NOT the HTML5 drag & drop API, so tabs must NOT be `draggable`.
 */

import {
  memo,
  useCallback,
  useEffect,
  useState,
  useRef,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { Plus, Terminal as TerminalIcon, Globe, FileText, MonitorPlay } from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';
import { CodeTerminal } from './CodeTerminal';
import { CodeBrowser } from './CodeBrowser';
import { CodeMarkdown } from './CodeMarkdown';
import { getAgentFavicon } from '../../../constants/workspaceAgents';
import {
  TABBAR_HEIGHT,
  findPaneOfPanel,
  type PaneActive,
  type PaneRect,
  type PaneRects,
  type PaneTabs,
  type PanelType,
  type ResizeHandle,
  type WorkspacePanel,
} from '../../../utils/workspaceLayout';

// ─── Panel metadata ───────────────────────────────────────────────────

export function getPanelMeta(
  type: PanelType,
  iconClass = 'w-3.5 h-3.5',
): { icon: ReactNode; label: string } {
  switch (type) {
    case 'terminal':
      return { icon: <TerminalIcon className={iconClass} />, label: 'Terminal' };
    case 'website':
      return { icon: <Globe className={iconClass} />, label: 'Browser' };
    case 'note':
      return { icon: <FileText className={iconClass} />, label: 'Markdown' };
    case 'emulator':
      return { icon: <MonitorPlay className={iconClass} />, label: 'Emulator' };
    default:
      return { icon: null, label: 'Unknown' };
  }
}

/** Panel types offered by the "+" dropdown. */
const ADD_MENU_TYPES: PanelType[] = ['terminal', 'website', 'note'];

// ─── Tab ──────────────────────────────────────────────────────────────

interface WorkspaceTabProps {
  panel: WorkspacePanel;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
  /** Called on mousedown; the interactions hook decides when it becomes a drag. */
  onDragStart: (e: MouseEvent, id: string) => void;
}

function WorkspaceTab({ panel, isActive, onClick, onClose, onDragStart }: WorkspaceTabProps) {
  const meta = getPanelMeta(panel.type);
  
  // Determine if we should show Agent info instead of generic panel icon/title
  // This assumes panel.content or a specific field holds the providerId when detected.
  // Looking at CodeTerminal, it calls onProviderChange. We need to ensure WorkspacePanel receives/stores this.
  // For now, let's assume panel.providerId exists based on previous context or fallback to standard behavior.
  // If the structure doesn't have providerId directly on panel, we might need to check how state flows.
  // However, typically in these apps, the panel object is updated with metadata.
  // Let's stick to the visual requirement: if it's a terminal AND has an agent, show favicon + name.
  
  const agentId = (panel as any).providerId; // Accessing potentially dynamic field
  const faviconUrl = agentId ? getAgentFavicon(agentId) : undefined;
  
  const displayTitle = panel.title || meta.label;
  const showAgentBadge = !!agentId && panel.type === 'terminal';

  return (
    <div
      data-tab-id={panel.id}
      // NO `draggable` here: native HTML5 drag would steal mousemove/mouseup from the window listeners.
      onMouseDown={(e) => onDragStart(e, panel.id)}
      // The hook swallows the click that follows a drag, so this only fires on a real click.
      onClick={onClick}
      className={cn(
        'group/tab h-9 px-3 flex items-center gap-2 shrink-0 transition-colors text-[13px] relative',
        'border-r border-divider',
        isActive
          ? 'bg-card-background text-text-primary border-b-2 border-b-primary/80' // Added bottom border
          : 'bg-sidebar-background text-text-secondary hover:bg-white/[0.03]',
      )}
      style={{ cursor: 'grab', userSelect: 'none' }}
    >
      {showAgentBadge && faviconUrl ? (
        <img 
          src={faviconUrl} 
          alt="" 
          className="w-3.5 h-3.5 shrink-0 rounded-sm object-contain" 
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      ) : (
        <span className="shrink-0 opacity-70" style={{ pointerEvents: 'none' }}>
          {meta.icon}
        </span>
      )}
      
      <span style={{ pointerEvents: 'none' }}>
        {showAgentBadge ? agentId : displayTitle}
      </span>

      <button
        draggable={false}
        // Pressing × must not start a tab drag
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="opacity-0 group-hover/tab:opacity-100 transition-opacity ml-auto w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-[14px] leading-none"
        style={{ cursor: 'pointer' }}
        aria-label={`Close ${displayTitle}`}
      >
        ×
      </button>
    </div>
  );
}

// ─── TabBar ───────────────────────────────────────────────────────────

export interface TabBarProps {
  /** Panels of this pane, already in tab order. */
  panels: WorkspacePanel[];
  activeId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onDragStart: (e: MouseEvent, id: string) => void;
  onAddPanel: (type: PanelType) => void;
}

export function TabBar({
  panels,
  activeId,
  onSelectTab,
  onCloseTab,
  onDragStart,
  onAddPanel,
}: TabBarProps) {
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const tabBarRef = useRef<HTMLDivElement>(null);

  const openMenu = (e: MouseEvent<HTMLButtonElement>) => {
    if (menuPos) return setMenuPos(null);
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.left });
  };

  return (
    <div
      ref={tabBarRef}
      className="h-9 w-full shrink-0 flex items-end bg-sidebar-background overflow-x-auto custom-scrollbar border-b border-divider"
    >
      {panels.map((panel) => (
        <WorkspaceTab
          key={panel.id}
          panel={panel}
          isActive={activeId === panel.id}
          onClick={() => onSelectTab(panel.id)}
          onClose={() => onCloseTab(panel.id)}
          onDragStart={onDragStart}
        />
      ))}

      <button
        onClick={openMenu}
        className="h-9 w-9 flex items-center justify-center hover:bg-white/[0.05] text-text-secondary hover:text-text-primary transition-colors shrink-0"
        aria-label="Add panel"
      >
        <Plus className="w-4 h-4" />
      </button>

      {menuPos && (
        <div className="fixed inset-0 z-[200]" onClick={() => setMenuPos(null)}>
          <div
            className="absolute bg-card-background border border-border rounded-lg shadow-xl py-1 min-w-[160px]"
            style={menuPos}
            onClick={(e) => e.stopPropagation()}
          >
            {ADD_MENU_TYPES.map((type) => {
              const meta = getPanelMeta(type, 'w-4 h-4');
              return (
                <button
                  key={type}
                  onClick={() => {
                    onAddPanel(type);
                    setMenuPos(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-white/[0.05] transition-colors"
                >
                  {meta.icon}
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Panel body ───────────────────────────────────────────────────────

interface PanelBodyProps {
  panel: WorkspacePanel;
  cwd?: string;
  onProviderChange: (panelId: string, providerId: string | null) => void;
  onContentChange: (panelId: string, content: string) => void;
}

const PanelBody = memo(function PanelBody({
  panel,
  cwd,
  onProviderChange,
  onContentChange,
}: PanelBodyProps) {
  const handleProvider = useCallback(
    (providerId: string | null) => onProviderChange(panel.id, providerId),
    [onProviderChange, panel.id],
  );
  const handleContent = useCallback(
    (content: string) => onContentChange(panel.id, content),
    [onContentChange, panel.id],
  );

  switch (panel.type) {
    case 'terminal':
      return <CodeTerminal cwd={cwd} onProviderChange={handleProvider} />;
    case 'website':
      return <CodeBrowser initialUrl={panel.content} />;
    case 'note':
      return <CodeMarkdown initialContent={panel.content} onContentChange={handleContent} />;
    case 'emulator':
      return (
        <div className="flex-1 h-full flex items-center justify-center bg-black text-gray-500">
          Emulator View Placeholder
        </div>
      );
    default:
      return null;
  }
});

// ─── Geometry helpers ─────────────────────────────────────────────────

const pct = (n: number) => `${n}%`;

const contentStyle = (r: PaneRect): CSSProperties => ({
  left: pct(r.left),
  top: `calc(${r.top}% + ${TABBAR_HEIGHT}px)`,
  width: pct(r.width),
  height: `calc(${r.height}% - ${TABBAR_HEIGHT}px)`,
});

const frameStyle = (r: PaneRect): CSSProperties => ({
  left: pct(r.left),
  top: pct(r.top),
  width: pct(r.width),
  height: pct(r.height),
});

// ─── Divider ──────────────────────────────────────────────────────────

function Divider({
  direction,
  style,
  active,
  onMouseDown,
}: {
  direction: 'vertical' | 'horizontal';
  style: CSSProperties;
  active: boolean;
  onMouseDown: () => void;
}) {
  const isVertical = direction === 'vertical';
  return (
    <div
      onMouseDown={onMouseDown}
      className={cn(
        'absolute z-[120] group select-none',
        isVertical ? 'cursor-col-resize w-2' : 'cursor-row-resize h-2',
      )}
      style={style}
    >
      <div
        className={cn(
          'absolute bg-divider group-hover:bg-primary transition-colors',
          isVertical
            ? 'inset-y-0 left-1/2 w-[2px] -translate-x-1/2'
            : 'inset-x-0 top-1/2 h-[2px] -translate-y-1/2',
          active && 'bg-primary',
        )}
      />
    </div>
  );
}

// ─── Pane grid ────────────────────────────────────────────────────────

export interface WorkspacePanesProps {
  panels: WorkspacePanel[];
  paneTabs: PaneTabs;
  paneActive: PaneActive;
  rects: PaneRects;
  cwd?: string;

  /** Rectangle highlighted while dragging a tab (null = no preview). */
  dropPreview: PaneRect | null;
  resizing: ResizeHandle | null;
  isDragging: boolean;

  onResizeStart: (handle: ResizeHandle) => void;
  onProviderChange: (panelId: string, providerId: string | null) => void;
  onContentChange: (panelId: string, content: string) => void;
}

export const WorkspacePanes = memo(function WorkspacePanes({
  panels,
  paneTabs,
  paneActive,
  rects,
  cwd,
  dropPreview,
  resizing,
  isDragging,
  onResizeStart,
  onProviderChange,
  onContentChange,
}: WorkspacePanesProps) {
  // Divider positions, derived from which panes exist
  const leftRect = rects.tl ?? rects.bl;
  const rightRect = rects.tr ?? rects.br;
  const hasColumnDivider = !!leftRect && !!rightRect;

  return (
    <>
      {/* Panel bodies — NEVER unmounted, only moved / hidden */}
      <div className="absolute inset-0 pointer-events-none z-[100]">
        {panels.map((panel) => {
          const pane = findPaneOfPanel(paneTabs, panel.id);
          const rect = pane ? rects[pane] : undefined;
          const isVisible = !!pane && paneActive[pane] === panel.id;

          return (
            <div
              key={panel.id}
              className={cn(
                'absolute',
                isVisible ? 'pointer-events-auto' : 'invisible pointer-events-none',
              )}
              style={rect ? contentStyle(rect) : undefined}
            >
              <div className="h-full w-full overflow-hidden">
                <PanelBody
                  panel={panel}
                  cwd={cwd}
                  onProviderChange={onProviderChange}
                  onContentChange={onContentChange}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Tab bars are rendered in index.tsx (above the panel bodies) */}

      {/* Dividers */}
      {hasColumnDivider && rightRect && (
        <Divider
          direction="vertical"
          active={resizing === 'col'}
          onMouseDown={() => onResizeStart('col')}
          style={{ left: `calc(${rightRect.left}% - 4px)`, top: 0, height: '100%' }}
        />
      )}
      {rects.tl && rects.bl && (
        <Divider
          direction="horizontal"
          active={resizing === 'rowLeft'}
          onMouseDown={() => onResizeStart('rowLeft')}
          style={{
            left: pct(rects.bl.left),
            width: pct(rects.bl.width),
            top: `calc(${rects.bl.top}% - 4px)`,
          }}
        />
      )}
      {rects.tr && rects.br && (
        <Divider
          direction="horizontal"
          active={resizing === 'rowRight'}
          onMouseDown={() => onResizeStart('rowRight')}
          style={{
            left: pct(rects.br.left),
            width: pct(rects.br.width),
            top: `calc(${rects.br.top}% - 4px)`,
          }}
        />
      )}

      {/* Shield so iframes / webviews don't swallow mouse events while dragging or resizing */}
      {(resizing || isDragging) && <div className="absolute inset-0 z-[130]" />}

      {/* Drop preview: where the dragged tab will land */}
      {isDragging && dropPreview && (
        <div
          className="absolute pointer-events-none z-[150] bg-primary/10 border-2 border-primary transition-all duration-150"
          style={frameStyle(dropPreview)}
        />
      )}
    </>
  );
});
