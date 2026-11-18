import { useState } from 'react';
import { AlertTriangle, Check, Filter, Plus, Search, User, WifiOff } from 'lucide-react';
import { PLATFORMS, STATUS_META, TONE } from '../constants';
import type { Account, AccountStatus, Chat } from '../types';
import { IconBtn } from './ui/Primitives';

interface AccountListProps {
  workspace: { name: string };
  accounts: Account[];
  chats: Chat[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: () => void;
}

type StatusFilter = AccountStatus | 'all';

const FILTER_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All statuses' },
  { id: 'online', label: STATUS_META.online.label },
  { id: 'offline', label: STATUS_META.offline.label },
  { id: 'error', label: STATUS_META.error.label },
];

export function AccountList({
  workspace,
  accounts,
  chats,
  activeId,
  onSelect,
  onAdd,
}: AccountListProps) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [dd, setDd] = useState(false);
  const unreadOf = (id: string) =>
    chats
      .filter((c) => (c.mergedFrom || [c.accountId]).includes(id))
      .reduce((s, c) => s + c.unread, 0);
  const q = query.trim().toLowerCase();
  const shown = accounts
    .filter((a) => status === 'all' || a.status === status)
    .filter(
      (a) =>
        !q || a.name.toLowerCase().includes(q) || PLATFORMS[a.platform].label.toLowerCase().includes(q),
    );
  return (
    <div className="flex flex-col shrink-0 w-[310px] bg-panel-background border-r border-border">
      <div className="h-[52px] shrink-0 flex items-center px-3 bg-panel-background border-b border-border">
        <div className="text-[13px] font-semibold truncate text-text-primary">{workspace.name}</div>
      </div>
      <div className="p-2.5">
        <div className="flex items-center gap-1.5">
          <div className="flex-1 flex items-center gap-2 px-2.5 h-8 rounded-lg bg-input-background">
            <Search size={13} className="text-text-secondary" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search accounts…"
              className="flex-1 min-w-0 bg-transparent outline-none text-[12px] text-text-primary"
            />
          </div>
          <div className="relative">
            <IconBtn
              icon={Filter}
              tip="Filter by status"
              active={status !== 'all'}
              onClick={() => setDd(!dd)}
              tone="info"
            />
            {dd && (
              <div className="absolute right-0 top-9 z-40 w-40 rounded-lg p-1 bg-dropdown-background border border-border shadow-xl">
                {FILTER_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => {
                      setStatus(o.id);
                      setDd(false);
                    }}
                    className="ch-hv2 w-full flex items-center gap-2 px-2 py-1.5 rounded text-[12px] text-text-primary"
                  >
                    {o.label}
                    {status === o.id && <Check size={12} className="ml-auto text-success" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="px-3 pb-1 text-[10px] text-text-secondary">Accounts ({shown.length})</div>
      <div className="ch-scroll flex-1 overflow-y-auto px-2 py-1 flex flex-col gap-1">
        {shown.map((a) => {
          const act = activeId === a.id;
          const st = STATUS_META[a.status];
          const u = unreadOf(a.id);
          return (
            <button
              key={a.id}
              onClick={() => onSelect(act ? null : a.id)}
              className={`ch-hv text-left rounded-lg px-2 py-1.5 border border-border bg-card-background ${
                act ? 'outline outline-1 outline-dashed outline-primary' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="relative">
                  {a.avatar ? (
                    <img
                      src={a.avatar}
                      alt={a.name}
                      width={28}
                      height={28}
                      className="w-7 h-7 rounded-full object-cover bg-text-foreground"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center bg-primary/15 text-primary">
                      <User size={14} />
                    </div>
                  )}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card-background ${TONE[st.color].bg} ${a.status === 'error' ? 'ch-blink' : ''}`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-medium truncate text-text-primary">{a.name}</div>
                  <div className="text-[10px] truncate text-text-secondary">
                    {PLATFORMS[a.platform].label}
                  </div>
                </div>
                {u > 0 && (
                  <span className="text-[10px] font-semibold px-1.5 rounded-full bg-primary text-background">
                    {u}
                  </span>
                )}
              </div>
              {a.status !== 'online' && (
                <div className={`flex items-center gap-1 mt-1 text-[10px] ${TONE[st.color].text}`}>
                  {a.status === 'error' ? <AlertTriangle size={10} /> : <WifiOff size={10} />}
                  {st.label}
                  {a.status === 'error' && <span className="ml-auto underline">Reconnect</span>}
                </div>
              )}
            </button>
          );
        })}
      </div>
      <div className="p-2 border-t border-border">
        <button
          onClick={onAdd}
          className="ch-hv2 w-full h-8 rounded-lg flex items-center justify-center gap-1.5 text-[12px] border border-dashed border-border text-text-secondary"
        >
          <Plus size={13} /> Add account
        </button>
      </div>
    </div>
  );
}