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
import {
  attachAgentToProject,
  removeAgentFromProject,
  detachAgentFromProject,
} from '../../../constants/workspaceAgents';
import type { SessionStatus } from '../../ProjectPanel/SessionCard';
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
  type WorkspaceLayoutSnapshot,
  type WorkspacePanel,
} from '../../../utils/workspaceLayout';

// Public API (other modules import these from this file)
export { EmptyState } from './WorkspaceEmptyStates';
export type { PanelType, WorkspacePanel } from '../../../utils/workspaceLayout';

interface WorkspaceViewsProps {
  initialPanels?: WorkspacePanel[];
  sessionId: string;
}

// Stable reference so the zustand selectors below don't return a fresh [] every call
const NO_PANELS: StoredWorkspacePanel[] = [];
const NO_LAYOUTS: Record<string, WorkspaceLayoutSnapshot> = {};

const EMPTY_ACTION_TO_PANEL_TYPE: Record<EmptyWorkspaceAction, PanelType> = {
  browser: 'website',
  terminal: 'terminal',
  agent: 'agent',
  markdown: 'note',
};

const createPanelId = (type: PanelType) =>
  `${type}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// ─── Main component ───────────────────────────────────────────────────

export const WorkspaceViews = memo(function WorkspaceViews({
  initialPanels = [],
  sessionId,
}: WorkspaceViewsProps) {
  const currentProjectId = useCodeStore((s) => s.currentProjectId);
  const updateProject = useCodeStore((s) => s.updateProject);
  const updatePanelZenCliBinding = useCodeStore((s) => s.updatePanelZenCliBinding);

  // Persisted state from the store
  const allStoredPanels = useCodeStore(
    (s) => s.projects.find((p) => p.id === s.currentProjectId)?.workspacePanels ?? NO_PANELS,
  );
  const storedActiveId = useCodeStore(
    (s) => s.projects.find((p) => p.id === s.currentProjectId)?.activeWorkspacePanelId ?? null,
  );
  const storedLayouts = useCodeStore(
    (s) => s.projects.find((p) => p.id === s.currentProjectId)?.workspaceLayouts ?? NO_LAYOUTS,
  );
  const storedLayout = storedLayouts[sessionId];
  const currentProjectPath = useCodeStore((s) => {
    const project = s.projects.find((p) => p.id === s.currentProjectId);
    const branch = (project as any)?.branches?.find((b: any) =>
      b.sessions?.some((sess: any) => sess.id === sessionId),
    );
    return branch?.path ?? project?.path;
  });

  const isActive = useCodeStore((s) => s.activeWorkspaceSessionId === sessionId);

  const belongsToSession = (p: StoredWorkspacePanel) =>
    p.sessionId ? p.sessionId === sessionId : p.cwd === currentProjectPath;

  const storedPanels = useMemo(
    () => allStoredPanels.filter(belongsToSession),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allStoredPanels, sessionId, currentProjectPath],
  );

  const tagPanels = (list: WorkspacePanel[]) =>
    list.map((p) => ({ ...p, sessionId })) as StoredWorkspacePanel[];

  const mergeSessionPanels = (list: WorkspacePanel[]) => [
    ...allStoredPanels.filter((p) => !belongsToSession(p)),
    ...tagPanels(list),
  ];

  // Helper to ensure all terminal panels have a fixed CWD
  const normalizePanelsCwd = useCallback((panelsToNormalize: WorkspacePanel[], defaultCwd: string) => {
    let hasChanges = false;
    const normalized = panelsToNormalize.map(p => {
      if (p.type === 'terminal' && !p.cwd) {
        hasChanges = true;
        return { ...p, cwd: defaultCwd };
      }
      return p;
    });
    return { panels: normalized, changed: hasChanges };
  }, []);

  // Panels + layout live in a single reducer so they can never drift apart
  const [state, dispatch] = useReducer(workspaceReducer, undefined, () => {
    const sourcePanels = storedPanels.length > 0 ? storedPanels : initialPanels;
    const { panels: normalized } = normalizePanelsCwd(sourcePanels as WorkspacePanel[], currentProjectPath || '');
    return createInitialState(
      normalized,
      normalized.some((p) => p.id === storedActiveId) ? storedActiveId : null,
      storedLayout,
    );
  });
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
    
    // Normalize stored panels before resetting state to prevent missing CWD issues
    const { panels: normalizedStored, changed } = normalizePanelsCwd(storedPanels as WorkspacePanel[], currentProjectPath || '');
    
    dispatch({ type: 'reset', panels: normalizedStored, activeId: storedActiveId, layout: storedLayout });
    
    // If we had to fix missing CWDs, sync back to store immediately so next time it's clean
    if (changed && currentProjectId) {
       updateProject(currentProjectId, { workspacePanels: normalizedStored as StoredWorkspacePanel[] });
    }
    // Only react to the project id changing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId]);

  // ─── Sync Panel CWD with Active Session Path ────────────────────────
  // When the active session changes (and thus currentProjectPath changes),
  // we must update the 'cwd' of ALL open terminal panels to match the new path.
  // This ensures that switching sessions correctly points terminals to the right directory.
  const lastSyncedPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentProjectPath) return;
    
    // Skip if path hasn't actually changed since last sync
    if (lastSyncedPathRef.current === currentProjectPath) return;
    
    lastSyncedPathRef.current = currentProjectPath;

    let needsUpdate = false;
    const updatedPanels = panels.map(p => {
      if (p.type === 'terminal' && !p.cwd) {
        needsUpdate = true;
        return { ...p, cwd: currentProjectPath };
      }
      return p;
    });

    if (needsUpdate) {
      console.log('[DEBUG_WORKSPACE_SYNC_CWD] Updating all terminal panels to new session path:', currentProjectPath);
      // Use 'reset' to atomically update state without causing partial re-renders or loops
      dispatch({
        type: 'reset',
        panels: updatedPanels,
        activeId: focusedActiveId,
        layout: { paneTabs, paneActive, focusedPane, sizes },
      });
      
      // Persist immediately to store so reload keeps correct paths
      if (currentProjectId) {
         updateProject(currentProjectId, { workspacePanels: mergeSessionPanels(updatedPanels) });
      }
    }
  }, [currentProjectPath, panels, focusedActiveId, currentProjectId, updateProject]);

  // Local → store, only when something actually changed
  useEffect(() => {
    if (!currentProjectId) return;
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }
    const panelsChanged = JSON.stringify(storedPanels) !== JSON.stringify(tagPanels(panels));
    const activeChanged = isActive && storedActiveId !== focusedActiveId;
    const layout: WorkspaceLayoutSnapshot = { paneTabs, paneActive, focusedPane, sizes };
    const layoutChanged = JSON.stringify(storedLayout ?? null) !== JSON.stringify(layout);
    if (panelsChanged || activeChanged || layoutChanged) {
      updateProject(currentProjectId, {
        workspacePanels: mergeSessionPanels(panels),
        workspaceLayouts: { ...storedLayouts, [sessionId]: layout },
        ...(isActive ? { activeWorkspacePanelId: focusedActiveId } : {}),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panels, paneTabs, paneActive, focusedPane, sizes, focusedActiveId, currentProjectId, updateProject, storedPanels, storedActiveId, storedLayout, storedLayouts, isActive]);

  // ─── Derived layout ─────────────────────────────────────────────────

  const focusRequest = useCodeStore((s) => s.focusPanelRequest);
  const clearFocusPanelRequest = useCodeStore((s) => s.clearFocusPanelRequest);

  useEffect(() => {
    if (!focusRequest || focusRequest.sessionId !== sessionId) return;
    dispatch({ type: 'focus', id: focusRequest.panelId });
    clearFocusPanelRequest();
  }, [focusRequest, sessionId, clearFocusPanelRequest]);

  const openFileRequest = useCodeStore((s) => s.openFileRequest);
  const clearOpenFileRequest = useCodeStore((s) => s.clearOpenFileRequest);

  useEffect(() => {
    if (!openFileRequest || openFileRequest.sessionId !== sessionId) return;
    const existing = panels.find((p) => p.type === 'file' && p.filePath === openFileRequest.filePath);
    if (existing) {
      dispatch({ type: 'focus', id: existing.id });
    } else {
      const codeState = useCodeStore.getState();
      const unsaved = codeState.projects.find((p) => p.id === codeState.currentProjectId)?.unsavedFiles;
      const previewPanel = panels.find((p) => p.type === 'file' && p.preview && !unsaved?.has(p.id));
      if (previewPanel) {
        dispatch({
          type: 'updatePanel',
          id: previewPanel.id,
          patch: { title: openFileRequest.name, filePath: openFileRequest.filePath },
        });
        dispatch({ type: 'focus', id: previewPanel.id });
      } else {
        dispatch({
          type: 'add',
          panel: {
            id: createPanelId('file'),
            type: 'file',
            title: openFileRequest.name,
            filePath: openFileRequest.filePath,
            cwd: currentProjectPath,
            preview: true,
          },
        });
      }
    }
    clearOpenFileRequest();
  }, [openFileRequest, sessionId, panels, currentProjectPath, clearOpenFileRequest]);

  const setSessionProcs = useCodeStore((s) => s.setSessionProcs);
  const panelsRef = useRef(panels);
  panelsRef.current = panels;
  const terminalProcsRef = useRef(
    new Map<string, { command: string; port?: number; terminalId: string }>(),
  );

  useEffect(() => {
    if (!currentProjectId) return;
    const onProcessInfo = (
      _event: unknown,
      payload: {
        terminalId: string;
        panelId?: string;
        command: string;
        displayCommand?: string;
        ports: number[];
        alive: boolean;
      },
    ) => {
      const { panelId } = payload;
      if (!panelId || !panelsRef.current.some((p) => p.id === panelId)) return;

      if (payload.alive && payload.command) {
        terminalProcsRef.current.set(panelId, {
          command: payload.displayCommand || payload.command,
          port: payload.ports[0],
          terminalId: payload.terminalId,
        });
      } else {
        terminalProcsRef.current.delete(panelId);
      }

      const procs = panelsRef.current.flatMap((p) => {
        const info = terminalProcsRef.current.get(p.id);
        return info
          ? [
              {
                cmd: info.command,
                status: 'live' as const,
                port: info.port,
                terminalId: info.terminalId,
                panelId: p.id,
              },
            ]
          : [];
      });
      setSessionProcs(currentProjectId, sessionId, procs);
    };

    window.api.on('terminal:process-info', onProcessInfo);
    return () => {
      window.api.off('terminal:process-info', onProcessInfo);
    };
  }, [currentProjectId, sessionId, setSessionProcs]);

  const occupied = useMemo(() => getOccupiedPanes(paneTabs), [paneTabs]);
  const rects = useMemo(() => computeRects(occupied, sizes), [occupied, sizes]);

  // ─── Handlers ───────────────────────────────────────────────────────

  const addPanel = useCallback((type: PanelType, pane?: PaneId) => {
    dispatch({
      type: 'add',
      pane,
      panel: { 
        id: createPanelId(type), 
        type, 
        title: getPanelMeta(type).label, 
        providerId: null,
        cwd: currentProjectPath // Gán CWD hiện tại cho panel mới
      },
    });
  }, [currentProjectPath]);

  // ── NEW: Handle Drop from History Panel ──
  const handleDropHistory = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      try {
        const dataStr = e.dataTransfer.getData('application/json');
        if (!dataStr) return;

        const payload = JSON.parse(dataStr);

        if (payload.type === 'phantoma-file' && payload.filePath) {
          const existing = panels.find((p) => p.type === 'file' && p.filePath === payload.filePath);
          if (existing) {
            dispatch({ type: 'focus', id: existing.id });
            return;
          }

          const fileRect = contentRef.current?.getBoundingClientRect();
          let filePane: PaneId | undefined;
          if (fileRect && fileRect.width > 0 && fileRect.height > 0) {
            const fx = ((e.clientX - fileRect.left) / fileRect.width) * 100;
            const fy = ((e.clientY - fileRect.top) / fileRect.height) * 100;
            filePane = getPaneAtPoint(fx, fy, occupied, sizes);
          }

          dispatch({
            type: 'add',
            pane: filePane,
            panel: {
              id: createPanelId('file'),
              type: 'file',
              title: payload.name,
              filePath: payload.filePath,
              cwd: currentProjectPath,
            },
          });
          return;
        }

        // Verify it's a ZenCLI resume action
        if (payload.type !== 'zencli-resume' || !payload.conversationId) return;

        const convId = payload.conversationId;
        const title = payload.title || 'Resume Session';

        // Determine target pane based on mouse position relative to content area
        const rect = contentRef.current?.getBoundingClientRect();
        let targetPane: PaneId | undefined;

        if (rect && rect.width > 0 && rect.height > 0) {
          const xPct = ((e.clientX - rect.left) / rect.width) * 100;
          const yPct = ((e.clientY - rect.top) / rect.height) * 100;
          targetPane = getPaneAtPoint(xPct, yPct, occupied, sizes);
        }

        // Create a new terminal panel pre-filled with the resume command
        const newPanel: WorkspacePanel = {
          id: createPanelId('terminal'),
          type: 'terminal',
          title: `Resume: ${title.substring(0, 20)}...`,
          providerId: null,
          cwd: currentProjectPath, // Gán CWD hiện tại
          zencliConversationId: convId,
          zencliLastActiveAt: Date.now(),
        };

        dispatch({
          type: 'add',
          pane: targetPane,
          panel: newPanel,
        });
      } catch (err) {
        console.error('[Workspace] Failed to process history drop:', err);
      }
    },
    [occupied, sizes, panels, currentProjectPath],
  );

  const closePanel = useCallback((id: string) => {
    window.api?.send('terminal:history-delete', id);
    dispatch({ type: 'close', id });
  }, []);
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

  const updatePanelAgentConversation = useCallback(
    (id: string, conversationId: string | null) =>
      dispatch({ type: 'updatePanel', id, patch: { agentConversationId: conversationId } }),
    [],
  );

  const updatePanelAgentTitle = useCallback(
    (id: string, title: string | null) =>
      dispatch({ type: 'updatePanel', id, patch: { agentTitle: title } }),
    [],
  );

  // Update provider info for a panel AND sync it to the store (SessionCard display)
  // Now supports optional status parameter to distinguish Idle vs Running
  const updatePanelProvider = useCallback(
    (id: string, providerId: string | null, status?: SessionStatus) => {
      dispatch({ type: 'updatePanel', id, patch: { providerId } });

      if (!currentProjectId) return;

      if (providerId) {
        // Attach or Update agent with specific status (defaults to 'idle' if not provided)
        attachAgentToProject(currentProjectId, providerId, status);
      } else {
        // Remove agent completely (used on Exit)
        const panel = panels.find((p) => p.id === id);
        const lastKnownProvider = panel?.providerId;

        if (lastKnownProvider) {
          removeAgentFromProject(currentProjectId, lastKnownProvider);
        }
      }
    },
    [currentProjectId, panels],
  );

  // ── NEW: Handle ZenCLI process exit → clear binding & detach agent ──
  const handleProcessExit = useCallback(
    (panelId: string) => {
      if (!currentProjectId) return;

      // Check if this panel had a ZenCLI binding before clearing
      const panel = panels.find((p) => p.id === panelId);

      if (panel?.zencliConversationId) {
        // Clear binding in store so next mount won't auto-resume
        updatePanelZenCliBinding(currentProjectId, panelId, { conversationId: null });

        // Also update local reducer state immediately to prevent stale UI
        dispatch({
          type: 'updatePanel',
          id: panelId,
          patch: { zencliConversationId: null, zencliLastActiveAt: null },
        });
      }

      // Detach agent from session badges when process exits
      if (panel?.providerId) {
        detachAgentFromProject(currentProjectId, panel.providerId);
      }
    },
    [currentProjectId, panels, updatePanelZenCliBinding],
  );

  // ── NEW: Handle ZenCLI bind signal → save conversation ID to store ──
  const handleBindConversation = useCallback(
    (panelId: string, conversationId: string) => {
      if (!currentProjectId) return;

      // Update store with new binding
      updatePanelZenCliBinding(currentProjectId, panelId, {
        conversationId,
        lastActiveAt: Date.now(),
      });

      // Update local reducer state for immediate feedback
      dispatch({
        type: 'updatePanel',
        id: panelId,
        patch: {
          zencliConversationId: conversationId,
          zencliLastActiveAt: Date.now(),
        },
      });
    },
    [currentProjectId, updatePanelZenCliBinding],
  );

  // ── NEW: Handle ZenCLI reset signal (/new) → clear conversation ID from store ──
  const handleResetConversation = useCallback(
    (panelId: string) => {
      if (!currentProjectId) return;

      // Clear binding in store so next mount won't auto-resume
      updatePanelZenCliBinding(currentProjectId, panelId, { conversationId: null });

      // Also update local reducer state immediately to prevent stale UI
      dispatch({
        type: 'updatePanel',
        id: panelId,
        patch: { zencliConversationId: null, zencliLastActiveAt: null },
      });
    },
    [currentProjectId, updatePanelZenCliBinding],
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
    <div
      className={`flex-1 flex-col min-h-0 bg-background relative ${isActive ? 'flex' : 'hidden'}`}
    >
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
        <div
          ref={contentRef}
          className="absolute inset-0"
          onDrop={handleDropHistory}
          onDragOver={(e) => {
            // Prevent default to allow dropping
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
        >
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
                onAgentConversationChange={updatePanelAgentConversation}
                onAgentTitleChange={updatePanelAgentTitle}
                onProcessExit={handleProcessExit}
                onBindConversation={handleBindConversation}
                onResetConversation={handleResetConversation}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export default WorkspaceViews;
