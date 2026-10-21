/**
 * ------------------------------------------------------------------
 * Workspace Header Widgets (FakeUI + mock data)
 * ------------------------------------------------------------------
 * Cac widget thu nghiem cho Headerbar o che do workspace. Du lieu lay
 * tu headerbarMock.ts; menu "Widgets" cho phep bat/tat tung widget.
 * ------------------------------------------------------------------
 */

import { useEffect, useState, type ReactElement } from 'react';
import {
  GitBranch,
  GitCommit,
  ArrowUp,
  ArrowDown,
  Cpu,
  Clock,
  Coins,
  Bell,
  Terminal,
  Check,
  SlidersHorizontal,
} from 'lucide-react';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';
import {
  DEFAULT_ENABLED_WIDGETS,
  HEADER_WIDGETS,
  MOCK_HEADER_DATA,
  type HeaderWidgetId,
} from './headerbarMock';

const CHIP =
  'h-[26px] px-2 rounded-md border border-border bg-card-hover/40 flex items-center gap-1.5 text-[11px] text-text-secondary shrink-0 whitespace-nowrap select-none cursor-default';

const formatTokens = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

const formatClock = (total: number) => {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
};

function GitWidget() {
  const { ahead, behind, changed, staged } = MOCK_HEADER_DATA.git;
  return (
    <span className={CHIP} title={`${staged} staged, ${changed - staged} unstaged`}>
      <GitBranch className="w-3 h-3" strokeWidth={1.5} />
      <span className="flex items-center text-green-400">
        <ArrowUp className="w-3 h-3" />
        {ahead}
      </span>
      <span className="flex items-center text-text-secondary">
        <ArrowDown className="w-3 h-3" />
        {behind}
      </span>
      <span className="w-px h-3 bg-divider" />
      <span className="text-yellow-400">{changed} changed</span>
    </span>
  );
}

function CommitWidget() {
  const { hash, message, minutesAgo } = MOCK_HEADER_DATA.commit;
  return (
    <span className={`${CHIP} max-w-[260px]`} title={message}>
      <GitCommit className="w-3 h-3 shrink-0" strokeWidth={1.5} />
      <span className="font-mono text-primary">{hash}</span>
      <span className="truncate">{message}</span>
      <span className="text-text-secondary/60">{minutesAgo}m</span>
    </span>
  );
}

function AgentWidget() {
  const { provider, model, status } = MOCK_HEADER_DATA.agent;
  const running = status === 'running';
  return (
    <span className={CHIP}>
      <span
        className={`w-1.5 h-1.5 rounded-full ${running ? 'bg-green-400 animate-pulse' : 'bg-text-secondary/50'}`}
      />
      <Cpu className="w-3 h-3" strokeWidth={1.5} />
      <span className="text-text-primary">{provider}</span>
      <span className="text-text-secondary/70">{model}</span>
      <span className={running ? 'text-green-400' : ''}>{running ? 'Running' : 'Idle'}</span>
    </span>
  );
}

function ContextWidget() {
  const { used, limit } = MOCK_HEADER_DATA.context;
  const pct = Math.round((used / limit) * 100);
  const bar = pct > 85 ? 'bg-red-400' : pct > 60 ? 'bg-yellow-400' : 'bg-primary';
  return (
    <span className={CHIP} title={`${used.toLocaleString()} / ${limit.toLocaleString()} tokens`}>
      <span>Context</span>
      <span className="w-16 h-1.5 rounded-full bg-border overflow-hidden">
        <span className={`block h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-text-primary">{pct}%</span>
    </span>
  );
}

function CostWidget() {
  const { tokens, usd } = MOCK_HEADER_DATA.cost;
  return (
    <span className={CHIP} title="Usage today">
      <Coins className="w-3 h-3" strokeWidth={1.5} />
      <span>{formatTokens(tokens)} tok</span>
      <span className="text-text-primary">${usd.toFixed(2)}</span>
    </span>
  );
}

function TimerWidget() {
  const [seconds, setSeconds] = useState(MOCK_HEADER_DATA.timerStartOffsetSec);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className={CHIP} title="Session uptime">
      <Clock className="w-3 h-3" strokeWidth={1.5} />
      <span className="font-mono text-text-primary">{formatClock(seconds)}</span>
    </span>
  );
}

function ProcsWidget() {
  const procs = MOCK_HEADER_DATA.procs;
  const ports = procs.filter((p) => p.port).map((p) => `:${p.port}`);
  return (
    <span className={CHIP} title={procs.map((p) => p.cmd).join('\n')}>
      <Terminal className="w-3 h-3" strokeWidth={1.5} />
      <span className="text-text-primary">{procs.length} live</span>
      {ports.length > 0 && <span className="font-mono text-primary">{ports.join(' ')}</span>}
    </span>
  );
}

function LayoutWidget() {
  const [active, setActive] = useState<string>('2x1');
  const cells: Record<string, string> = {
    '1x1': 'grid-cols-1 grid-rows-1',
    '2x1': 'grid-cols-2 grid-rows-1',
    '1x2': 'grid-cols-1 grid-rows-2',
    '2x2': 'grid-cols-2 grid-rows-2',
  };
  const count: Record<string, number> = { '1x1': 1, '2x1': 2, '1x2': 2, '2x2': 4 };
  return (
    <span className="h-[26px] px-1 rounded-md border border-border bg-card-hover/40 flex items-center gap-0.5 shrink-0">
      {MOCK_HEADER_DATA.layouts.map((key) => (
        <button
          key={key}
          onClick={() => setActive(key)}
          title={`Layout ${key}`}
          className={`w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-colors ${active === key ? 'bg-primary/20 text-primary' : 'text-text-secondary hover:bg-white/10'}`}
        >
          <span className={`grid gap-px w-3 h-3 ${cells[key]}`}>
            {Array.from({ length: count[key] }).map((_, i) => (
              <span key={i} className="rounded-[1px] bg-current opacity-80" />
            ))}
          </span>
        </button>
      ))}
    </span>
  );
}

function NotificationsWidget() {
  const count = MOCK_HEADER_DATA.notifications;
  return (
    <button
      className="relative w-[26px] h-[26px] rounded-md flex items-center justify-center text-text-secondary hover:bg-card-hover hover:text-text-primary transition-colors cursor-pointer shrink-0"
      title="Notifications"
    >
      <Bell className="w-3.5 h-3.5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-1 rounded-full bg-red-500 text-white text-[9px] leading-[14px] text-center">
          {count}
        </span>
      )}
    </button>
  );
}

const WIDGET_COMPONENTS: Record<HeaderWidgetId, () => ReactElement> = {
  git: GitWidget,
  commit: CommitWidget,
  agent: AgentWidget,
  context: ContextWidget,
  cost: CostWidget,
  timer: TimerWidget,
  procs: ProcsWidget,
  layout: LayoutWidget,
  notifications: NotificationsWidget,
};

export function WorkspaceHeaderWidgets() {
  const [enabled, setEnabled] = useState<HeaderWidgetId[]>(DEFAULT_ENABLED_WIDGETS);

  const toggle = (id: HeaderWidgetId) =>
    setEnabled((prev) => (prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]));

  return (
    <div className="min-w-0 flex items-center gap-1.5 overflow-hidden">
      {HEADER_WIDGETS.filter((w) => enabled.includes(w.id)).map((w) => {
        const Widget = WIDGET_COMPONENTS[w.id];
        return <Widget key={w.id} />;
      })}

      <Dropdown trigger="click" align="end">
        <DropdownTrigger asChild>
          <button
            className="w-[26px] h-[26px] rounded-md flex items-center justify-center text-text-secondary hover:bg-card-hover hover:text-text-primary transition-colors cursor-pointer shrink-0"
            title="Chon widget hien thi"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </DropdownTrigger>
        <DropdownContent>
          {HEADER_WIDGETS.map((w) => (
            <DropdownItem key={w.id} onClick={() => toggle(w.id)}>
              <span className="flex items-center gap-2 w-full">
                <span className="w-3.5 h-3.5 flex items-center justify-center">
                  {enabled.includes(w.id) && <Check className="w-3.5 h-3.5 text-primary" />}
                </span>
                <span>{w.label}</span>
                <span className="ml-auto pl-3 text-[10px] text-text-secondary/60">{w.hint}</span>
              </span>
            </DropdownItem>
          ))}
        </DropdownContent>
      </Dropdown>
    </div>
  );
}
