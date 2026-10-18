/**
 * ------------------------------------------------------------------
 * Git Branch Sidebar
 * ------------------------------------------------------------------
 * Collapsible Local / Remote branch lists with a filter box. The
 * current branch is highlighted; clicking a branch jumps to its tip.
 * ------------------------------------------------------------------
 */

import { memo, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, ChevronRight, Cloud, GitBranch, Laptop, Loader2, Search } from 'lucide-react';

import { cn } from '@renderer/shared/utils/cn';

interface BranchSidebarProps {
  local: string[];
  remote: string[];
  current: string | null;
  busy?: string | null;
  onJump: (name: string) => void;
  onCheckout: (name: string) => void;
}

function Section({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: ReactNode;
  count: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className={'mb-2'}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={'w-full flex items-center gap-1.5 px-3 h-7 text-[10.5px] font-semibold uppercase tracking-wider text-text-secondary/70 hover:text-text-primary transition-colors cursor-pointer'}
      >
        {open ? <ChevronDown className={'w-3 h-3'} /> : <ChevronRight className={'w-3 h-3'} />}
        {icon}
        {title}
        <span className={'ml-auto font-mono text-[10px] px-1.5 rounded-full bg-card-background border border-divider'}>
          {count}
        </span>
      </button>
      {open && children}
    </div>
  );
}

export const BranchSidebar = memo(function BranchSidebar({
  local,
  remote,
  current,
  busy = null,
  onJump,
  onCheckout,
}: BranchSidebarProps) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const localList = q ? local.filter((b) => b.toLowerCase().includes(q)) : local;
  const remoteList = q ? remote.filter((b) => b.toLowerCase().includes(q)) : remote;

  const renderItem = (name: string, isRemote: boolean) => {
    const isCurrent = !isRemote && name === current;
    const slash = name.indexOf('/');
    return (
      <button
        key={name}
        onClick={() => onJump(name)}
        onDoubleClick={() => !isCurrent && onCheckout(name)}
        title={isCurrent ? name : `${name} — double-click to checkout`}
        className={cn(
          'relative w-full flex items-center gap-2 pl-6 pr-3 h-7 text-left text-[12px] font-mono transition-colors cursor-pointer',
          isCurrent
            ? 'bg-primary/10 text-primary'
            : 'text-text-secondary hover:bg-card-hover hover:text-text-primary',
        )}
      >
        {isCurrent && <span className={'absolute left-0 top-1 bottom-1 w-[3px] rounded-r bg-primary'} />}
        <GitBranch className={'w-3 h-3 shrink-0'} />
        <span className={'truncate'}>
          {isRemote && slash > 0 ? (
            <>
              <span className={'text-text-secondary/50'}>{name.slice(0, slash + 1)}</span>
              {name.slice(slash + 1)}
            </>
          ) : (
            name
          )}
        </span>
        {busy === name && <Loader2 className={'ml-auto w-3 h-3 animate-spin'} />}
        {isCurrent && busy !== name && (
          <span className={'ml-auto text-[9px] uppercase tracking-wide px-1 rounded bg-primary/20'}>HEAD</span>
        )}
      </button>
    );
  };

  return (
    <aside className={'w-[230px] shrink-0 border-r border-border flex flex-col min-h-0 bg-sidebar-background/40'}>
      <div className={'p-2.5'}>
        <div className={'relative'}>
          <Search className={'absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary/60 pointer-events-none'} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={'Filter branches...'}
            className={'w-full pl-7 pr-2 h-7 text-xs bg-input-background border border-border rounded-md text-text-primary placeholder:text-text-secondary/50 focus:outline-none'}
          />
        </div>
      </div>
      <div className={'flex-1 overflow-y-auto pb-3'}>
        <Section title={'Local'} icon={<Laptop className={'w-3 h-3'} />} count={localList.length}>
          {localList.map((b) => renderItem(b, false))}
        </Section>
        <Section title={'Remote'} icon={<Cloud className={'w-3 h-3'} />} count={remoteList.length}>
          {remoteList.map((b) => renderItem(b, true))}
        </Section>
      </div>
    </aside>
  );
});