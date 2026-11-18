import { GitMerge, Inbox, Search, User, Zap } from 'lucide-react';
import { CHAT_TABS, PLATFORMS, STATUS_META, TONE } from '../../constants';
import type { Account, Chat, ChatTabId } from '../../types';
import { ChatCard } from './ChatCard';

interface ChatListProps {
  chats: Chat[];
  allChats: Chat[];
  accounts: Account[];
  account: Account | null;
  activeChatId: string | null;
  onSelect: (id: string) => void;
  tab: ChatTabId;
  setTab: (t: ChatTabId) => void;
  query: string;
  setQuery: (q: string) => void;
  onPin: (id: string) => void;
  mergeMode: boolean;
  picked: string[];
  setPicked: (ids: string[]) => void;
  onMerge: () => void;
}

export function ChatList({
  chats,
  allChats,
  accounts,
  account,
  activeChatId,
  onSelect,
  tab,
  setTab,
  query,
  setQuery,
  onPin,
  mergeMode,
  picked,
  setPicked,
  onMerge,
}: ChatListProps) {
  const counts: Record<ChatTabId, number> = {
    all: allChats.length,
    unread: allChats.filter((c) => c.unread > 0).length,
    pinned: allChats.filter((c) => c.isPinned).length,
    important: allChats.filter((c) => c.important).length,
  };
  const st = account ? STATUS_META[account.status] : null;
  return (
    <div
      className="flex flex-col shrink-0 bg-background border-r border-border"
      style={{ width: 330 }}
    >
      <div className="h-[52px] shrink-0 flex items-center gap-2.5 px-3 bg-panel-background border-b border-border">
        {account ? (
          <>
            {account.avatar ? (
              <img
                src={account.avatar}
                alt={account.name}
                width={30}
                height={30}
                className="w-[30px] h-[30px] rounded-full object-cover bg-text-foreground"
              />
            ) : (
              <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center bg-primary/15 text-primary">
                <User size={15} />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-[13px] font-semibold truncate text-text-primary">{account.name}</div>
              <div className="flex items-center gap-1.5 text-[10.5px] text-text-secondary">
                {PLATFORMS[account.platform].label}
                {st && <span className={TONE[st.color].text}>● {st.label}</span>}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center bg-primary/15 text-primary">
              <Inbox size={15} />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-text-primary">All accounts</div>
              <div className="text-[10.5px] text-text-secondary">{accounts.length} accounts</div>
            </div>
          </>
        )}
      </div>

      <div className="p-2.5">
        <div className="flex items-center gap-2 px-2.5 h-8 rounded-lg bg-input-background">
          <Search size={13} className="text-text-secondary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages, people, channels…"
            className="flex-1 bg-transparent outline-none text-[12px] text-text-primary"
          />
        </div>
      </div>

      <div className="flex px-2.5 gap-1 pb-2">
        {CHAT_TABS.map((t) => {
          const act = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`ch-hv flex-1 h-7 rounded-md flex items-center justify-center gap-1 text-[11px] border ${
                act
                  ? 'bg-primary/15 text-primary border-primary/40'
                  : 'bg-transparent text-text-secondary border-border'
              }`}
            >
              {t.label}
              <span className="text-[9px] opacity-80">{counts[t.id]}</span>
            </button>
          );
        })}
      </div>

      {mergeMode && (
        <div className="mx-2.5 mb-2 px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-[11px] bg-warn/10 border border-warn/30 text-warn">
          <GitMerge size={13} />
          <span className="flex-1">Select 2+ conversations with the same person ({picked.length})</span>
          <button
            disabled={picked.length < 2}
            onClick={onMerge}
            className={`px-2 h-5 rounded font-semibold ${
              picked.length < 2 ? 'bg-border text-text-secondary' : 'bg-warn text-background'
            }`}
          >
            Merge
          </button>
        </div>
      )}

      <div className="ch-scroll flex-1 overflow-y-auto">
        {chats.length === 0 && (
          <div className="p-6 text-center text-[12px] text-text-secondary">
            No conversations match the filter. Try another tab or clear the search.
          </div>
        )}
        {chats.map((c) => {
          const checked = picked.includes(c.id);
          return (
            <ChatCard
              key={c.id}
              chat={c}
              accounts={accounts}
              active={activeChatId === c.id}
              mergeMode={mergeMode}
              checked={checked}
              onClick={() =>
                mergeMode
                  ? setPicked(checked ? picked.filter((x) => x !== c.id) : [...picked, c.id])
                  : onSelect(c.id)
              }
              onPin={onPin}
            />
          );
        })}
      </div>
      <div className="px-3 h-8 flex items-center gap-2 text-[10px] bg-table-footer-background border-t border-border text-text-secondary">
        <Zap size={11} className="text-success" /> Real-time sync · {chats.length} conversations
        <span className="ml-auto">AI filtered 14 spam</span>
      </div>
    </div>
  );
}