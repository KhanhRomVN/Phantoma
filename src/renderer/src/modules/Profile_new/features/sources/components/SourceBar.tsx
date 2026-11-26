import { useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { Ban, Check, FolderOpen, HardDrive, Pencil, Plus, RefreshCw, ShieldAlert, ShieldCheck, Unlink, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@renderer/utils/cn';
import { Tooltip } from '@renderer/components/ui/Tooltip';
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from '@renderer/components/ui/Dropdown';
import type { BrowserEngine, ProfileSource, SourceStats } from '../../../shared/types';
import type { Tone } from '../../../shared/types/ui.types';
import { TONE_CLASS } from '../../../shared/constants/tone.constants';
import { timeAgo } from '../../../shared/utils/format.util';
import { BROWSERS } from '../constants/source.constants';

interface SourceBarProps {
  sources: ProfileSource[];
  activeId: string;
  stats: Record<string, SourceStats>;
  onChange: (id: string) => void;
  actions?: ReactNode;
  onAddSource?: () => void;
  onEditSource?: (id: string) => void;
  onUnlinkSource?: (id: string) => void;
}

const EMPTY_STATS: SourceStats = { active: 0, avgSecurity: 0, lowSecurity: 0, unsynced: 0, bannedServices: 0 };

function StatTile({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: ReactNode; tone?: Tone }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-lg bg-background/60 px-2.5 py-1.5">
      <span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-text-secondary">
        <Icon className="h-3 w-3" />
        {label}
      </span>
      <span className="flex items-center gap-1.5 text-sm font-semibold tabular-nums text-text-primary">
        {tone && <span className={cn('h-1.5 w-1.5 rounded-full', TONE_CLASS[tone].dot)} />}
        {value}
      </span>
    </div>
  );
}

function SourceTip({ source, stats }: { source: ProfileSource; stats: SourceStats }) {
  const status = source.online ? TONE_CLASS.success : TONE_CLASS.muted;
  const hasProfiles = source.count > 0;
  const scoreTone: Tone = stats.avgSecurity >= 80 ? 'success' : stats.avgSecurity >= 60 ? 'warn' : 'error';
  return (
    <div className="flex w-[360px] flex-col text-left">
      <div className="bg-tooltip-background px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', TONE_CLASS.primary.icon)}>
            <HardDrive className="h-4 w-4" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate text-xs font-semibold text-text-primary">{source.name}</span>
            <span className="flex items-center gap-1.5 text-[10px] text-text-secondary">
              <span className={cn('flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium', status.pill)}>
                <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
                {source.online ? 'Online' : 'Offline'}
              </span>
              Synced {timeAgo(source.lastSync)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 px-2.5 pb-2.5">
        <StatTile icon={Users} label="Profiles" value={source.count} />
        <StatTile icon={Check} label="Active" value={stats.active} tone={stats.active > 0 ? 'success' : undefined} />
        <StatTile icon={ShieldCheck} label="Avg score" value={hasProfiles ? stats.avgSecurity : '—'} tone={hasProfiles ? scoreTone : undefined} />
        <StatTile icon={ShieldAlert} label="Low sec." value={stats.lowSecurity} tone={stats.lowSecurity > 0 ? 'warn' : undefined} />
        <StatTile icon={RefreshCw} label="Unsynced" value={stats.unsynced} tone={stats.unsynced > 0 ? 'info' : undefined} />
        <StatTile icon={Ban} label="Banned" value={stats.bannedServices} tone={stats.bannedServices > 0 ? 'error' : undefined} />
      </div>

      {source.location && (
        <div className="mx-2.5 mb-2.5 flex items-center gap-2 rounded-lg bg-background/60 px-2.5 py-1.5">
          <FolderOpen className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
          <span className="truncate font-mono text-[10px] text-text-secondary">{source.location}</span>
        </div>
      )}
    </div>
  );
}

function Tab({
  active,
  onClick,
  onContextMenu,
  tip,
  icon: Icon,
  label,
  count,
  browsers,
}: {
  active: boolean;
  onClick: () => void;
  onContextMenu?: (e: MouseEvent) => void;
  tip?: ReactNode;
  icon: LucideIcon;
  label: string;
  count: number;
  browsers?: BrowserEngine[];
}) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={cn(
        'relative isolate flex items-center gap-2 whitespace-nowrap rounded-[5px] px-3 py-1.5 text-xs transition-colors',
        active ? 'text-primary' : 'text-text-secondary hover:bg-text-secondary/10 hover:text-text-primary',
      )}
    >
      {active && (
        <motion.span
          layoutId="profile-source-pill"
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="absolute inset-0 -z-10 rounded-[5px] bg-primary/15 shadow-sm"
        />
      )}
      <Icon className="h-3.5 w-3.5" />
      <span className={active ? 'font-semibold' : 'font-medium'}>{label}</span>
      <span
        className={cn(
          'flex items-center gap-1 rounded-md px-1.5 text-[10px] tabular-nums',
          active ? 'bg-primary/20 text-primary' : 'bg-text-secondary/15 text-text-secondary',
        )}
      >
        {count}
        {browsers && (
          <span className="flex items-center gap-0.5">
            {browsers.map((b) => (
              <span key={b} className={cn('h-1.5 w-1.5 rounded-full', BROWSERS[b].dot)} />
            ))}
          </span>
        )}
      </span>
    </button>
  );
  return tip ? (
    <Tooltip content={tip} side="bottom" contentClassName="max-w-none overflow-hidden rounded-xl p-0">
      {button}
    </Tooltip>
  ) : (
    button
  );
}

const openFolder = (location: string): void => {
  void (window as any).api.invoke('shell:open-path', location);
};

export function SourceBar({
  sources,
  activeId,
  stats,
  onChange,
  actions,
  onAddSource,
  onEditSource,
  onUnlinkSource,
}: SourceBarProps) {
  const [menu, setMenu] = useState<{ id: string; top: number; left: number } | null>(null);
  const menuSource = menu ? (sources.find((s) => s.id === menu.id) ?? null) : null;

  return (
    <div className="relative flex items-center gap-3">
      <span className="shrink-0 text-xs font-medium text-text-secondary">Source:</span>
      <div className="flex min-w-0 flex-1">
        <div className="inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-md bg-text-secondary/10 p-0.5">
          {sources.map((s) => (
            <Tab
              key={s.id}
              active={activeId === s.id}
              onClick={() => onChange(s.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenu({ id: s.id, top: e.clientY, left: e.clientX });
              }}
              tip={menu?.id === s.id ? undefined : <SourceTip source={s} stats={stats[s.id] ?? EMPTY_STATS} />}
              icon={HardDrive}
              label={s.name}
              count={s.count}
              browsers={s.browsers}
            />
          ))}
          <Tooltip content="Add source" side="bottom">
            <button
              type="button"
              onClick={onAddSource}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] text-text-secondary transition-colors hover:bg-text-secondary/10 hover:text-text-primary"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </Tooltip>

        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}

      <Dropdown
        className="absolute"
        open={menu !== null}
        onOpenChange={(o) => {
          if (!o) setMenu(null);
        }}
        strategy="fixed"
        position={menu ? { top: menu.top, left: menu.left } : undefined}
        width={190}
      >
        <DropdownTrigger asChild>
          <span className="block h-0 w-0" />
        </DropdownTrigger>
        <DropdownContent>
          {menuSource && (
            <>
              {menuSource.location && (
                <DropdownItem
                  icon={<FolderOpen className="h-3.5 w-3.5" />}
                  onClick={() => openFolder(menuSource.location as string)}
                >
                  Open in folder
                </DropdownItem>
              )}
              <DropdownItem icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => onEditSource?.(menuSource.id)}>
                Edit source
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem
                variant="error"
                icon={<Unlink className="h-3.5 w-3.5" />}
                onClick={() => onUnlinkSource?.(menuSource.id)}
              >
                Unlink source
              </DropdownItem>
            </>
          )}
        </DropdownContent>
      </Dropdown>
    </div>
  );
}

export default SourceBar;