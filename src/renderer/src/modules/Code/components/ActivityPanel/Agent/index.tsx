/**
 * ------------------------------------------------------------------
 * Agent History
 * ------------------------------------------------------------------
 * Activity sidebar tab listing chat history of external coding
 * agents (Claude Code, Kiro, Codex, OpenCode, Qwen Code, Codebuff).
 * Sessions are loaded from the main process via `agent:list-sessions`.
 *
 * Main features:
 * - 3 scopes: Workspace (folder path) / Project (branch) / All
 * - Filter by agent (icon chips) and free-text search
 * - Sessions grouped by date (Hôm nay, Hôm qua, ...)
 * - AgentCard: title (user message) / response / icon + time + messages
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useState, useEffect, useMemo, useCallback } from 'react';

// ── UI ──
import {
  Bot,
  Terminal,
  Sparkles,
  Ghost,
  Code2,
  Zap,
  RefreshCw,
  Search as SearchIcon,
  Folder,
  GitBranch,
  Globe,
  MessageSquare,
  Clock,
  AlertCircle,
  History,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';

// ── Hooks ──
import { useCodeStore } from '../../../hooks/useCodeStore';

// ─── Types ──────────────────────────────────────────────────────────────
export type AgentId = 'claude-code' | 'kiro' | 'codex' | 'opencode' | 'qwen-code' | 'codebuff';

type Scope = 'workspace' | 'project' | 'all';

/** Payload trả về từ IPC `agent:list-sessions` */
export interface AgentSession {
  id: string;
  agent: AgentId;
  /** User message đầu tiên của session */
  title: string;
  /** Response gần nhất / đầu tiên của agent */
  response: string;
  /** Thư mục làm việc của session */
  cwd: string;
  /** Git branch tại thời điểm chạy session (nếu có) */
  branch?: string;
  /** Unix ms */
  updatedAt: number;
  messageCount: number;
}

// ─── Constants ──────────────────────────────────────────────────────────
const AGENTS: Record<AgentId, { label: string; icon: LucideIcon; color: string }> = {
  'claude-code': { label: 'Claude Code', icon: Sparkles, color: 'rgb(217, 119, 87)' },
  kiro: { label: 'Kiro', icon: Ghost, color: 'rgb(160, 120, 255)' },
  codex: { label: 'Codex', icon: Terminal, color: 'rgb(61, 220, 132)' },
  opencode: { label: 'OpenCode', icon: Code2, color: 'rgb(79, 168, 224)' },
  'qwen-code': { label: 'Qwen Code', icon: Bot, color: 'rgb(139, 92, 246)' },
  codebuff: { label: 'Codebuff', icon: Zap, color: 'rgb(255, 176, 32)' },
};

const AGENT_IDS = Object.keys(AGENTS) as AgentId[];

const SCOPES: { id: Scope; label: string }[] = [
  { id: 'workspace', label: 'Workspace' },
  { id: 'project', label: 'Project' },
  { id: 'all', label: 'All' },
];

const DAY_MS = 86_400_000;

// ─── Helpers ────────────────────────────────────────────────────────────
const normalizePath = (p?: string) => (p || '').replace(/\\/g, '/').replace(/\/+$/, '');

/** rgb(r, g, b) → rgba(r, g, b, a) */
const withAlpha = (rgb: string, a: number) => rgb.replace('rgb(', 'rgba(').replace(')', `, ${a})`);

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'vừa xong';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} phút trước`;
  if (diff < DAY_MS) return `${Math.floor(diff / 3_600_000)} giờ trước`;
  if (diff < 7 * DAY_MS) return `${Math.floor(diff / DAY_MS)} ngày trước`;
  return new Date(ts).toLocaleDateString('vi-VN');
}

function bucketOf(ts: number): string {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (ts >= startToday) return 'Hôm nay';
  if (ts >= startToday - DAY_MS) return 'Hôm qua';
  if (ts >= startToday - 6 * DAY_MS) return '7 ngày qua';
  if (ts >= startToday - 29 * DAY_MS) return '30 ngày qua';
  return 'Cũ hơn';
}

// ─── AgentBadge ─────────────────────────────────────────────────────────
function AgentBadge({ agent }: { agent: AgentId }) {
  const meta = AGENTS[agent];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <span
      className="inline-flex items-center justify-center w-4 h-4 rounded shrink-0"
      style={{ backgroundColor: withAlpha(meta.color, 0.15), color: meta.color }}
      title={meta.label}
    >
      <Icon className="w-2.5 h-2.5" strokeWidth={2} />
    </span>
  );
}

// ─── AgentCard ──────────────────────────────────────────────────────────
interface AgentCardProps {
  session: AgentSession;
  selected: boolean;
  onSelect: (id: string) => void;
}

function AgentCard({ session, selected, onSelect }: AgentCardProps) {
  return (
    <button
      onClick={() => onSelect(session.id)}
      className={cn(
        'w-full text-left px-2.5 py-2 rounded-md border transition-colors',
        selected
          ? 'bg-card-hover border-primary/40'
          : 'bg-card-background border-transparent hover:bg-card-hover hover:border-border',
      )}
      title={session.cwd}
    >
      {/* Dòng 1: title (user message) */}
      <div className="text-[13px] font-medium text-text-primary truncate">
        {session.title || '(không có nội dung)'}
      </div>

      {/* Dòng 2: response */}
      <div className="mt-0.5 text-xs text-text-secondary truncate">{session.response || '—'}</div>

      {/* Dòng 3: agent icon, time, total message */}
      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-text-secondary/70">
        <AgentBadge agent={session.agent} />
        <span className="flex items-center gap-1 min-w-0">
          <Clock className="w-3 h-3 shrink-0" strokeWidth={1.5} />
          <span className="truncate">{formatRelative(session.updatedAt)}</span>
        </span>
        <span className="ml-auto flex items-center gap-1 shrink-0 tabular-nums">
          <MessageSquare className="w-3 h-3" strokeWidth={1.5} />
          {session.messageCount}
        </span>
      </div>
    </button>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="px-2.5 py-2 rounded-md bg-card-background animate-pulse space-y-1.5">
      <div className="h-3 w-2/3 rounded bg-card-hover" />
      <div className="h-2.5 w-full rounded bg-card-hover" />
      <div className="h-2.5 w-1/3 rounded bg-card-hover" />
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────
export function Agent() {
  // ── Store ──
  const projectPath = useCodeStore(
    (s) => s.projects.find((p) => p.id === s.currentProjectId)?.path,
  );

  // ── State ──
  const [scope, setScope] = useState<Scope>('workspace');
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [currentBranch, setCurrentBranch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  const [activeAgents, setActiveAgents] = useState<Set<AgentId>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ── Load sessions + current branch ──
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const api = (window as any).api;
    try {
      const [list, git] = await Promise.all([
        api.invoke('agent:list-sessions', { projectPath }),
        projectPath
          ? api.invoke('git:status', projectPath).catch(() => null)
          : Promise.resolve(null),
      ]);
      setSessions(Array.isArray(list) ? list : []);
      setCurrentBranch(git?.branch || '');
    } catch (e: any) {
      setError(e?.message || 'Không tải được lịch sử agent');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Derived: scope predicates ──
  const inWorkspace = useCallback(
    (s: AgentSession) => {
      const root = normalizePath(projectPath);
      const cwd = normalizePath(s.cwd);
      return !!root && (cwd === root || cwd.startsWith(root + '/'));
    },
    [projectPath],
  );

  const inProject = useCallback(
    (s: AgentSession) => inWorkspace(s) && !!currentBranch && s.branch === currentBranch,
    [inWorkspace, currentBranch],
  );

  const counts = useMemo(
    () => ({
      workspace: sessions.filter(inWorkspace).length,
      project: sessions.filter(inProject).length,
      all: sessions.length,
    }),
    [sessions, inWorkspace, inProject],
  );

  // ── Derived: filtered + grouped ──
  const grouped = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    const predicate = scope === 'workspace' ? inWorkspace : scope === 'project' ? inProject : null;

    const list = sessions
      .filter((s) => (predicate ? predicate(s) : true))
      .filter((s) => activeAgents.size === 0 || activeAgents.has(s.agent))
      .filter(
        (s) => !q || s.title?.toLowerCase().includes(q) || s.response?.toLowerCase().includes(q),
      )
      .sort((a, b) => b.updatedAt - a.updatedAt);

    const map = new Map<string, AgentSession[]>();
    for (const s of list) {
      const key = bucketOf(s.updatedAt);
      const bucket = map.get(key);
      if (bucket) bucket.push(s);
      else map.set(key, [s]);
    }
    return { total: list.length, groups: Array.from(map.entries()) };
  }, [sessions, scope, inWorkspace, inProject, activeAgents, filterText]);

  // ── Handlers ──
  const toggleAgent = useCallback((id: AgentId) => {
    setActiveAgents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    // TODO: mở chi tiết / resume session (cần IPC `agent:open-session`)
  }, []);

  // ── Render ──
  const contextLabel =
    scope === 'workspace'
      ? { icon: Folder, text: projectPath || 'Chưa mở project' }
      : scope === 'project'
        ? { icon: GitBranch, text: currentBranch || 'Không xác định branch' }
        : { icon: Globe, text: 'Tất cả project trên máy' };
  const ContextIcon = contextLabel.icon;

  return (
    <div className="flex flex-col h-full bg-sidebar-background">
      {/* HeaderBar — đồng bộ với FileExplore */}
      <div className="flex items-center justify-between h-9 px-2 border-b border-divider flex-shrink-0 bg-sidebar-background">
        <span className="text-[11px] font-medium uppercase tracking-wide text-text-secondary truncate">
          Agent History
        </span>
        <button
          onClick={load}
          disabled={loading}
          className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} strokeWidth={1.5} />
        </button>
      </div>

      {/* Scope tabs */}
      <div className="shrink-0 p-2 pb-1.5">
        <div className="flex p-0.5 gap-0.5 rounded-lg bg-card-background border border-border">
          {SCOPES.map((t) => {
            const active = scope === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setScope(t.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-md text-xs transition-colors',
                  active
                    ? 'bg-card-hover text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary',
                )}
              >
                {t.label}
                <span
                  className={cn(
                    'text-[10px] tabular-nums',
                    active ? 'text-primary' : 'text-text-secondary/60',
                  )}
                >
                  {counts[t.id]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Scope context */}
        <div
          className="mt-1.5 flex items-center gap-1.5 px-1 text-[11px] text-text-secondary/70 min-w-0"
          title={contextLabel.text}
        >
          <ContextIcon className="w-3 h-3 shrink-0" strokeWidth={1.5} />
          <span className="truncate">{contextLabel.text}</span>
        </div>
      </div>

      {/* Filter: text + agent chips */}
      <div className="shrink-0 px-2 pb-2 border-b border-divider space-y-1.5">
        <div className="flex items-center gap-1.5 px-2 py-1 bg-input-background border border-border rounded-md focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/30 transition-colors">
          <SearchIcon className="w-3.5 h-3.5 text-text-secondary/40 shrink-0" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Lọc theo nội dung..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="flex-1 min-w-0 bg-transparent outline-none text-xs text-text-primary placeholder:text-text-secondary/40"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto [&::-webkit-scrollbar]:h-0">
          {AGENT_IDS.map((id) => {
            const meta = AGENTS[id];
            const Icon = meta.icon;
            const active = activeAgents.has(id);
            return (
              <button
                key={id}
                onClick={() => toggleAgent(id)}
                title={meta.label}
                aria-pressed={active}
                className={cn(
                  'p-1 rounded-md border transition-colors shrink-0',
                  active ? 'border-transparent' : 'border-transparent opacity-50 hover:opacity-100',
                )}
                style={
                  active
                    ? { backgroundColor: withAlpha(meta.color, 0.18), color: meta.color }
                    : { color: meta.color }
                }
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {error && (
          <div className="mb-2 p-2 bg-error/10 border border-error/20 rounded-md flex items-start gap-2 text-[11px] text-error">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" strokeWidth={1.5} />
            <span className="break-words min-w-0">{error}</span>
          </div>
        )}

        {loading && sessions.length === 0 && (
          <div className="space-y-1.5">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        )}

        {!loading && !error && grouped.total === 0 && (
          <div className="flex flex-col items-center gap-2 p-6 text-text-secondary/50">
            <History className="w-6 h-6" strokeWidth={1.25} />
            <span className="text-xs text-center">
              {scope === 'project' && !currentBranch
                ? 'Không đọc được branch hiện tại'
                : 'Chưa có lịch sử agent nào'}
            </span>
          </div>
        )}

        {grouped.groups.map(([label, items]) => (
          <div key={label} className="mb-3">
            <div className="px-1 mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-secondary/60">
              {label}
            </div>
            <div className="space-y-1">
              {items.map((s) => (
                <AgentCard
                  key={`${s.agent}-${s.id}`}
                  session={s}
                  selected={selectedId === s.id}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Agent;
