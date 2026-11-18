import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { ProfileCardGrid } from './ProfileCardGrid';
import { BackupFieldTip, isBackupField } from './common/BackupFieldTip';
import { motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Copy,
  ExternalLink,
  Globe,
  KeyRound,
  Laptop,
  Lock,
  Mail,
  Phone,
  FolderOpen,
  PlayCircle,
  ShieldCheck,
  Square,
  Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Checkbox } from '@renderer/components/ui/Checkbox';
import { Tooltip } from '@renderer/components/ui/Tooltip';
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from '@renderer/components/ui/Dropdown';

import type { BackupCode, Profile, ProfileStatus, ServiceLink, SyncState } from '../types';
import { computeSecurity } from '../utils/security';
import { formatDateTime, timeAgo } from '../utils/format';
import { getActivities } from '../utils/activity';
import type { ActivityKind } from '../utils/activity';
import { Favicon, getFaviconUrl } from '@renderer/utils/favicon';
import { Avatar } from './common/Avatar';
import { SecurityCell } from './common/SecurityMeter';
import { ServiceIcon, ServiceStatusBadge, SyncBadge } from './common/StatusBadge';
import { SERVICE_STATUS } from '../constants/status';
import { TONE_CLASS } from '../constants/tone';
import { ProfileTableEmpty } from './ProfileTableEmpty';
import { TOTP_PERIOD, useTotp } from '../utils/totp';

interface ProfileTableProps {
  profiles: Profile[];
  selectedId: string | null;
  checkedIds: Set<string>;
  showSource: boolean;
  service?: string;
  sourceNames: Record<string, string>;
  onSelect: (id: string, target?: { tab: 'overview' | 'services'; target: string }) => void;
  onToggleCheck: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  filteredOut?: boolean;
  onClearFilters?: () => void;
  onAddProfile?: () => void;
  onOpenFolder?: (profile: Profile) => void;
  onDelete?: (profile: Profile) => void;
  runningIds?: Set<string>;
  onStop?: (profile: Profile) => void;
}

type SortKey = 'profile' | 'security' | 'chrome';
type SortDir = 'asc' | 'desc';
interface SortState {
  key: SortKey;
  dir: SortDir;
}

const SYNC_RANK: Record<SyncState, number> = { synced: 0, unsynced: 1, error: 2 };

const ACTIVITY_ICON: Record<ActivityKind, LucideIcon> = {
  script: PlayCircle,
  browse: Globe,
  device: Laptop,
};

// ASSUMED: texture dùng màu rgba cố định vì không biết định dạng CSS variable của theme
const ROW_TEXTURE: Partial<Record<ProfileStatus, CSSProperties>> = {
  checkpoint: {
    backgroundImage:
      'repeating-linear-gradient(90deg, transparent 0 5px, rgba(251,191,36,0.2) 5px 6px)',
  },
  verification: {
    backgroundImage:
      'repeating-linear-gradient(0deg, transparent 0 5px, rgba(251,146,60,0.2) 5px 6px)',
  },
  totp_lost: {
    backgroundImage: 'radial-gradient(rgba(251,191,36,0.4) 1px, transparent 1.2px)',
    backgroundSize: '9px 9px',
  },
  recovery_lost: {
    backgroundImage:
      'repeating-linear-gradient(45deg, transparent 0 6px, rgba(251,146,60,0.16) 6px 7px), repeating-linear-gradient(135deg, transparent 0 6px, rgba(251,146,60,0.16) 6px 7px)',
  },
  locked: {
    backgroundImage:
      'repeating-linear-gradient(-45deg, transparent 0 8px, rgba(251,191,36,0.18) 8px 10px)',
  },
  suspended: {
    backgroundImage:
      'repeating-linear-gradient(45deg, transparent 0 5px, rgba(96,165,250,0.2) 5px 6px)',
  },
  banned: {
    backgroundImage:
      'repeating-linear-gradient(135deg, transparent 0 5px, rgba(248,113,113,0.22) 5px 6px)',
  },
  deleted: {
    backgroundImage: 'radial-gradient(rgba(148,163,184,0.45) 1px, transparent 1.2px)',
    backgroundSize: '7px 7px',
  },
};

function sortValue(p: Profile, key: SortKey): string | number {
  switch (key) {
    case 'profile':
      return p.displayName;

    case 'security':
      return computeSecurity(p).score;
    case 'chrome':
      return SYNC_RANK[p.chromeSync];
  }
}

function charRank(c: string): number {
  if (c >= 'a' && c <= 'z') return 0;
  if (c >= 'A' && c <= 'Z') return 1;
  if (c >= '0' && c <= '9') return 2;
  return 3;
}

function compareEmail(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const ra = charRank(a[i]);
    const rb = charRank(b[i]);
    if (ra !== rb) return ra - rb;
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return a.length - b.length;
}

function defaultSort(list: Profile[]): Profile[] {
  return list
    .map((p) => {
      const acts = getActivities(p);
      const last = acts[0]?.at ? Date.parse(acts[0].at) || 0 : 0;
      return { p, at: Math.max(Date.parse(p.lastActive) || 0, last), n: acts.length };
    })
    .sort((a, b) => {
      if (a.at > 0 !== b.at > 0) return a.at > 0 ? -1 : 1;
      if (a.at !== b.at) return b.at - a.at;
      if (a.n !== b.n) return b.n - a.n;
      return compareEmail(a.p.email, b.p.email);
    })
    .map((x) => x.p);
}

function compareValues(a: string | number, b: string | number): number {
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b, 'vi');
  return (a as number) - (b as number);
}

function prioritizeServices(services: ServiceLink[]): ServiceLink[] {
  const rank = (s: ServiceLink): number => (SERVICE_STATUS[s.status].tone === 'error' ? 0 : 1);
  return [...services].sort((a, b) => rank(a) - rank(b));
}

function Capability({
  icon: Icon,
  ok,
  title,
  activeClass,
  onClick,
}: {
  icon: LucideIcon;
  ok: boolean;
  title: React.ReactNode;
  activeClass: string;
  onClick?: () => void;
}) {
  return (
    <Tooltip content={title} side="top">
      <span
        onClick={(e) => {
          if (!onClick) return;
          e.stopPropagation();
          onClick();
        }}
        className={cn(
          'flex h-6 w-6 items-center justify-center rounded-md',
          onClick && 'cursor-pointer transition-opacity hover:opacity-80',
          ok ? activeClass : 'bg-text-secondary/10 text-text-secondary/40',
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
    </Tooltip>
  );
}

function BackupTip({ codes }: { codes: BackupCode[] }) {
  const left = codes.filter((c) => !c.used);
  if (left.length === 0) return <span className="text-[11px]">No backup codes left</span>;
  const shown = left.length > 4 ? left.slice(0, 3) : left;
  const more = left.length - shown.length;
  const CHIP = 'rounded-md bg-text-secondary/15 px-2 py-1 text-center text-[11px]';
  return (
    <div className="grid grid-cols-2 gap-1">
      {shown.map((c, i) => (
        <span key={`${c.code}-${i}`} className={cn(CHIP, 'font-mono')}>
          {c.code}
        </span>
      ))}
      {more > 0 && <span className={cn(CHIP, 'opacity-70')}>+{more} more...</span>}
    </div>
  );
}

function SimpleTotp({ secret }: { secret: string }) {
  const { code, remaining, invalid } = useTotp(secret);
  if (invalid || !code) return <span className="text-[11px]">Invalid secret</span>;
  const low = remaining <= 5;
  return (
    <div className="flex min-w-[120px] flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-sm font-semibold tracking-widest">
          {code.slice(0, 3)} {code.slice(3)}
        </span>
        <span className={cn('text-[11px] tabular-nums', low ? 'text-error' : 'opacity-70')}>
          {remaining}s
        </span>
      </div>
      <div className="h-0.5 w-full overflow-hidden rounded-full bg-text-secondary/20">
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-1000 ease-linear',
            low ? 'bg-error' : 'bg-primary',
          )}
          style={{ width: `${(remaining / TOTP_PERIOD) * 100}%` }}
        />
      </div>
    </div>
  );
}

function ServiceDetail({ s }: { s: ServiceLink }) {
  return (
    <div className="flex max-w-[280px] flex-col gap-0.5 text-[11px]">
      <span className="font-medium">{s.name}</span>
      <span>{SERVICE_STATUS[s.status].label}</span>
      {s.statusNote && <span>{s.statusNote}</span>}
      <span>Linked {formatDateTime(s.linkedAt)}</span>
      {s.customFields.map((f, i) => (
        <div key={`${f.key}-${i}`} className="flex min-w-0 items-start gap-1.5">
          <span className="shrink-0 opacity-70">{f.key}:</span>
          {f.kind === 'totp' && f.value ? (
            <SimpleTotp secret={f.value} />
          ) : f.kind === 'backup' ? (
            <span>{f.value.split('\n').filter(Boolean).length} codes</span>
          ) : (
            <span className="min-w-0 break-all font-mono">{f.value}</span>
          )}
        </div>
      ))}
    </div>
  );
}

const TH =
  'whitespace-nowrap px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-text-secondary';
const TD = 'px-3 py-2.5 align-middle text-text-primary';
const MAX_SERVICES = 3;

const BADGE =
  'flex h-6 items-center justify-center rounded-md bg-text-secondary/10 text-text-secondary';

function SortableTh({
  label,
  sortKey,
  sort,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  sort: SortState | null;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const dir = sort?.key === sortKey ? sort.dir : null;
  const Icon = dir === 'asc' ? ArrowUp : dir === 'desc' ? ArrowDown : ArrowUpDown;
  return (
    <th className={cn(TH, className)}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-text-primary',
          dir && 'text-text-primary',
        )}
      >
        {label}
        <Icon
          className={cn(
            'h-3 w-3',
            dir === 'asc' && 'text-info',
            dir === 'desc' && 'text-error',
            !dir && 'opacity-40',
          )}
        />
      </button>
    </th>
  );
}

export function ProfileTable({
  profiles,
  selectedId,
  checkedIds,
  showSource,
  sourceNames,
  onSelect,
  onToggleCheck,
  onToggleAll,
  filteredOut = false,
  onClearFilters,
  onAddProfile,
  onOpenFolder,
  onDelete,
  runningIds,
  onStop,
  service,
}: ProfileTableProps) {
  const focus = service && service !== 'all' ? service : null;
  const [sort, setSort] = useState<SortState | null>(null);
  const [menu, setMenu] = useState<{ id: string; top: number; left: number } | null>(null);

  const allChecked = profiles.length > 0 && profiles.every((p) => checkedIds.has(p.id));

  const rows = useMemo(() => {
    const list = sort
      ? [...profiles].sort(
          (a, b) =>
            (sort.dir === 'asc' ? 1 : -1) *
            compareValues(sortValue(a, sort.key), sortValue(b, sort.key)),
        )
      : defaultSort(profiles);
    if (!runningIds || runningIds.size === 0) return list;
    return [
      ...list.filter((p) => runningIds.has(p.id)),
      ...list.filter((p) => !runningIds.has(p.id)),
    ];
  }, [profiles, sort, runningIds]);

  const orderKey = useMemo(() => rows.map((p) => p.id).join('|'), [rows]);

  // ASSUMED: khi lọc theo service, Security/Credentials chỉ hiện nếu có row nào mà service đó bật TOTP hoặc Backup code (field kind totp/backup có value)
  const showSecurity =
    !focus ||
    profiles.some((p) =>
      p.services
        .find((s) => s.name === focus)
        ?.customFields.some((f) => (f.kind === 'totp' || f.kind === 'backup') && f.value),
    );
  const colCount = focus ? (showSecurity ? 7 : 5) : 7;

  // ASSUMED: chỉ áp dụng khi lọc theo service (cột cuối là Custom fields co giãn); nếu nội dung thực tế < 60% bề rộng thì chuyển sang card grid, bảng vẫn mount ẩn để tiếp tục đo
  const wrapRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = (): void => {
      if (!focus || rows.length === 0) {
        setCompact(false);
        return;
      }
      const heads = Array.from(el.querySelectorAll<HTMLElement>('thead th'));
      const fixed = heads.slice(0, -1).reduce((sum, th) => sum + th.offsetWidth, 0);
      let natural = 0;
      el.querySelectorAll<HTMLElement>('[data-natural]').forEach((n) => {
        const kids = Array.from(n.children) as HTMLElement[];
        const w =
          kids.reduce((sum, k) => sum + k.offsetWidth, 0) + Math.max(kids.length - 1, 0) * 4 + 24;
        natural = Math.max(natural, w);
      });
      setCompact(fixed + natural < el.clientWidth * 0.6);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [focus, rows, showSecurity]);

  const menuProfile = menu ? (profiles.find((p) => p.id === menu.id) ?? null) : null;

  const toggleSort = (key: SortKey): void =>
    setSort((prev) =>
      !prev || prev.key !== key
        ? { key, dir: 'asc' }
        : prev.dir === 'asc'
          ? { key, dir: 'desc' }
          : null,
    );

  return (
    <>
    {compact && focus && (
      <ProfileCardGrid
        profiles={rows}
        service={focus}
        selectedId={selectedId}
        showSource={showSource}
        sourceNames={sourceNames}
        onSelect={onSelect}
      />
    )}
    <div
      ref={wrapRef}
      className={cn(
        'relative min-h-0 flex-1 overflow-auto rounded-md bg-card-background',
        compact && 'invisible absolute inset-x-0 top-0 h-0 flex-none overflow-hidden',
      )}
    >
      <table className={cn('w-full border-collapse text-xs', rows.length === 0 && 'h-full')}>
        <thead className="sticky top-0 z-10 bg-table-header-background">
          <tr>
            <th className={cn(TH, 'w-9')}>
              <Checkbox size="sm" checked={allChecked} onChange={onToggleAll} />
            </th>
            <SortableTh label="Profile" sortKey="profile" sort={sort} onSort={toggleSort} />
            {focus && <th className={TH}>Status</th>}
            {showSecurity && (
              <>
                <SortableTh label="Security" sortKey="security" sort={sort} onSort={toggleSort} />
                <th className={TH}>Credentials</th>
              </>
            )}
            <SortableTh label="Chrome" sortKey="chrome" sort={sort} onSort={toggleSort} />
            {focus ? (
              <th className={cn(TH, 'w-full')}>Custom fields</th>
            ) : (
              <>
                <th className={TH}>Services</th>
                <th className={cn(TH, 'w-full')}>History</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={colCount} className="align-middle">
                <ProfileTableEmpty
                  filteredOut={filteredOut}
                  onClearFilters={onClearFilters}
                  onAddProfile={onAddProfile}
                />
              </td>
            </tr>
          )}
          {rows.map((p, rowIndex) => {
            const sec = computeSecurity(p);
            const backupLeft = p.backupCodes.filter((c) => !c.used).length;
            const selected = selectedId === p.id;
            const services = prioritizeServices(p.services);
            const shownServices = services.slice(0, MAX_SERVICES);
            const hiddenServices = services.slice(MAX_SERVICES);
            const activities = getActivities(p);
            const latest = activities[0];
            const LatestIcon = latest ? ACTIVITY_ICON[latest.kind] : null;
            return (
              <motion.tr
                key={p.id}
                layout="position"
                layoutDependency={orderKey}
                transition={{ layout: { type: 'spring', stiffness: 520, damping: 42, mass: 0.7 } }}
                onClick={() => onSelect(p.id)}
                onContextMenu={(e: React.MouseEvent) => {
                  e.preventDefault();
                  setMenu({ id: p.id, top: e.clientY, left: e.clientX });
                }}
                style={{
                  ...(runningIds?.has(p.id)
                    ? {
                        backgroundImage:
                          'repeating-linear-gradient(45deg, transparent 0 5px, rgba(74,222,128,0.2) 5px 6px)',
                      }
                    : ROW_TEXTURE[p.status]),
                  animationDelay: `${Math.min(rowIndex, 8) * 20}ms`,
                  animationFillMode: 'backwards',
                }}
                className={cn(
                  'animate-in fade-in-0 duration-200 cursor-pointer border-b border-border transition-colors hover:bg-table-row-hover',
                  selected && 'bg-text-secondary/10 hover:bg-text-secondary/15',
                  menu?.id === p.id && 'bg-text-secondary/10',
                  (p.status === 'banned' || p.status === 'deleted') && 'opacity-70',
                )}
              >
                <td className={TD}>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      size="sm"
                      checked={checkedIds.has(p.id)}
                      onChange={() => onToggleCheck(p.id)}
                    />
                  </div>
                </td>
                <td className={TD}>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={p.displayName} hue={p.avatarHue} src={p.avatarUrl} size={30} />
                    <div className="min-w-0">
                      <div className="truncate font-medium text-text-primary">{p.displayName}</div>
                      <div className="truncate text-[11px] text-text-secondary">
                        {p.email}
                        {showSource && (
                          <span>
                            {' • '}
                            {sourceNames[p.sourceId]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>

                {focus && (
                  <td className={TD}>
                    {(() => {
                      const link = p.services.find((s) => s.name === focus);
                      return link ? <ServiceStatusBadge status={link.status} /> : null;
                    })()}
                  </td>
                )}
                {showSecurity && (
                <>
                <td className={TD}>
                  <Tooltip
                    side="right"
                    content={
                      <div className="flex max-w-[240px] flex-col gap-1 text-[11px]">
                        <span className="font-medium">Security score {sec.score}/100</span>
                        {sec.issues.length === 0 ? (
                          <span>No issues found</span>
                        ) : (
                          sec.issues.map((i) => <span key={i.id}>• {i.label}</span>)
                        )}
                      </div>
                    }
                  >
                    <SecurityCell score={sec.score} level={sec.level} />
                  </Tooltip>
                </td>
                <td className={TD}>
                  <div className="flex items-center gap-1">
                    {/* ASSUMED: Profile.hasPassword === false nghĩa là chưa nhập password (chưa có nguồn dữ liệu thật) */}
                    {p.hasPassword === false && (
                      <Capability
                        icon={Lock}
                        ok
                        title="Password not set"
                        activeClass={TONE_CLASS.error.icon}
                        onClick={() => onSelect(p.id, { tab: 'overview', target: 'password' })}
                      />
                    )}
                    <Capability
                      icon={Mail}
                      ok={Boolean(p.recoveryEmail)}
                      title={
                        p.recoveryEmail ? `Recovery email: ${p.recoveryEmail}` : 'Recovery email'
                      }
                      activeClass={TONE_CLASS.info.icon}
                      onClick={() => onSelect(p.id, { tab: 'overview', target: 'recoveryEmail' })}
                    />
                    {p.phone && (
                      <Capability
                        icon={Phone}
                        ok
                        title={`Phone: ${p.phone}`}
                        activeClass={TONE_CLASS.success.icon}
                        onClick={() => onSelect(p.id, { tab: 'overview', target: 'phone' })}
                      />
                    )}
                    <Capability
                      icon={ShieldCheck}
                      ok={p.totpEnabled}
                      title={
                        p.totpEnabled && p.totpSecret ? (
                          <SimpleTotp secret={p.totpSecret} />
                        ) : (
                          'TOTP not set'
                        )
                      }
                      activeClass={TONE_CLASS.primary.icon}
                      onClick={() => onSelect(p.id, { tab: 'overview', target: 'totp' })}
                    />
                    <Capability
                      icon={KeyRound}
                      ok={backupLeft >= 3}
                      title={<BackupTip codes={p.backupCodes} />}
                      activeClass={TONE_CLASS.warn.icon}
                      onClick={() => onSelect(p.id, { tab: 'overview', target: 'backup' })}
                    />
                  </div>
                </td>
                </>
                )}
                <td className={TD}>
                  <SyncBadge state={p.chromeSync} />
                </td>
                {focus ? (
                  <td className={cn(TD, 'w-full')}>
                    <div data-natural className="flex flex-wrap items-center gap-1">
                      {(p.services.find((s) => s.name === focus)?.customFields ?? []).map((f, i) => (
                        <Tooltip
                          key={`${f.key}-${i}`}
                          side="top"
                          contentClassName="max-w-none"
                          content={
                            (f.kind === 'totp' || /totp/i.test(f.key)) && f.value ? (
                              <SimpleTotp secret={f.value} />
                            ) : isBackupField(f) ? (
                              <BackupFieldTip value={f.value} />
                            ) : (
                              <span className="max-w-[280px] break-all font-mono text-[11px]">
                                {f.value || '—'}
                              </span>
                            )
                          }
                        >
                          <span
                            className={cn(
                              BADGE,
                              'h-5 cursor-pointer gap-1 px-1.5 text-[10px] transition-opacity hover:opacity-80',
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              const link = p.services.find((s) => s.name === focus);
                              if (link) onSelect(p.id, { tab: 'services', target: link.id });
                            }}
                          >
                            {f.kind === 'totp' || /totp/i.test(f.key) ? (
                              <>
                                <ShieldCheck className={cn('h-3 w-3 shrink-0 bg-transparent', TONE_CLASS.primary.icon)} />
                                TOTP
                              </>
                            ) : isBackupField(f) ? (
                              <>
                                <KeyRound className={cn('h-3 w-3 shrink-0', TONE_CLASS.warn.icon)} />
                                BackupCode
                              </>
                            ) : (
                              f.key
                            )}
                          </span>
                        </Tooltip>
                      ))}
                    </div>
                  </td>
                ) : (
                <>
                <td className={TD}>
                  <div className="flex items-center gap-1">
                    {shownServices.map((s) => (
                      <Tooltip key={s.id} side="top" content={<ServiceDetail s={s} />}>
                        <span
                          className={cn(
                            BADGE,
                            'relative w-6 cursor-pointer transition-opacity hover:opacity-80',
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect(p.id, { tab: 'services', target: s.id });
                          }}
                        >
                          <ServiceIcon name={s.name} size={14} />
                          <span
                            className={cn(
                              'absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full ring-2 ring-card-background',
                              TONE_CLASS[SERVICE_STATUS[s.status].tone].dot,
                            )}
                          />
                        </span>
                      </Tooltip>
                    ))}
                    {hiddenServices.length > 0 && (
                      <Tooltip
                        side="top"
                        content={
                          <div className="flex flex-col gap-1 text-[11px]">
                            {hiddenServices.map((s) => (
                              <span key={s.id}>
                                {s.name} • {SERVICE_STATUS[s.status].label}
                              </span>
                            ))}
                          </div>
                        }
                      >
                        <span className={cn(BADGE, 'min-w-6 px-1.5 text-[10px] tabular-nums')}>
                          +{hiddenServices.length}
                        </span>
                      </Tooltip>
                    )}
                  </div>
                </td>
                <td className={cn(TD, 'w-full max-w-0 pr-2')}>
                  {latest && LatestIcon && latest.kind === 'browse' && latest.url ? (
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <Favicon
                          url={getFaviconUrl(latest.url, 32)}
                          size={14}
                          className="h-3.5 w-3.5 shrink-0 rounded-sm"
                          fallbackIcon={<LatestIcon className="h-3.5 w-3.5 shrink-0" />}
                        />
                        <span className="min-w-0 flex-1 truncate text-text-primary">
                          {latest.title || latest.url}
                        </span>
                        <span className="shrink-0 whitespace-nowrap text-[11px] text-text-secondary">
                          {timeAgo(latest.at)}
                        </span>
                      </div>
                      <span className="truncate text-[11px] text-text-secondary">{latest.url}</span>
                    </div>
                  ) : (
                    <div className="flex min-w-0 flex-col gap-0.5">
                      {(p.lastActive || latest?.at) && (
                        <span className="whitespace-nowrap text-text-primary">
                          {timeAgo(p.lastActive || latest?.at || '')}
                        </span>
                      )}
                      {latest && LatestIcon && (
                        <span className="flex min-w-0 items-center gap-1 text-[11px] text-text-secondary">
                          <LatestIcon className="h-3 w-3 shrink-0" />
                          <span className="truncate">{latest.text}</span>
                        </span>
                      )}
                    </div>
                  )}
                </td>
                </>
                )}
              </motion.tr>
            );
          })}
        </tbody>
      </table>

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
          {menuProfile && (
            <>
              <DropdownItem
                icon={<Copy className="h-3.5 w-3.5" />}
                onClick={() =>
                  void navigator.clipboard.writeText(menuProfile.email).catch(() => undefined)
                }
              >
                Copy email
              </DropdownItem>
              {runningIds?.has(menuProfile.id) ? (
                <DropdownItem
                  variant="error"
                  icon={<Square className="h-3.5 w-3.5" />}
                  onClick={() => onStop?.(menuProfile)}
                >
                  Stop browser
                </DropdownItem>
              ) : (
                <DropdownItem icon={<ExternalLink className="h-3.5 w-3.5" />}>
                  Launch Browser
                </DropdownItem>
              )}

              <DropdownItem
                icon={<FolderOpen className="h-3.5 w-3.5" />}
                onClick={() => onOpenFolder?.(menuProfile)}
              >
                Open in folder
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem
                variant="error"
                icon={<Trash2 className="h-3.5 w-3.5" />}
                onClick={() => onDelete?.(menuProfile)}
              >
                Delete
              </DropdownItem>
            </>
          )}
        </DropdownContent>
      </Dropdown>
    </div>
    </>
  );
}

export default ProfileTable;
