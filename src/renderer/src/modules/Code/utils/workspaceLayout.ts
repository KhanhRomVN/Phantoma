/**
 * ------------------------------------------------------------------
 * Workspace layout — pure logic (no React / no JSX)
 * ------------------------------------------------------------------
 * The workspace is a 2x2 grid of panes:
 *
 *      ┌──────┬──────┐
 *      │  tl  │  tr  │
 *      ├──────┼──────┤
 *      │  bl  │  br  │
 *      └──────┴──────┘
 *
 * Each pane owns an ordered list of tabs. A pane only exists on screen
 * while it has at least one tab; the visible layout is *derived* from  
 * which panes are occupied (see `computeRects`):
 *   - only `tl`              → 1 pane, full area
 *   - `tl` + `tr`            → 2 panes side by side
 *   - `tl` + `bl`            → 2 panes stacked
 *   - `tl` + `tr` + `br` ... → 3 panes, etc.
 *   - all four               → 2x2
 *
 * All workspace state (panels + layout) lives in one reducer so that
 * every transition keeps the two in sync.
 * ------------------------------------------------------------------
 */

// ─── Types ────────────────────────────────────────────────────────────

export type PanelType = 'terminal' | 'website' | 'emulator' | 'file' | 'agent';

export interface WorkspacePanel {
  id: string;
  type: PanelType;
  title: string;
  content?: string;
  /** Đường dẫn tuyệt đối của file khi type === 'file' */
  filePath?: string;
  preview?: boolean;
  /** Working directory for this specific panel (crucial to prevent restart on session switch) */
  cwd?: string;
  sessionId?: string;
  /** Detected AI Provider ID (for terminals) */
  providerId?: string | null;

  // ── NEW: ZenCLI session binding for auto-resume ──
  /** Conversation ID của ZenCLI đang bind với terminal này. null nếu chưa bind. */
  zencliConversationId?: string | null;
  /** Timestamp lần cuối user tương tác với conversation này (để quyết định "active"). */
  zencliLastActiveAt?: number | null;
  /** Conversation ID của Agent panel, dùng để khôi phục sau khi restart app. */
  agentConversationId?: string | null;
  /** Title conversation hiện tại của Agent panel, hiển thị trên tab dạng 'Zen|<title>'. */
  agentTitle?: string | null;
  /** ID của workflow agent (vd. 'orchestrator') mà Zen tab này đang liên kết; model + account được đồng bộ với AgentCard. */
  workflowAgentId?: string | null;
  /** Terminal đang chạy tiến trình foreground (runtime-only, dùng cho icon xanh trên tab). */
  terminalRunning?: boolean;
  /** Tên tiến trình đang chạy trong terminal (runtime-only). */
  terminalProcess?: string | null;
  /** Title trang web hiện tại của Browser panel (runtime-only). */
  browserTitle?: string | null;
  /** Favicon URL của trang web hiện tại của Browser panel (runtime-only). */
  browserFavicon?: string | null;
}

export type PaneId = 'tl' | 'tr' | 'bl' | 'br';

export const PANE_IDS: readonly PaneId[] = ['tl', 'tr', 'bl', 'br'];

/** Height of each pane's tab bar in px. */
export const TABBAR_HEIGHT = 36;

const MIN_SIZE = 20;
const MAX_SIZE = 80;

/** All sizes are percentages (0-100) of the workspace content area. */
export interface LayoutSizes {
  /** Position of the vertical divider (left/right split). */
  col: number;
  /** Position of the horizontal divider inside the left column. */
  rowLeft: number;
  /** Position of the horizontal divider inside the right column. */
  rowRight: number;
}

export type ResizeHandle = keyof LayoutSizes;

/** A pane's rectangle, in percent of the workspace content area. */
export interface PaneRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type PaneRects = Partial<Record<PaneId, PaneRect>>;
export type PaneTabs = Record<PaneId, string[]>;
export type PaneActive = Record<PaneId, string | null>;

export interface WorkspaceState {
  panels: WorkspacePanel[];
  paneTabs: PaneTabs;
  paneActive: PaneActive;
  focusedPane: PaneId;
  sizes: LayoutSizes;
}

// ─── Helpers ──────────────────────────────────────────────────────────

const emptyTabs = (): PaneTabs => ({ tl: [], tr: [], bl: [], br: [] });
const noActive = (): PaneActive => ({ tl: null, tr: null, bl: null, br: null });

export const DEFAULT_SIZES: LayoutSizes = { col: 50, rowLeft: 50, rowRight: 50 };

const clamp = (n: number) => Math.max(MIN_SIZE, Math.min(MAX_SIZE, n));

export function getOccupiedPanes(paneTabs: PaneTabs): PaneId[] {
  return PANE_IDS.filter((pane) => paneTabs[pane].length > 0);
}

export function findPaneOfPanel(paneTabs: PaneTabs, panelId: string): PaneId | null {
  return PANE_IDS.find((pane) => paneTabs[pane].includes(panelId)) ?? null;
}

/**
 * Compute the rectangle of every occupied pane.
 * Empty panes give their space to their neighbour.
 */
export function computeRects(occupied: readonly PaneId[], sizes: LayoutSizes): PaneRects {
  const has = (pane: PaneId) => occupied.includes(pane);
  const leftCol = has('tl') || has('bl');
  const rightCol = has('tr') || has('br');
  const bothCols = leftCol && rightCol;

  const columns = [
    {
      top: 'tl' as const,
      bottom: 'bl' as const,
      exists: leftCol,
      left: 0,
      width: bothCols ? sizes.col : 100,
      row: sizes.rowLeft,
    },
    {
      top: 'tr' as const,
      bottom: 'br' as const,
      exists: rightCol,
      left: bothCols ? sizes.col : 0,
      width: bothCols ? 100 - sizes.col : 100,
      row: sizes.rowRight,
    },
  ];

  const rects: PaneRects = {};
  for (const col of columns) {
    if (!col.exists) continue;
    const hasTop = has(col.top);
    const hasBottom = has(col.bottom);

    if (hasTop && hasBottom) {
      rects[col.top] = { left: col.left, top: 0, width: col.width, height: col.row };
      rects[col.bottom] = { left: col.left, top: col.row, width: col.width, height: 100 - col.row };
    } else {
      rects[hasTop ? col.top : col.bottom] = {
        left: col.left,
        top: 0,
        width: col.width,
        height: 100,
      };
    }
  }
  return rects;
}

/**
 * Which pane (quadrant) is under the given point?
 * Uses the real divider positions where they exist, otherwise the 50% midlines,
 * so an empty quadrant can be targeted to create a new pane.
 */
export function getPaneAtPoint(
  xPct: number,
  yPct: number,
  occupied: readonly PaneId[],
  sizes: LayoutSizes,
): PaneId {
  const has = (pane: PaneId) => occupied.includes(pane);
  const bothCols = (has('tl') || has('bl')) && (has('tr') || has('br'));
  const colBoundary = bothCols ? sizes.col : 50;
  const isRight = xPct >= colBoundary;

  const top: PaneId = isRight ? 'tr' : 'tl';
  const bottom: PaneId = isRight ? 'br' : 'bl';
  const bothRows = has(top) && has(bottom);
  const rowBoundary = bothRows ? (isRight ? sizes.rowRight : sizes.rowLeft) : 50;

  return yPct < rowBoundary ? top : bottom;
}

// ─── Reducer ──────────────────────────────────────────────────────────

export type WorkspaceAction =
  | {
      type: 'reset';
      panels: WorkspacePanel[];
      activeId: string | null;
      layout?: WorkspaceLayoutSnapshot;
    }
  | { type: 'add'; panel: WorkspacePanel; pane?: PaneId; background?: boolean }
  | { type: 'close'; id: string }
  | { type: 'select'; pane: PaneId; id: string }
  | { type: 'focus'; id: string }
  | { type: 'move'; id: string; to: PaneId }
  | { type: 'resize'; handle: ResizeHandle; value: number }
  | { type: 'updatePanel'; id: string; patch: Partial<Omit<WorkspacePanel, 'id'>> };

export interface WorkspaceLayoutSnapshot {
  paneTabs: PaneTabs;
  paneActive: PaneActive;
  focusedPane: PaneId;
  sizes: LayoutSizes;
}

export function createInitialState(
  panels: WorkspacePanel[],
  activeId: string | null,
  layout?: WorkspaceLayoutSnapshot,
): WorkspaceState {
  const ids = panels.map((p) => p.id);
  if (layout) {
    const valid = new Set(ids);
    const placed = new Set<string>();
    const paneTabs = emptyTabs();
    const paneActive = noActive();
    for (const pane of PANE_IDS) {
      paneTabs[pane] = (layout.paneTabs?.[pane] ?? []).filter(
        (id) => valid.has(id) && !placed.has(id),
      );
      paneTabs[pane].forEach((id) => placed.add(id));
      const saved = layout.paneActive?.[pane];
      paneActive[pane] =
        saved && paneTabs[pane].includes(saved) ? saved : (paneTabs[pane][0] ?? null);
    }
    const orphans = ids.filter((id) => !placed.has(id));
    if (orphans.length > 0) {
      paneTabs.tl = [...paneTabs.tl, ...orphans];
      paneActive.tl = paneActive.tl ?? orphans[0];
    }
    const restored = normalize({
      panels,
      paneTabs,
      paneActive,
      focusedPane: layout.focusedPane ?? 'tl',
      sizes: { ...DEFAULT_SIZES, ...layout.sizes },
    });
    return restored;
  }
  const active = activeId && ids.includes(activeId) ? activeId : (ids[0] ?? null);
  return {
    panels,
    paneTabs: { ...emptyTabs(), tl: ids },
    paneActive: { ...noActive(), tl: active },
    focusedPane: 'tl',
    sizes: DEFAULT_SIZES,
  };
}

/** Remove a tab from whichever pane holds it, choosing a new active tab if needed. */
function detachPanel(state: WorkspaceState, id: string) {
  const paneTabs = { ...state.paneTabs };
  const paneActive = { ...state.paneActive };

  for (const pane of PANE_IDS) {
    const list = paneTabs[pane];
    const index = list.indexOf(id);
    if (index === -1) continue;

    const remaining = list.filter((tabId) => tabId !== id);
    paneTabs[pane] = remaining;
    if (paneActive[pane] === id) {
      paneActive[pane] = remaining[Math.min(index, remaining.length - 1)] ?? null;
    }
  }
  return { paneTabs, paneActive };
}

/** Keep the layout tidy: a lone pane always lives in `tl`; focus never points at an empty pane. */
function normalize(state: WorkspaceState): WorkspaceState {
  const occupied = getOccupiedPanes(state.paneTabs);

  if (occupied.length === 1 && occupied[0] !== 'tl') {
    const only = occupied[0];
    return {
      ...state,
      paneTabs: { ...emptyTabs(), tl: state.paneTabs[only] },
      paneActive: { ...noActive(), tl: state.paneActive[only] },
      focusedPane: 'tl',
    };
  }
  if (!occupied.includes(state.focusedPane)) {
    return { ...state, focusedPane: occupied[0] ?? 'tl' };
  }
  return state;
}

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'reset':
      return createInitialState(action.panels, action.activeId, action.layout);

    case 'add': {
      const base = state;
      const pane: PaneId = action.pane ?? state.focusedPane;
      const { id } = action.panel;
      const keepFocus =
        !!action.background &&
        !!base.paneActive[pane] &&
        base.paneTabs[base.focusedPane]?.length > 0;

      return normalize({
        ...base,
        panels: [...base.panels, action.panel],
        paneTabs: { ...base.paneTabs, [pane]: [...base.paneTabs[pane], id] },
        paneActive: keepFocus ? base.paneActive : { ...base.paneActive, [pane]: id },
        focusedPane:
          action.background && base.paneTabs[base.focusedPane]?.length > 0
            ? base.focusedPane
            : pane,
      });
    }

    case 'close': {
      if (!state.panels.some((p) => p.id === action.id)) return state;
      const { paneTabs, paneActive } = detachPanel(state, action.id);
      return normalize({
        ...state,
        panels: state.panels.filter((p) => p.id !== action.id),
        paneTabs,
        paneActive,
      });
    }

    case 'select':
      return {
        ...state,
        paneActive: { ...state.paneActive, [action.pane]: action.id },
        focusedPane: action.pane,
      };

    case 'focus': {
      const pane = findPaneOfPanel(state.paneTabs, action.id);
      if (!pane) return state;
      if (state.paneActive[pane] === action.id && state.focusedPane === pane) return state;
      return {
        ...state,
        paneActive: { ...state.paneActive, [pane]: action.id },
        focusedPane: pane,
      };
    }

    case 'move': {
      const from = findPaneOfPanel(state.paneTabs, action.id);
      if (!from || from === action.to) return state;

      const { paneTabs, paneActive } = detachPanel(state, action.id);
      return normalize({
        ...state,
        paneTabs: { ...paneTabs, [action.to]: [...paneTabs[action.to], action.id] },
        paneActive: { ...paneActive, [action.to]: action.id },
        focusedPane: action.to,
      });
    }

    case 'resize': {
      const value = clamp(action.value);
      if (state.sizes[action.handle] === value) return state;
      return { ...state, sizes: { ...state.sizes, [action.handle]: value } };
    }

    case 'updatePanel': {
      const target = state.panels.find((p) => p.id === action.id);
      if (!target) return state;
      const changed = (Object.keys(action.patch) as (keyof typeof action.patch)[]).some(
        (key) => target[key] !== action.patch[key],
      );
      if (!changed) return state;
      return {
        ...state,
        panels: state.panels.map((p) => (p.id === action.id ? { ...p, ...action.patch } : p)),
      };
    }

    default:
      return state;
  }
}

/**
 * Where would `id` end up if dropped on `to`? Used for the drop preview.
 * Returns null when the drop would change nothing.
 */
export function previewDropRect(state: WorkspaceState, id: string, to: PaneId): PaneRect | null {
  const next = workspaceReducer(state, { type: 'move', id, to });
  if (next === state) return null;
  return computeRects(getOccupiedPanes(next.paneTabs), next.sizes)[next.focusedPane] ?? null;
}
