/**
 * ------------------------------------------------------------------
 * Workspace Views — 2x2 pane grid with tabs
 * ------------------------------------------------------------------
 * - Up to 4 panes (top-left, top-right, bottom-left, bottom-right),
 *   each with its own tab bar and "+" menu.
 * - Drag a tab onto any quadrant to move it there (creates the pane
 *   if it doesn't exist yet). Emptied panes collapse automatically.
 * - Dividers are draggable (20% – 80%).
 *
 * File map:
 *   workspaceLayout.ts          pure layout logic + reducer
 *   workspaceAgents.ts          agent favicons + store sync
 *   WorkspaceTabs.tsx           Tab / TabBar
 *   WorkspacePanes.tsx          panel bodies, dividers, drop preview
 *   WorkspaceEmptyStates.tsx    EmptyState / WorkspaceEmptyState
 *   useWorkspaceInteractions.ts drag-drop (pointer events) + resize
 * ------------------------------------------------------------------
 */

import { memo, useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { useCodeStore, type StoredWorkspacePanel } from '../../../hooks/useCodeStore';
import { attachAgentToProject } from '../../../constants/workspaceAgents';
import { getPanelMeta, TabBar } from './WorkspacePanes';
import { WorkspacePanes } from './WorkspacePanes';
import { WorkspaceEmptyState, type EmptyWorkspaceAction } from './WorkspaceEmptyStates';
import { useWorkspaceInteractions } from '../../../hooks/useWorkspaceInteractions';
import {
  computeRects,
  createInitialState,
  getOccupiedPanes,
  getPaneAtPoint,
  previewDropRect,
  workspaceReducer,
  type PaneId,
  type PanelType,
  type ResizeHandle,
  type WorkspacePanel,
} from '../../../utils/workspaceLayout';

// Public API (other modules import these from this file)
export { EmptyState } from './WorkspaceEmptyStates';
export type { PanelType, WorkspacePanel } from '../../../utils/workspaceLayout';

interface WorkspaceViewsProps {
  initialPanels?: WorkspacePanel[];
}

// Stable reference so the zustand selectors below don't return a fresh [] every call
const NO_PANELS: StoredWorkspacePanel[] = [];

const EMPTY_ACTION_TO_PANEL_TYPE: Record<EmptyWorkspaceAction, PanelType> = {
  session: 'note',
  terminal: 'terminal',
  file: 'note',
  preview: 'website',
};

const createPanelId = (type: PanelType) =>
  `${type}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// ─── Main component ───────────────────────────────────────────────────

export const WorkspaceViews = memo(function WorkspaceViews({
  initialPanels = [],
}: WorkspaceViewsProps) {
  const currentProjectId = useCodeStore((s) => s.currentProjectId);
  const updateProject = useCodeStore((s) => s.updateProject);

  // Persisted state from the store
  const storedPanels = useCodeStore(
    (s) => s.projects.find((p) => p.id === s.currentProjectId)?.workspacePanels ?? NO_PANELS,
  );
  const storedActiveId = useCodeStore(
    (s) => s.projects.find((p) => p.id === s.currentProjectId)?.activeWorkspacePanelId ?? null,
  );
  const currentProjectPath = useCodeStore(
    (s) => s.projects.find((p) => p.id === s.currentProjectId)?.path,
  );

  // Panels + layout live in a single reducer so they can never drift apart
  const [state, dispatch] = useReducer(workspaceReducer, undefined, () =>
    createInitialState(storedPanels.length > 0 ? storedPanels : initialPanels, storedActiveId),
  );
  const { panels, paneTabs, paneActive, focusedPane, sizes } = state;
  const focusedActiveId = paneActive[focusedPane];

  // ─── Store sync ─────────────────────────────────────────────────────

  const loadedProjectRef = useRef(currentProjectId);
  const skipNextSyncRef = useRef(false);

  // Project switched → load that project's panels (and skip writing the old ones to it)
  useEffect(() => {
    if (loadedProjectRef.current === currentProjectId) return;
    loadedProjectRef.current = currentProjectId;
    skipNextSyncRef.current = true;
    dispatch({ type: 'reset', panels: storedPanels, activeId: storedActiveId });
    // Only react to the project id changing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId]);

  // Local → store, only when something actually changed
  useEffect(() => {
    if (!currentProjectId) return;
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }
    const panelsChanged = JSON.stringify(storedPanels) !== JSON.stringify(panels);
    if (panelsChanged || storedActiveId !== focusedActiveId) {
      updateProject(currentProjectId, {
        workspacePanels: panels as StoredWorkspacePanel[],
        activeWorkspacePanelId: focusedActiveId,
      });
    }
  }, [panels, focusedActiveId, currentProjectId, updateProject, storedPanels, storedActiveId]);

  // ─── Derived layout ─────────────────────────────────────────────────

  const occupied = useMemo(() => getOccupiedPanes(paneTabs), [paneTabs]);
  const rects = useMemo(() => computeRects(occupied, sizes), [occupied, sizes]);

  // ─── Handlers ───────────────────────────────────────────────────────

  const addPanel = useCallback((type: PanelType, pane?: PaneId) => {
    dispatch({
      type: 'add',
      pane,
      panel: { id: createPanelId(type), type, title: getPanelMeta(type).label, providerId: null },
    });
  }, []);

  const closePanel = useCallback((id: string) => dispatch({ type: 'close', id }), []);
  const selectTab = useCallback(
    (pane: PaneId, id: string) => dispatch({ type: 'select', pane, id }),
    [],
  );
  const movePanel = useCallback((id: string, to: PaneId) => dispatch({ type: 'move', id, to }), []);
  const resizePane = useCallback(
    (handle: ResizeHandle, value: number) => dispatch({ type: 'resize', handle, value }),
    [],
  );
  const updatePanelContent = useCallback(
    (id: string, content: string) => dispatch({ type: 'updatePanel', id, patch: { content } }),
    [],
  );

  // Update provider info for a panel AND sync it to the store (SessionCard display)
  const updatePanelProvider = useCallback(
    (id: string, providerId: string | null) => {
      dispatch({ type: 'updatePanel', id, patch: { providerId } });
      if (currentProjectId && providerId) attachAgentToProject(currentProjectId, providerId);
    },
    [currentProjectId],
  );

  // ─── Drag & drop / resize ───────────────────────────────────────────

  const contentRef = useRef<HTMLDivElement>(null);

  const getPaneAt = useCallback(
    (xPct: number, yPct: number) => getPaneAtPoint(xPct, yPct, occupied, sizes),
    [occupied, sizes],
  );

  const dnd = useWorkspaceInteractions({
    contentRef,
    getPaneAt,
    onMove: movePanel,
    onResize: resizePane,
  });

  const dropPreview = useMemo(
    () =>
      dnd.dragSourceId && dnd.dropTarget
        ? previewDropRect(state, dnd.dragSourceId, dnd.dropTarget)
        : null,
    [state, dnd.dragSourceId, dnd.dropTarget],
  );

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background relative">
      {/* Main workspace area */}
      <div className="flex-1 min-h-0 relative">
        {/* Tab bars - rendered at top level so they sit above the panel bodies */}
        {panels.length > 0 &&
          occupied.map((pane) => {
            const rect = rects[pane];
            if (!rect) return null;
            const panePanels = paneTabs[pane]
              .map((id) => panels.find((p) => p.id === id))
              .filter((p): p is WorkspacePanel => !!p);

            return (
              <div
                key={`tab-${pane}`}
                className="absolute z-[115]"
                style={{
                  left: `${rect.left}%`,
                  top: `${rect.top}%`,
                  width: `${rect.width}%`,
                  height: '36px',
                }}
              >
                <TabBar
                  panels={panePanels}
                  activeId={paneActive[pane]}
                  onSelectTab={(id) => selectTab(pane, id)}
                  onCloseTab={closePanel}
                  onDragStart={dnd.startTabDrag}
                  onAddPanel={(type) => addPanel(type, pane)}
                />
              </div>
            );
          })}

        {/* Content area (also used to convert mouse position → quadrant) */}
        <div ref={contentRef} className="absolute inset-0">
          {panels.length === 0 ? (
            <WorkspaceEmptyState
              onAddPanel={(action) => addPanel(EMPTY_ACTION_TO_PANEL_TYPE[action])}
            />
          ) : (
            <>
              <WorkspacePanes
                panels={panels}
                paneTabs={paneTabs}
                paneActive={paneActive}
                rects={rects}
                cwd={currentProjectPath}
                dropPreview={dropPreview}
                resizing={dnd.resizing}
                isDragging={!!dnd.dragSourceId}
                onResizeStart={dnd.startResize}
                onProviderChange={updatePanelProvider}
                onContentChange={updatePanelContent}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export default WorkspaceViews;
