/**
 * ------------------------------------------------------------------
 * Debug Panel (Run & Debug)
 * ------------------------------------------------------------------
 * Tab Run & Debug của Activity Panel: đọc `.vscode/launch.json` của
 * project hiện tại và hiển thị mỗi configuration thành 1 card (nền đặc,
 * không viền). Click card để mở phần thao tác (Start, hoặc thanh điều
 * khiển khi đang debug). Thêm/sửa/xóa configuration bằng cách mở
 * launch.json thành file tab trong Workspace. Logic DAP: useDebugStore.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useCallback, useEffect, useState } from 'react';

// ── UI ──
import {
  Play,
  Square,
  RotateCcw,
  RefreshCw,
  Bug,
  Terminal,
  Globe,
  Puzzle,
  Pencil,
  Plus,
} from 'lucide-react';

// ── Hooks ──
import { useCodeStore } from '../../../hooks/useCodeStore';
import { useDebugStore, type DebugConfiguration, type DebugStatus } from '../../../stores/useDebugStore';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';

// ─── Types & Constants ──────────────────────────────────────────────────
type DebugActions = ReturnType<typeof useDebugStore.getState>;

const STATUS_BADGE: Record<
  Exclude<DebugStatus, 'idle'>,
  { label: string; dot: string; text: string }
> = {
  starting: { label: 'Starting', dot: 'bg-amber-400 animate-pulse', text: 'text-amber-400' },
  running: { label: 'Running', dot: 'bg-emerald-400 animate-pulse', text: 'text-emerald-400' },
  stopped: { label: 'Paused', dot: 'bg-amber-400', text: 'text-amber-400' },
};

const ACCENT_COLORS = [
  '#f97316',
  '#22c55e',
  '#3b82f6',
  '#a855f7',
  '#ec4899',
  '#eab308',
  '#14b8a6',
  '#ef4444',
];

const pickAccent = () => ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)];

function typeIcon(type: string) {
  if (type.includes('chrome') || type.includes('edge')) return Globe;
  if (type.includes('extensionHost')) return Puzzle;
  return Terminal;
}

// ─── Sub-components ─────────────────────────────────────────────────────
function IconButton({
  title,
  onClick,
  disabled,
  className,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-sidebar-item-hover hover:text-text-primary disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-text-secondary',
        className,
      )}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: Exclude<DebugStatus, 'idle'> }) {
  const badge = STATUS_BADGE[status];
  return (
    <span
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-full bg-sidebar-background px-2 py-0.5 text-[10px] font-medium',
        badge.text,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', badge.dot)} />
      {badge.label}
    </span>
  );
}

function MessageBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-red-500/10 px-3 py-2 text-xs break-words text-red-400">
      {children}
    </div>
  );
}

function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center opacity-70">
      <span className="grid h-12 w-12 place-items-center rounded-xl border border-border bg-card-hover text-text-secondary">
        <Bug className="h-6 w-6" />
      </span>
      <div>
        <span className="mb-1 block text-sm font-medium text-text-primary">{title}</span>
        {hint && (
          <span className="mx-auto block max-w-[200px] text-xs leading-relaxed text-text-secondary">
            {hint}
          </span>
        )}
      </div>

    </div>
  );
}

function ConfigCard({
  config,
  projectPath,
  locked,
  status,
  actions,
}: {
  config: DebugConfiguration;
  projectPath: string;
  locked: boolean;
  status: DebugStatus;
  actions: DebugActions;
}) {
  const Icon = typeIcon(config.type);
  const active = status !== 'idle';
  const raw = config.program ?? config.url ?? config.runtimeExecutable ?? config.file;
  const detail = typeof raw === 'string' ? raw.replace(projectPath, '.') : '';
  const [accent, setAccent] = useState(pickAccent);

  useEffect(() => {
    if (active) setAccent(pickAccent());
  }, [active]);

  const handleStart = () => {
    actions.selectConfiguration(config.name);
    void actions.start();
  };

  return (
    <div
      className={cn(
        'group flex items-center gap-3 border-l-[3px] border-l-transparent bg-card-background px-3 py-2.5 transition-colors',
        active ? 'rounded-l-[4px] rounded-r-xl' : 'rounded-xl',
        locked && 'opacity-50',
      )}
      style={active ? { borderLeftColor: accent } : undefined}
      title={detail || undefined}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-background text-text-secondary transition-colors"
        style={active ? { backgroundColor: `${accent}26`, color: accent } : undefined}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold text-text-primary">
          {config.name}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-text-secondary">
          {config.type} · {config.request}
        </span>
      </span>
      {active ? (
        <div className="flex shrink-0 items-center gap-0.5">
          {status !== 'running' && <StatusBadge status={status} />}
          <IconButton title="Restart" onClick={() => void actions.restart()}>
            <RotateCcw className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            title="Stop"
            onClick={() => void actions.stop()}
            className="hover:text-red-400"
          >
            <Square className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      ) : (
        !locked && (
          <IconButton
            title="Start Debugging"
            onClick={handleStart}
            className="text-emerald-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-emerald-400 focus-visible:opacity-100"
          >
            <Play className="h-3.5 w-3.5" />
          </IconButton>
        )
      )}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────
export function Debug() {
  // ── Store ──
  const projectPath = useCodeStore((s) => {
    const p = s.projects.find((x) => x.id === s.currentProjectId);
    return p?.explorerRoot ?? p?.path;
  });
  const configurations = useDebugStore((s) => s.configurations);
  const selectedName = useDebugStore((s) => s.selectedName);
  const launchExists = useDebugStore((s) => s.launchExists);
  const loadError = useDebugStore((s) => s.loadError);
  const status = useDebugStore((s) => s.status);
  const error = useDebugStore((s) => s.error);
  const actions = useDebugStore.getState();

  // ── State ──
  const [notice, setNotice] = useState<string | null>(null);

  // ── Derived ──
  const idle = status === 'idle';

  // ── Effects ──
  // Đồng bộ launch.json: đọc lại khi đổi project hoặc khi phiên debug kết thúc
  useEffect(() => {
    if (idle) void useDebugStore.getState().loadConfigurations(projectPath);
  }, [projectPath, idle]);

  // launch.json được sửa/tạo/xóa → watcher báo `fs:dir-changed` → đọc lại ngay
  useEffect(() => {
    if (!projectPath) return;
    const api = (window as any).api;
    const root = projectPath.replace(/\\/g, '/');
    void api.invoke('fs:watch-dir', projectPath).catch(() => undefined);
    const off = api.on(
      'fs:dir-changed',
      (_e: unknown, p: { dirPath: string; projectPath: string }) => {
        if (p.projectPath !== projectPath) return;
        const dir = p.dirPath.replace(/\\/g, '/');
        if (dir !== root && !dir.endsWith('/.vscode')) return;
        if (useDebugStore.getState().status !== 'idle') return;
        void useDebugStore.getState().loadConfigurations(projectPath);
      },
    );
    return () => {
      off?.();
      void api.invoke('fs:unwatch-dir', projectPath).catch(() => undefined);
    };
  }, [projectPath]);

  // ── Handlers ──
  const openLaunchFile = useCallback(async () => {
    if (!projectPath) return;
    setNotice(null);
    if (!useDebugStore.getState().launchExists) {
      const res = await (window as any).api.invoke('debug:create-launch', projectPath);
      if (!res?.ok) {
        setNotice(res?.error ?? 'Cannot create launch.json');
        return;
      }
      await useDebugStore.getState().loadConfigurations(projectPath);
    }
    const store = useCodeStore.getState();
    const sessionId = store.activeWorkspaceSessionId;
    if (!sessionId) {
      setNotice('Open a workspace tab first to edit launch.json');
      return;
    }
    // ASSUMED: dùng dấu / cho đường dẫn, giống các chỗ khác trong module Code
    store.requestOpenFile(sessionId, `${projectPath}/.vscode/launch.json`, 'launch.json');
  }, [projectPath]);

  // ── Render ──
  return (
    <div className="flex min-h-0 flex-1 flex-col text-xs text-text-primary">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border px-3">
        <span className="text-[11px] font-semibold tracking-wide text-text-secondary uppercase">
          Run and Debug
        </span>
        <div className="flex items-center gap-0.5">
          <IconButton
            title={launchExists ? 'Edit launch.json' : 'Create launch.json'}
            disabled={!projectPath}
            onClick={() => void openLaunchFile()}
          >
            {launchExists ? (
              <Pencil className="h-3.5 w-3.5" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
          </IconButton>
          <IconButton
            title="Reload configurations"
            disabled={!idle}
            onClick={() => void actions.loadConfigurations(projectPath)}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
        {!projectPath ? (
          <EmptyState title="No project opened" hint="Open a project to run and debug it." />
        ) : loadError ? (
          <>
            <MessageBox>{loadError}</MessageBox>
            <EmptyState
              title="Cannot read launch.json"
              hint="Click the edit button above to fix the file."
            />
          </>
        ) : !launchExists ? (
          <EmptyState
            title="No launch.json found"
            hint="Click the + button above to create .vscode/launch.json."
          />
        ) : configurations.length === 0 ? (
          <EmptyState
            title="No configurations"
            hint="Click the edit button above to add a configuration to launch.json."
          />
        ) : (
          [...configurations]
            .sort(
              (a, b) =>
                Number(!idle && b.name === selectedName) - Number(!idle && a.name === selectedName),
            )
            .map((config) => (
              <ConfigCard
                key={config.name}
                config={config}
                projectPath={projectPath}
                locked={!idle && config.name !== selectedName}
                status={config.name === selectedName ? status : 'idle'}
                actions={actions}
              />
            ))
        )}

        {notice && <MessageBox>{notice}</MessageBox>}
        {error && <MessageBox>{error}</MessageBox>}
      </div>
    </div>
  );
}