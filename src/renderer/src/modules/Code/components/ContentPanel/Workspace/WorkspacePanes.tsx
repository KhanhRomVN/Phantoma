/**
 * Renders the 2x2 pane grid.
 *
 * Panel bodies live in ONE flat list (keyed by panel id) and are positioned
 * absolutely, so moving a tab between panes never unmounts it
 * (terminals keep their session).
 */

import { memo, useCallback, type CSSProperties, type DragEvent } from 'react';
import { cn } from '@renderer/shared/utils/cn';
import { CodeTerminal } from './CodeTerminal';
import { CodeBrowser } from './CodeBrowser';
import { CodeMarkdown } from './CodeMarkdown';
import { TabBar } from './WorkspaceTabs';
import {
  PANE_IDS,
  TABBAR_HEIGHT,
  findPaneOfPanel,
  type PaneActive,
  type PaneId,
  type PaneRect,
  type PaneRects,
  type PaneTabs,
  type PanelType,
  type ResizeHandle,
  type WorkspacePanel,
} from '../../../utils/workspaceLayout';

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

const tabBarStyle = (r: PaneRect): CSSProperties => ({
  left: pct(r.left),
  top: pct(r.top),
  width: pct(r.width),
  height: TABBAR_HEIGHT,
});

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
          isVertical ? 'inset-y-0 left-1/2 w-[2px] -translate-x-1/2' : 'inset-x-0 top-1/2 h-[2px] -translate-y-1/2',
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

  onSelectTab: (pane: PaneId, id: string) => void;
  onCloseTab: (id: string) => void;
  onAddPanel: (type: PanelType, pane: PaneId) => void;
  onDragStart: (e: DragEvent, id: string) => void;
  onDragEnd: () => void;
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
  onSelectTab,
  onCloseTab,
  onAddPanel,
  onDragStart,
  onDragEnd,
  onResizeStart,
  onProviderChange,
  onContentChange,
}: WorkspacePanesProps) {
  const panelById = new Map(panels.map((p) => [p.id, p]));
  const occupied = PANE_IDS.filter((pane) => rects[pane]);

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
                'absolute overflow-hidden',
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

      {/* One tab bar per occupied pane */}
      {occupied.map((pane) => {
        const rect = rects[pane];
        if (!rect) return null;
        const panePanels = paneTabs[pane]
          .map((id) => panelById.get(id))
          .filter((p): p is WorkspacePanel => !!p);

        return (
          <div key={pane} className="absolute z-[110]" style={tabBarStyle(rect)}>
            <TabBar
              panels={panePanels}
              activeId={paneActive[pane]}
              onSelectTab={(id) => onSelectTab(pane, id)}
              onCloseTab={onCloseTab}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onAddPanel={(type) => onAddPanel(type, pane)}
            />
          </div>
        );
      })}

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
          style={{ left: pct(rects.bl.left), width: pct(rects.bl.width), top: `calc(${rects.bl.top}% - 4px)` }}
        />
      )}
      {rects.tr && rects.br && (
        <Divider
          direction="horizontal"
          active={resizing === 'rowRight'}
          onMouseDown={() => onResizeStart('rowRight')}
          style={{ left: pct(rects.br.left), width: pct(rects.br.width), top: `calc(${rects.br.top}% - 4px)` }}
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
