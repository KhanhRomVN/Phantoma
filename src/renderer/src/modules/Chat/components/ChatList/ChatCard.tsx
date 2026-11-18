import { Check, Lock, Pin, PinOff } from 'lucide-react';
import type { Account, Chat } from '../../types';
import { Avatar, Logo, Tip } from '../ui/Primitives';

interface ChatCardProps {
  chat: Chat;
  accounts: Account[];
  active: boolean;
  mergeMode: boolean;
  checked: boolean;
  onClick: () => void;
  onPin: (id: string) => void;
}

export function ChatCard({
  chat: c,
  accounts,
  active: act,
  mergeMode,
  checked,
  onClick,
  onPin,
}: ChatCardProps) {

  const platforms = (c.mergedFrom || [c.accountId])
    .map((id) => accounts.find((a) => a.id === id)?.platform)
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  return (
    <div
      onClick={onClick}
      className={`ch-row ch-hv relative flex gap-2.5 px-2.5 py-2 cursor-pointer border-b border-border/60 border-l-2 ${
        act ? 'bg-primary/10 border-l-primary' : 'bg-transparent border-l-transparent'
      }`}
    >
      {mergeMode && (
        <div
          className={`self-center w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
            checked ? 'border-warn bg-warn' : 'border-border bg-transparent'
          }`}
        >
          {checked && <Check size={11} className="text-background" />}
        </div>
      )}
      <div className="relative">
        <Avatar name={c.name} size={36} />
        <span className="absolute -bottom-1 -right-1 flex">
          {platforms.slice(0, 2).map((p, i) => (
            <span
              key={i}
              className="border-[1.5px] border-background rounded-[5px]"
              style={{ marginLeft: i ? -5 : 0 }}
            >
              <Logo platform={p} size={13} />
            </span>
          ))}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          {c.isPinned && <Pin size={10} className="text-primary" />}
          <span className="text-[12.5px] font-semibold truncate text-text-primary">{c.name}</span>
          {c.isEncrypted && <Lock size={10} className="shrink-0 text-success" />}
          <span
            className={`ml-auto text-[10px] shrink-0 ${c.unread ? 'text-primary' : 'text-text-secondary'}`}
          >
            {c.time}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className={`text-[11.5px] truncate flex-1 ${c.unread ? 'text-text-primary' : 'text-text-secondary'}`}
          >
            {c.last}
          </span>
          {c.unread > 0 && (
            <span className="text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center bg-primary text-background">
              {c.unread}
            </span>
          )}
        </div>

      </div>
      <span className="ch-show-hover absolute right-2 bottom-2">
        <Tip text={c.isPinned ? 'Unpin' : 'Pin conversation'}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPin(c.id);
            }}
            className="w-6 h-6 rounded flex items-center justify-center bg-dropdown-background border border-border text-text-secondary"
          >
            {c.isPinned ? <PinOff size={12} /> : <Pin size={12} />}
          </button>
        </Tip>
      </span>
    </div>
  );
}