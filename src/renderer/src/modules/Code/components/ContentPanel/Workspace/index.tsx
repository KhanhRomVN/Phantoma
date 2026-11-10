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

import { memo, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useCodeStore, type StoredWorkspacePanel } from '../../../hooks/useCodeStore';
import { useWorkflowStore } from '../../../hooks/useWorkflowStore';
import { useDebugStore } from '../../../stores/useDebugStore';
import {
  attachAgentToProject,
  removeAgentFromProject,
  detachAgentFromProject,
} from '../../../constants/workspaceAgents';
import type { SessionStatus } from '../../ProjectPanel/SessionCard';
import { getPanelMeta, TabBar } from './WorkspacePanes';
import { WorkspacePanes } from './WorkspacePanes';
import { WorkspaceEmptyState, type EmptyWorkspaceAction } from './WorkspaceEmptyStates';
import { ConfirmSmartPlaceModal } from './ConfirmSmartPlaceModal';
import { ConfirmSaveFileModal } from '../../modal/ConfirmSaveFileModal';
import { useActivityPanelStore, useCurrentBranchKey } from '../../../stores/useActivityPanelStore';
import { ConfirmDeleteOrchestratorModal } from '../../modal/ConfirmDeleteOrchestratorModal';

import { useWorkspaceInteractions } from '../../../hooks/useWorkspaceInteractions';
import { resolvePaneForType, useWorkspaceSettings } from '../../../hooks/useWorkspaceSettings';
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
const withoutDebugTerminals = <T extends object>(list: T[]): T[] =>
  list.filter((p) => !(p as { reuseKey?: string | null }).reuseKey?.startsWith('debug:'));
const NO_LAYOUTS: Record<string, WorkspaceLayoutSnapshot> = {};

const EMPTY_ACTION_TO_PANEL_TYPE: Record<EmptyWorkspaceAction, PanelType> = {
  browser: 'website',
  terminal: 'terminal',
  agent: 'agent',
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
  const storedActiveId = useCodeStore((s) => {
    const p = s.projects.find((x) => x.id === s.currentProjectId);
    const perSession = p?.activeWorkspacePanelIds?.[sessionId];
    if (perSession !== undefined) return perSession;
    return s.activeWorkspaceSessionId === sessionId ? (p?.activeWorkspacePanelId ?? null) : null;
  });
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
  const isViewVisible = useCodeStore((s) => s.contentViewMode === 'workspace');

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
  const normalizePanelsCwd = useCallback(
    (panelsToNormalize: WorkspacePanel[], defaultCwd: string) => {
      let hasChanges = false;
      const normalized = panelsToNormalize.map((p) => {
        if (p.type === 'terminal' && !p.cwd) {
          hasChanges = true;
          return { ...p, cwd: defaultCwd };
        }
        return p;
      });
      return { panels: normalized, changed: hasChanges };
    },
    [],
  );

  // Panels + layout live in a single reducer so they can never drift apart
  const [state, dispatch] = useReducer(workspaceReducer, undefined, () => {
    const sourcePanels = withoutDebugTerminals(
      storedPanels.length > 0 ? storedPanels : initialPanels,
    );
    const { panels: normalized } = normalizePanelsCwd(
      sourcePanels as WorkspacePanel[],
      currentProjectPath || '',
    );
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
    const { panels: normalizedStored, changed } = normalizePanelsCwd(
      withoutDebugTerminals(storedPanels) as WorkspacePanel[],
      currentProjectPath || '',
    );

    dispatch({
      type: 'reset',
      panels: normalizedStored,
      activeId: storedActiveId,
      layout: storedLayout,
    });

    // If we had to fix missing CWDs, sync back to store immediately so next time it's clean
    if (changed && currentProjectId) {
      updateProject(currentProjectId, {
        workspacePanels: normalizedStored as StoredWorkspacePanel[],
      });
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
    const updatedPanels = panels.map((p) => {
      if (p.type === 'terminal' && !p.cwd) {
        needsUpdate = true;
        return { ...p, cwd: currentProjectPath };
      }
      return p;
    });

    if (needsUpdate) {
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
    const activeChanged = storedActiveId !== focusedActiveId;
    const layout: WorkspaceLayoutSnapshot = { paneTabs, paneActive, focusedPane, sizes };
    const layoutChanged = JSON.stringify(storedLayout ?? null) !== JSON.stringify(layout);
    if (panelsChanged || activeChanged || layoutChanged) {
      updateProject(currentProjectId, {
        ...(panelsChanged ? { workspacePanels: mergeSessionPanels(panels) } : {}),
        ...(layoutChanged ? { workspaceLayouts: { ...storedLayouts, [sessionId]: layout } } : {}),
        ...(activeChanged
          ? {
              activeWorkspacePanelIds: {
                ...useCodeStore.getState().projects.find((p) => p.id === currentProjectId)
                  ?.activeWorkspacePanelIds,
                [sessionId]: focusedActiveId,
              },
            }
          : {}),
        ...(isActive ? { activeWorkspacePanelId: focusedActiveId } : {}),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    panels,
    paneTabs,
    paneActive,
    focusedPane,
    sizes,
    focusedActiveId,
    currentProjectId,
    updateProject,
    storedPanels,
    storedActiveId,
    storedLayout,
    storedLayouts,
    isActive,
  ]);

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
    const existing = panels.find(
      (p) => p.type === 'file' && p.filePath === openFileRequest.filePath,
    );
    if (existing) {
      dispatch({ type: 'focus', id: existing.id });
    } else {
      const codeState = useCodeStore.getState();
      const unsaved = codeState.projects.find(
        (p) => p.id === codeState.currentProjectId,
      )?.unsavedFiles;
      const previewPanel = useWorkspaceSettings.getState().reusePreviewTab
        ? panels.find((p) => p.type === 'file' && p.preview && !unsaved?.has(p.id))
        : undefined;
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
          pane: resolvePaneForType('file'),
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

  useEffect(() => {
    const onOpenAgent = (e: Event) => {
      const d = (
        e as CustomEvent<{
          sessionId: string;
          agentId: string;
          title: string;
          focus?: boolean;
          done: (ok: boolean) => void;
        }>
      ).detail;
      if (d.sessionId !== sessionId) return;
      const existing = panels.find((p) => p.type === 'agent' && p.workflowAgentId === d.agentId);
      if (existing) {
        if (d.focus) dispatch({ type: 'focus', id: existing.id });
      } else {
        dispatch({
          type: 'add',
          background: !d.focus,
          pane: resolvePaneForType('agent'),
          panel: {
            id: createPanelId('agent'),
            type: 'agent',
            title: d.title,
            providerId: null,
            cwd: currentProjectPath,
            workflowAgentId: d.agentId,
          },
        });
      }
      d.done(true);
    };
    window.addEventListener('phantoma:open-agent-panel', onOpenAgent);
    return () => window.removeEventListener('phantoma:open-agent-panel', onOpenAgent);
  }, [sessionId, panels, currentProjectPath]);

  const openTerminalRequest = useCodeStore((s) => s.openTerminalRequest);
  const clearOpenTerminalRequest = useCodeStore((s) => s.clearOpenTerminalRequest);

  useEffect(() => {
    if (!openTerminalRequest || openTerminalRequest.sessionId !== sessionId) return;
    const existing = openTerminalRequest.reuseKey
      ? panels.find((p) => p.type === 'terminal' && p.reuseKey === openTerminalRequest.reuseKey)
      : undefined;
    if (existing) {
      dispatch({
        type: 'updatePanel',
        id: existing.id,
        patch: {
          title: openTerminalRequest.title,
          cwd: openTerminalRequest.cwd ?? existing.cwd,
          initialCommand: openTerminalRequest.command,
          runNonce: openTerminalRequest.nonce,
        },
      });
    } else {
      dispatch({
        type: 'add',
        pane: resolvePaneForType('terminal'),
        panel: {
          id: createPanelId('terminal'),
          type: 'terminal',
          title: openTerminalRequest.title,
          providerId: null,
          cwd: openTerminalRequest.cwd ?? currentProjectPath,
          initialCommand: openTerminalRequest.command,
          reuseKey: openTerminalRequest.reuseKey ?? null,
        },
      });
    }
    clearOpenTerminalRequest();
  }, [openTerminalRequest, sessionId, currentProjectPath, clearOpenTerminalRequest, panels]);

  const closeTerminalRequest = useCodeStore((s) => s.closeTerminalRequest);
  const clearCloseTerminalRequest = useCodeStore((s) => s.clearCloseTerminalRequest);

  useEffect(() => {
    if (!closeTerminalRequest || closeTerminalRequest.sessionId !== sessionId) return;
    panels.forEach((p) => {
      if (
        p.type === 'terminal' &&
        p.reuseKey &&
        closeTerminalRequest.reuseKeys.includes(p.reuseKey)
      ) {
        dispatch({ type: 'close', id: p.id });
      }
    });
    clearCloseTerminalRequest();
  }, [closeTerminalRequest, sessionId, panels, clearCloseTerminalRequest]);

  const unsavedFileIds = useCodeStore(
    (s) => s.projects.find((p) => p.id === s.currentProjectId)?.unsavedFiles,
  );

  useEffect(() => {
    if (!unsavedFileIds || unsavedFileIds.size === 0) return;
    panels.forEach((p) => {
      if (p.type === 'file' && p.preview && unsavedFileIds.has(p.id)) {
        dispatch({ type: 'updatePanel', id: p.id, patch: { preview: false } });
      }
    });
  }, [unsavedFileIds, panels]);

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
      const panel = panelsRef.current.find((p) => p.id === panelId);
      if (!panelId || !panel) return;
      if (payload.alive && payload.command) {
        terminalProcsRef.current.set(panelId, {
          command:
            panel.reuseKey === 'debug:task'
              ? panel.title
              : payload.displayCommand || payload.command,
          port: payload.ports[0],
          terminalId: payload.terminalId,
        });
      } else {
        terminalProcsRef.current.delete(panelId);
      }

      const rawName = (payload.displayCommand || payload.command || '').trim().split(/\s+/)[0];
      const processName = rawName ? rawName.split('/').pop() || rawName : null;
      dispatch({
        type: 'updatePanel',
        id: panelId,
        patch: {
          terminalRunning: !!payload.alive,
          terminalProcess: payload.alive && panel.reuseKey !== 'debug:task' ? processName : null,
        },
      });
      if (!payload.alive && panel.reuseKey === 'debug:task') {
        dispatch({ type: 'close', id: panelId });
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

  useEffect(() => {
    if (!currentProjectId) return;
    const alivePanelIds = new Set(panels.map((p) => p.id));
    let pruned = false;
    for (const panelId of [...terminalProcsRef.current.keys()]) {
      if (!alivePanelIds.has(panelId)) {
        terminalProcsRef.current.delete(panelId);
        pruned = true;
      }
    }

    if (!pruned) return;
    const procs = panels.flatMap((p) => {
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
  }, [panels, currentProjectId, sessionId, setSessionProcs]);

  const occupied = useMemo(() => getOccupiedPanes(paneTabs), [paneTabs]);
  const rects = useMemo(() => computeRects(occupied, sizes), [occupied, sizes]);

  // ─── Handlers ───────────────────────────────────────────────────────

  const addPanel = useCallback(
    (type: PanelType, pane?: PaneId) => {
      dispatch({
        type: 'add',
        pane: pane ?? resolvePaneForType(type),
        panel: {
          id: createPanelId(type),
          type,
          title: getPanelMeta(type).label,
          providerId: null,
          cwd: currentProjectPath, // Gán CWD hiện tại cho panel mới
        },
      });
    },
    [currentProjectPath],
  );


  const [pendingAdd, setPendingAdd] = useState<{
    type: PanelType;
    pane: PaneId;
    target: PaneId;
  } | null>(null);

  const requestAddPanel = useCallback(
    (type: PanelType, pane: PaneId) => {
      const target = resolvePaneForType(type);
      if (target && target !== pane) setPendingAdd({ type, pane, target });
      else addPanel(type, pane);
    },
    [addPanel],
  );

  const [fileDropPane, setFileDropPane] = useState<PaneId | null>(null);
  const fileDropRect = fileDropPane ? rects[fileDropPane] : null;

  useEffect(() => {
    if (!fileDropPane) return;
    const reset = () => setFileDropPane(null);
    document.addEventListener('dragend', reset);
    document.addEventListener('drop', reset);
    return () => {
      document.removeEventListener('dragend', reset);
      document.removeEventListener('drop', reset);
    };
  }, [fileDropPane]);

  // ── NEW: Handle Drop from History Panel ──
  const handleDropHistory = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if ((e.target as Element).closest?.('[data-zen-drop-root]')) return;

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

  const closePanel = useCallback(
    (id: string, options?: { notifyOrchestrator?: boolean; keepAgent?: boolean }) => {
      window.api?.send('terminal:history-delete', id);
      useCodeStore.getState().discardFileState(id);
      const closing = panelsRef.current.find((p) => p.id === id);
      if (
        closing?.type === 'terminal' &&
        (closing.reuseKey === 'debug:launch' || closing.reuseKey === 'debug:task')
      ) {
        void useDebugStore.getState().stop();
      }
      if (closing?.type === 'agent' && closing.workflowAgentId) {
        const store = useWorkflowStore.getState();
        const agentId = closing.workflowAgentId;
        if (agentId === 'orchestrator') {
          useWorkflowStore.setState((s) => ({ inbox: { ...s.inbox, orchestrator: [] } }));
        } else {
          const agent = store.getAgent(agentId);
          const orchestratorOpen = panelsRef.current.some(
            (p) => p.type === 'agent' && p.workflowAgentId === 'orchestrator',
          );
          if (agent && orchestratorOpen && options?.notifyOrchestrator !== false) {
            store.deliver(
              agentId,
              'orchestrator',
              `[SYSTEM NOTICE] The user closed the Zen tab of ${agent.type} agent '${agent.name}' (id: ${agentId}). The agent has been removed: any work it was doing is cancelled and any reply from it will not arrive. Create it again with create_agent if you still need it.`,
            );
          }
          if (!options?.keepAgent) store.removeAgent(agentId);
        }
      }
      dispatch({ type: 'close', id });
    },
    [],
  );

  useEffect(() => {
    const onCloseAgent = (e: Event) => {
      const d = (e as CustomEvent<{ sessionId: string; agentId: string }>).detail;
      if (d.sessionId !== sessionId) return;
      const target = panelsRef.current.find(
        (p) => p.type === 'agent' && p.workflowAgentId === d.agentId,
      );
      if (target) closePanel(target.id, { notifyOrchestrator: false });
    };
    window.addEventListener('phantoma:close-agent-panel', onCloseAgent);
    return () => window.removeEventListener('phantoma:close-agent-panel', onCloseAgent);
  }, [sessionId, closePanel]);

  const [pendingCloseId, setPendingCloseId] = useState<string | null>(null);
  const pendingClosePanel = pendingCloseId
    ? panels.find((p) => p.id === pendingCloseId)
    : undefined;

  const [pendingOrchestratorCloseId, setPendingOrchestratorCloseId] = useState<string | null>(null);
  const linkedAgentPanels = useMemo(
    () =>
      panels.filter(
        (p) => p.type === 'agent' && p.workflowAgentId && p.workflowAgentId !== 'orchestrator',
      ),
    [panels],
  );

  const [pendingHome, setPendingHome] = useState<{ proceed: () => void } | null>(null);

  useEffect(() => {
    const onGoHome = (e: Event) => {
      const d = (e as CustomEvent<{ handled?: boolean; proceed: () => void }>).detail;
      const hasOrchestrator = panelsRef.current.some(
        (p) => p.type === 'agent' && p.workflowAgentId === 'orchestrator',
      );
      if (!hasOrchestrator) return;
      d.handled = true;
      const hasLinked = panelsRef.current.some(
        (p) => p.type === 'agent' && p.workflowAgentId && p.workflowAgentId !== 'orchestrator',
      );
      if (hasLinked) setPendingHome({ proceed: d.proceed });
      else d.proceed();
    };
    window.addEventListener('phantoma:orchestrator-go-home', onGoHome);
    return () => window.removeEventListener('phantoma:orchestrator-go-home', onGoHome);
  }, []);

  const confirmGoHome = useCallback(() => {
    if (!pendingHome) return;
    panelsRef.current
      .filter(
        (p) => p.type === 'agent' && p.workflowAgentId && p.workflowAgentId !== 'orchestrator',
      )
      .forEach((p) => closePanel(p.id, { notifyOrchestrator: false, keepAgent: true }));
    pendingHome.proceed();
    setPendingHome(null);
  }, [pendingHome, closePanel]);

  const closeOrchestratorWorkflow = useCallback(() => {
    if (!pendingOrchestratorCloseId) return;
    panelsRef.current
      .filter(
        (p) => p.type === 'agent' && p.workflowAgentId && p.workflowAgentId !== 'orchestrator',
      )
      .forEach((p) => closePanel(p.id, { notifyOrchestrator: false }));
    closePanel(pendingOrchestratorCloseId);
    useWorkflowStore.getState().clearMessages();
    setPendingOrchestratorCloseId(null);
  }, [pendingOrchestratorCloseId, closePanel]);

  const requestClosePanel = useCallback(
    (id: string) => {
      const state = useCodeStore.getState();
      const isDirty = state.projects
        .find((p) => p.id === state.currentProjectId)
        ?.unsavedFiles.has(id);
      const panel = panels.find((p) => p.id === id);
      if (
        panel?.type === 'agent' &&
        panel.workflowAgentId === 'orchestrator' &&
        linkedAgentPanels.length > 0
      ) {
        setPendingOrchestratorCloseId(id);
        return;
      }
      if (panel?.type === 'file' && isDirty) {
        setPendingCloseId(id);
        return;
      }
      closePanel(id);
    },
    [panels, closePanel, linkedAgentPanels],
  );

  const saveAndClosePanel = useCallback(async () => {
    if (!pendingCloseId) return;
    const detail = { fileId: pendingCloseId, pending: [] as Promise<void>[] };
    window.dispatchEvent(new CustomEvent('code:save-file', { detail }));
    await Promise.all(detail.pending);
    closePanel(pendingCloseId);
  }, [pendingCloseId, closePanel]);
  const requestClosePanels = useCallback(
    (ids: string[]) => {
      const state = useCodeStore.getState();
      const unsaved = state.projects.find((p) => p.id === state.currentProjectId)?.unsavedFiles;
      ids.forEach((id) => {
        const panel = panelsRef.current.find((p) => p.id === id);
        if (!panel || panel.pinned) return;
        // ASSUMED: bulk close skips tabs that need a confirm dialog (unsaved file, orchestrator with linked agents)
        if (panel.type === 'file' && unsaved?.has(id)) return;
        if (
          panel.type === 'agent' &&
          panel.workflowAgentId === 'orchestrator' &&
          linkedAgentPanels.length > 0
        )
          return;
        closePanel(id);
      });
    },
    [closePanel, linkedAgentPanels],
  );
  const togglePinPanel = useCallback((id: string) => {
    const target = panelsRef.current.find((p) => p.id === id);
    if (target) dispatch({ type: 'pin', id, pinned: !target.pinned });
  }, []);
  const keepOpenPanel = useCallback(
    (id: string) => dispatch({ type: 'updatePanel', id, patch: { preview: false } }),
    [],
  );
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
    (id: string, conversationId: string | null) => {
      const panel = panelsRef.current.find((p) => p.id === id);
      if (conversationId && panel?.workflowAgentId === 'orchestrator') {
        const workflow = useWorkflowStore.getState();
        workflow.adoptOrphanMessages(conversationId);
        const subAgentIds = new Set<string>();
        useWorkflowStore.getState().messages.forEach((m) => {
          if (m.conversationId !== conversationId) return;
          [m.from, m.to].forEach((pid) => {
            if (pid !== 'orchestrator' && workflow.getAgent(pid)) subAgentIds.add(pid);
          });
        });
        subAgentIds.forEach((agentId) => {
          const agent = workflow.getAgent(agentId);
          if (!agent) return;
          window.dispatchEvent(
            new CustomEvent('phantoma:open-agent-panel', {
              detail: {
                sessionId,
                agentId,
                title: `${agent.type.charAt(0).toUpperCase()}${agent.type.slice(1)} - ${agent.name}`,
                done: () => {},
              },
            }),
          );
        });
      }
      dispatch({ type: 'updatePanel', id, patch: { agentConversationId: conversationId } });
    },
    [sessionId],
  );

  const updatePanelAgentTitle = useCallback(
    (id: string, title: string | null) =>
      dispatch({ type: 'updatePanel', id, patch: { agentTitle: title } }),
    [],
  );

  const updatePanelPatch = useCallback(
    (id: string, patch: Partial<WorkspacePanel>) => dispatch({ type: 'updatePanel', id, patch }),
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

  // ─── Keyboard Shortcuts ─────────────────────────────────────────────
  const setContentViewMode = useCodeStore((s) => s.setContentViewMode);
  const branchKey = useCurrentBranchKey();
  const setBranchTab = useActivityPanelStore((s) => s.setTab);
  const setAccountPanelOpen = useCodeStore((s) => s.setAccountPanelOpen);
  const setSkillPanelOpen = useCodeStore((s) => s.setSkillPanelOpen);
  const openActivityTab = useCallback(
    (tab: string) => {
      setAccountPanelOpen(false);
      setSkillPanelOpen(false);
      if (branchKey) setBranchTab(branchKey, tab as any);
    },
    [branchKey, setBranchTab, setAccountPanelOpen, setSkillPanelOpen],
  );

  useEffect(() => {
    if (!isActive || !isViewVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+` - Create new terminal (e.key is '~' while Shift is held, so match e.code;
      // checked before the input guard because xterm/Monaco focus a hidden textarea)
      if (e.ctrlKey && e.shiftKey && e.code === 'Backquote') {
        e.preventDefault();
        e.stopPropagation();
        addPanel('terminal');
        return;
      }

      // Ctrl+Shift+E/F/D/G - match e.code (e.key depends on CapsLock/layout/IME) and run
      // before the input guard so they work from any focused field
      if (e.ctrlKey && e.shiftKey && !e.altKey) {
        const panelShortcuts: Record<string, () => void> = {
          KeyE: () => openActivityTab('explore'),
          KeyF: () => openActivityTab('search'),
          KeyD: () => openActivityTab('debug'),
          KeyG: () => setContentViewMode('git'),
        };
        const run = panelShortcuts[e.code];
        if (run) {
          e.preventDefault();
          e.stopPropagation();
          run();
          return;
        }
      }

      const target = e.target as HTMLElement;
      // Monaco and xterm focus a hidden textarea, so those surfaces must keep the shortcuts working
      const inEditorSurface = !!target.closest?.('.xterm, .monaco-editor');
      // Skip if user is typing in an input/textarea/contenteditable
      if (
        !inEditorSurface &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

      // Ctrl+N - Create new temp markdown file
      if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key === 'n') {
        e.preventDefault();
        e.stopPropagation();
        dispatch({
          type: 'add',
          pane: resolvePaneForType('file'),
          panel: {
            id: createPanelId('file'),
            type: 'file',
            title: 'Untitled.md',
            providerId: null,
            filePath: '', // Empty path means temp file
            cwd: currentProjectPath,
            preview: false,
          },
        });
        return;
      }

      // Ctrl+O - Open file dialog
      if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key === 'o') {
        e.preventDefault();
        e.stopPropagation();
        window.api
          .invoke('dialog:select-paths', {
            kind: 'file',
            multiple: false,
            defaultPath: currentProjectPath,
          })
          .then((res: any) => {
            if (res?.success && res.paths?.[0]) {
              const filePath = res.paths[0];
              const fileName = filePath.split(/[\\/]/).pop() || 'file';
              const existing = panels.find((p) => p.type === 'file' && p.filePath === filePath);
              if (existing) {
                dispatch({ type: 'focus', id: existing.id });
              } else {
                dispatch({
                  type: 'add',
                  pane: resolvePaneForType('file'),
                  panel: {
                    id: createPanelId('file'),
                    type: 'file',
                    title: fileName,
                    providerId: null,
                    filePath,
                    preview: false,
                  },
                });
              }
            }
          })
          .catch((err) => console.error('[Workspace] Open file failed:', err));
        return;
      }


    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isActive, isViewVisible, addPanel, currentProjectPath, panels, openActivityTab, setContentViewMode]);

  useEffect(() => {
    const onTempFileSaved = (e: Event) => {
      const { fileId, filePath } = (e as CustomEvent<{ fileId: string; filePath: string }>).detail;
      dispatch({
        type: 'updatePanel',
        id: fileId,
        patch: { filePath, title: filePath.split(/[\\/]/).pop() ?? filePath },
      });
    };
    window.addEventListener('code:temp-file-saved', onTempFileSaved);
    return () => window.removeEventListener('code:temp-file-saved', onTempFileSaved);
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div
      className="flex-1 flex-col min-h-0 bg-background relative"
      style={{ display: isActive && isViewVisible ? 'flex' : 'none' }}
    >
      {pendingAdd && (
        <ConfirmSmartPlaceModal
          isOpen
          panelLabel={getPanelMeta(pendingAdd.type).label}
          currentPane={pendingAdd.pane}
          targetPane={pendingAdd.target}
          onClose={() => setPendingAdd(null)}
          onKeep={() => {
            addPanel(pendingAdd.type, pendingAdd.pane);
            setPendingAdd(null);
          }}
          onArrange={() => {
            addPanel(pendingAdd.type, pendingAdd.target);
            setPendingAdd(null);
          }}
        />
      )}

      {pendingOrchestratorCloseId && (
        <ConfirmDeleteOrchestratorModal
          isOpen
          linkedAgentCount={linkedAgentPanels.length}
          onClose={() => setPendingOrchestratorCloseId(null)}
          onConfirm={closeOrchestratorWorkflow}
        />
      )}

      {pendingHome && (
        <ConfirmDeleteOrchestratorModal
          isOpen
          action="home"
          linkedAgentCount={linkedAgentPanels.length}
          onClose={() => setPendingHome(null)}
          onConfirm={confirmGoHome}
        />
      )}

      {pendingClosePanel && (
        <ConfirmSaveFileModal
          isOpen
          fileName={pendingClosePanel.title}
          onClose={() => setPendingCloseId(null)}
          onSave={saveAndClosePanel}
          onDiscard={() => closePanel(pendingClosePanel.id)}
        />
      )}

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
                  onCloseTab={requestClosePanel}
                  onCloseTabs={requestClosePanels}
                  onTogglePin={togglePinPanel}
                  onKeepOpen={keepOpenPanel}
                  onDragStart={dnd.startTabDrag}
                  onAddPanel={(type) => requestAddPanel(type, pane)}
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
            if (
              !e.dataTransfer.types.includes('application/x-phantoma-open-file') ||
              (e.target as Element).closest?.('[data-zen-drop-root]')
            ) {
              setFileDropPane((prev) => (prev === null ? prev : null));
              return;
            }
            const box = contentRef.current?.getBoundingClientRect();
            if (!box || box.width <= 0 || box.height <= 0) return;
            const px = ((e.clientX - box.left) / box.width) * 100;
            const py = ((e.clientY - box.top) / box.height) * 100;
            const pane = getPaneAtPoint(px, py, occupied, sizes) ?? null;
            setFileDropPane((prev) => (prev === pane ? prev : pane));
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFileDropPane(null);
          }}
        >
          {panels.length === 0 ? (
            <WorkspaceEmptyState
              onAddPanel={(action) => addPanel(EMPTY_ACTION_TO_PANEL_TYPE[action])}
              onOpenCli={() => addPanel('agenttools')}
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
                onPanelPatch={updatePanelPatch}

                onProcessExit={handleProcessExit}
                onBindConversation={handleBindConversation}
                onResetConversation={handleResetConversation}
              />
              {fileDropRect && (
                <div
                  className="absolute pointer-events-none z-[150] bg-primary/10 border-2 border-dashed border-primary"
                  style={{
                    left: `${fileDropRect.left}%`,
                    top: `${fileDropRect.top}%`,
                    width: `${fileDropRect.width}%`,
                    height: `${fileDropRect.height}%`,
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export default WorkspaceViews;
