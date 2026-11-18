import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Fingerprint,
  FolderOpen,
  History,
  LayoutDashboard,
  MoreHorizontal,
  Plug,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Button } from '@renderer/components/ui/Button';

import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from '@renderer/components/ui/Dropdown';
import type { BrowserEngine, Profile, ProfileSource } from '../../types';

import { Avatar } from '../common/Avatar';
import { ProfileStatusBadge, SyncBadge } from '../common/StatusBadge';
import { TONE_CLASS } from '../../constants/tone';
import { PROFILE_STATUS, PROFILE_STATUS_ORDER } from '../../constants/status';
import { profileApi } from '../../services/profile-api.service';
import type { ProfileStatus } from '../../types';
import type { Tone } from '../../types/ui.types';

import { OverviewTab } from './tab/Overview/OverviewTab';
import { ServicesTab } from './tab/Services/ServicesTab';
import { FootprintTab } from './tab/Footprint/FootprintTab';
import { HistoryTab } from './tab/History/HistoryTab';
import { ActivityTab } from './tab/Activity/ActivityTab';
import type { DuplicateEntry } from './tab/Overview/DuplicateSection';
import { useProfileViewStore } from '../../stores/useProfileViewStore';
import { LaunchBrowserModal } from '../modal/LaunchBrowserModal';

type TabId = 'overview' | 'services' | 'footprint' | 'history' | 'activity';

const TAB_IDS: TabId[] = ['overview', 'services', 'footprint', 'history', 'activity'];

export interface DrawerFocus {
  tab: 'overview' | 'services';
  target: string;
  nonce: number;
}

interface ProfileDrawerProps {
  focus?: DrawerFocus | null;
  profile: Profile;
  source?: ProfileSource;
  duplicates?: DuplicateEntry[];
  onOpenDuplicate?: (profileId: string) => void;
  onUpdate?: (patch: Partial<Profile>) => void;
  onClose: () => void;
}

const SOFT_BTN =
  'h-8 shrink-0 rounded-md bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/15 active:bg-text-secondary/20';
const PRIMARY_BTN =
  'h-8 rounded-md bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30';

const BROWSER_LABEL: Record<BrowserEngine, string> = {
  chrome: 'Chrome',
  chromium: 'Chromium',
};

function LaunchButton({ profile, source }: { profile: Profile; source?: ProfileSource }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button className={cn(PRIMARY_BTN, 'min-w-0 flex-1')} onClick={() => setOpen(true)}>
        <ExternalLink className="h-3.5 w-3.5" />
        Launch Browser
      </Button>
      <LaunchBrowserModal
        open={open}
        profile={profile}
        source={source}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

export function ProfileDrawer({
  profile,
  source,
  duplicates = [],
  onOpenDuplicate,
  onUpdate,
  onClose,
  focus,
}: ProfileDrawerProps) {
  const [pendingFocus, setPendingFocus] = useState<DrawerFocus | null>(focus ?? null);
  const [tab, setTabState] = useState<TabId>(() => {
    if (focus) return focus.tab;
    const saved = useProfileViewStore.getState().drawerTab;
    return saved && TAB_IDS.includes(saved as TabId) ? (saved as TabId) : 'overview';
  });
  const setTab = (next: TabId): void => {
    setTabState(next);
    useProfileViewStore.getState().setView({ drawerTab: next });
  };
  useEffect(() => {
    if (!focus) return;
    setPendingFocus(focus);
    setTab(focus.tab);
  }, [focus?.nonce]);
  const hue = profile.avatarHue;
  const changeStatus = (status: ProfileStatus): void => {
    const patch: Partial<Profile> = {
      status,
      statusNote: status === 'active' ? undefined : profile.statusNote,
    };
    profileApi.profiles
      .update(profile.id, { status, statusNote: status === 'active' ? undefined : profile.statusNote })
      .then(() => onUpdate?.(patch))
      .catch((e) => console.error('[DEBUG] changeStatus FAILED', status, e));
  };
  const chromePath = profile.chromeProfile
    ? `home/.chrome/${profile.chromeProfile.toLowerCase().replace(/\s+/g, '')}`
    : '';

  const tabs: { id: TabId; label: string; icon: LucideIcon; tone: Tone; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, tone: 'primary' },
    { id: 'services', label: 'Services', icon: Plug, tone: 'info', count: profile.services.length },
    { id: 'footprint', label: 'Footprint', icon: Fingerprint, tone: 'success' },
    {
      id: 'history',
      label: 'History',
      icon: History,
      tone: 'info',
      count: profile.browsing.length,
    },
    { id: 'activity', label: 'Activity', icon: Activity, tone: 'warn' },
  ];

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="relative shrink-0 overflow-hidden bg-card-background">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(120% 100% at 0% 0%, hsl(${hue} 70% 55% / 0.22), transparent 60%), radial-gradient(80% 80% at 100% 0%, hsl(${(hue + 70) % 360} 70% 55% / 0.12), transparent 65%)`,
          }}
        />

        <div className="relative flex h-10 items-center justify-between border-b border-border px-4">
          <nav className="flex min-w-0 items-center gap-1 text-[11px] text-text-secondary">
            <span className="shrink-0">Profiles</span>
            {source && (
              <>
                <ChevronRight className="h-3 w-3 shrink-0 opacity-60" />
                <span className="truncate">{source.name}</span>
              </>
            )}
            <ChevronRight className="h-3 w-3 shrink-0 opacity-60" />
            <span className="truncate font-medium text-text-primary">{profile.displayName}</span>
          </nav>
          <button
            type="button"
            onClick={onClose}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-background/60 text-text-secondary backdrop-blur transition-colors hover:bg-error/15 hover:text-error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative flex flex-col gap-4 px-4 pb-4 pt-4">
          <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-3">
            <Avatar
              name={profile.displayName}
              hue={profile.avatarHue}
              src={profile.avatarUrl}
              size={44}
            />
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="min-w-0 truncate text-base font-semibold leading-6 text-text-primary">
                  {profile.displayName}
                </h2>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Dropdown align="start" width={170}>
                    <DropdownTrigger asChild>
                      <button type="button" title="Change status" className="flex items-center">
                        <ProfileStatusBadge status={profile.status} />
                      </button>
                    </DropdownTrigger>
                    <DropdownContent>
                      {PROFILE_STATUS_ORDER.map((s) => {
                        const meta = PROFILE_STATUS[s];
                        return (
                          <DropdownItem
                            key={s}
                            icon={<meta.icon className={cn('h-3.5 w-3.5', TONE_CLASS[meta.tone].icon)} />}
                            onClick={() => changeStatus(s)}
                          >
                            {meta.label}
                          </DropdownItem>
                        );
                      })}
                    </DropdownContent>
                  </Dropdown>
                  <SyncBadge state={profile.chromeSync} />
                </div>
              </div>
              <div className="flex min-w-0 items-center gap-2 text-xs leading-4 text-text-secondary">
                <button
                  type="button"
                  title="Click to copy email"
                  onClick={() =>
                    void navigator.clipboard.writeText(profile.email).catch(() => undefined)
                  }
                  className="min-w-0 shrink-0 truncate text-left transition-colors hover:text-primary"
                >
                  {profile.email}
                </button>
                {chromePath && (
                  <>
                    <span className="h-0.5 w-0.5 shrink-0 rounded-full bg-text-secondary/60" />
                    <span className="min-w-0 truncate font-mono text-[11px] text-text-secondary/70">
                      {chromePath}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {profile.statusNote && (
            <div className="rounded-md bg-warn/10 px-2.5 py-1.5 text-[11px] text-warn">
              {profile.statusNote}
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <LaunchButton profile={profile} source={source} />
            <Button className={SOFT_BTN}>
              <FolderOpen className="h-3.5 w-3.5" />
              Folder
            </Button>
            <Button className={SOFT_BTN}>
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
            <Button
              className={SOFT_BTN}
              disabled={!chromePath}
              onClick={() => void navigator.clipboard.writeText(chromePath)}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy path
            </Button>
            <Dropdown align="end" width={190}>
              <DropdownTrigger asChild>
                <button
                  type="button"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-text-secondary/10 text-text-secondary transition-colors hover:bg-text-secondary/15"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownTrigger>
              <DropdownContent>
                <DropdownItem variant="error" icon={<Trash2 className="h-3.5 w-3.5" />}>
                  Delete
                </DropdownItem>
              </DropdownContent>
            </Dropdown>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 gap-1 border-b border-border px-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'relative flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium transition-colors',
              tab === t.id
                ? TONE_CLASS[t.tone].pill.split(' ')[1]
                : 'text-text-secondary hover:text-text-primary',
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
            {t.count !== undefined && (
              <span className="rounded-md bg-text-secondary/10 px-1.5 text-[10px] tabular-nums text-text-secondary">
                {t.count}
              </span>
            )}
            {tab === t.id && (
              <motion.span
                layoutId="profile-tab-underline"
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={cn(
                  'absolute inset-x-2 -bottom-px h-0.5 rounded-full',
                  TONE_CLASS[t.tone].dot,
                )}
              />
            )}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-3">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className="flex flex-1 flex-col"
        >
          {tab === 'overview' && (
            <OverviewTab
              profile={profile}
              duplicates={duplicates}
              onOpenDuplicate={onOpenDuplicate}
              onUpdate={onUpdate}
              focus={pendingFocus?.tab === 'overview' ? pendingFocus : null}
              onFocusDone={() => setPendingFocus(null)}
            />
          )}
          {tab === 'services' && (
            <ServicesTab
              profile={profile}
              focus={pendingFocus?.tab === 'services' ? pendingFocus : null}
              onFocusDone={() => setPendingFocus(null)}
            />
          )}
          {tab === 'footprint' && <FootprintTab profile={profile} />}
          {tab === 'history' && <HistoryTab profile={profile} />}
          {tab === 'activity' && <ActivityTab profile={profile} />}
        </motion.div>
        <div className="h-20 shrink-0" />
      </div>
    </div>
  );
}

export default ProfileDrawer;
