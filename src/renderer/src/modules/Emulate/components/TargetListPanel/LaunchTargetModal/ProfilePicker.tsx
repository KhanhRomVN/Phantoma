/**
 * Chọn browser profile cho LaunchTargetModal: tab nguồn (Chrome hệ thống
 * + các source của module Profile), ô tìm kiếm, danh sách có giới hạn
 * chiều cao.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Cloud, FileText, Globe, HardDrive, Loader2, Search, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@renderer/utils/cn';
import { profileApi } from '@renderer/modules/Profile/services/profile-api.service';
import type { Profile, ProfileSource } from '@renderer/modules/Profile/types';

import { ProfileSelect } from '../TargetModal';

const SYSTEM_ID = '__system__';
const LIST_CLASS = 'max-h-[240px] overflow-y-auto pr-1';
const CARD = 'flex min-w-0 items-center gap-3 rounded-xl border p-2.5 text-left outline-none transition-all';
const CARD_SELECTED = 'rounded-l-none border-transparent border-l-2 border-l-primary bg-input-background';
const CARD_IDLE = 'border-border/40 bg-input-background hover:bg-dropdown-item-hover/60';

const SOURCE_ICON: Record<ProfileSource['type'], LucideIcon> = {
  local: HardDrive,
  cloud: Cloud,
  file: FileText,
};

// ASSUMED: source local tên chứa "chrome" (vd Local Chrome) trùng với tab Chrome hệ thống nên bị ẩn
const isSystemChromeSource = (s: ProfileSource): boolean => s.type === 'local' && /chrome/i.test(s.name);

interface ProfilePickerProps {
  value: string;
  onChange: (path: string) => void;
}

const SourceTab: React.FC<{
  active: boolean;
  icon: LucideIcon;
  label: string;
  count?: number;
  onClick: () => void;
}> = ({ active, icon: Icon, label, count, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex items-center gap-1.5 whitespace-nowrap rounded-[5px] px-2.5 py-1 text-xs transition-colors',
      active
        ? 'bg-primary/15 font-semibold text-primary'
        : 'font-medium text-text-secondary hover:bg-text-secondary/10 hover:text-text-primary',
    )}
  >
    <Icon className="h-3 w-3" />
    {label}
    {count !== undefined && (
      <span
        className={cn(
          'rounded-md px-1.5 text-[10px] tabular-nums',
          active ? 'bg-primary/20 text-primary' : 'bg-text-secondary/15 text-text-secondary',
        )}
      >
        {count}
      </span>
    )}
  </button>
);

const Avatar: React.FC<{ src?: string | null }> = ({ src }) => {
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-border/40 text-text-secondary">
      {src && !failed ? (
        <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <User className="h-4 w-4" />
      )}
    </div>
  );
};

export function ProfilePicker({ value, onChange }: ProfilePickerProps) {
  const [sources, setSources] = useState<ProfileSource[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [activeId, setActiveId] = useState(SYSTEM_ID);
  const [loading, setLoading] = useState(false);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const visibleSources = useMemo(() => sources.filter((s) => !isSystemChromeSource(s)), [sources]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of allProfiles) map[p.sourceId] = (map[p.sourceId] ?? 0) + 1;
    return map;
  }, [allProfiles]);

  const q = query.trim().toLowerCase();
  const profiles = useMemo(
    () =>
      allProfiles.filter(
        (p) =>
          p.sourceId === activeId &&
          (!q || p.email.toLowerCase().includes(q) || p.displayName.toLowerCase().includes(q)),
      ),
    [allProfiles, activeId, q],
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([profileApi.sources.list(), profileApi.profiles.list()])
      .then(([sourceList, profileList]) => {
        if (!alive) return;
        setSources(sourceList);
        setAllProfiles(profileList);
      })
      .catch(() => {
        if (!alive) return;
        setSources([]);
        setAllProfiles([]);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const handleTab = (id: string): void => {
    if (id === activeId) return;
    setActiveId(id);
    setPickedId(null);
    setQuery('');
    onChange('');
  };

  // ASSUMED: profile của source được mở bằng thư mục do profile server trả về (folder.path)
  const pick = async (profile: Profile): Promise<void> => {
    setPickedId(profile.id);
    try {
      const info = await profileApi.browser.folder(profile.id);
      onChange(info.path);
    } catch {
      setPickedId(null);
      onChange('');
    }
  };

  return (
    <div className="space-y-2">
      {visibleSources.length > 0 && (
        <div className="inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-md bg-text-secondary/10 p-0.5">
          <SourceTab active={activeId === SYSTEM_ID} icon={Globe} label="Chrome" onClick={() => handleTab(SYSTEM_ID)} />
          {visibleSources.map((s) => (
            <SourceTab
              key={s.id}
              active={activeId === s.id}
              icon={SOURCE_ICON[s.type] ?? HardDrive}
              label={s.name}
              count={counts[s.id] ?? 0}
              onClick={() => handleTab(s.id)}
            />
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search profiles..."
          className="h-8 w-full rounded-lg bg-background pl-8 pr-3 text-xs text-text-primary outline-none placeholder:text-text-secondary"
        />
      </div>

      <div className={LIST_CLASS}>
        {activeId === SYSTEM_ID ? (
          <ProfileSelect value={value} onChange={onChange} query={query} />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setPickedId(null);
                onChange('');
              }}
              className={cn(CARD, !value ? CARD_SELECTED : CARD_IDLE)}
            >
              <Avatar />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-text-primary">No Profile</div>
                <div className="truncate text-[11px] text-text-secondary">Clean temporary session</div>
              </div>
            </button>
            {profiles.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => void pick(p)}
                className={cn(CARD, value && pickedId === p.id ? CARD_SELECTED : CARD_IDLE)}
              >
                <Avatar src={p.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-text-primary">{p.email}</div>
                  <div className="truncate text-[11px] text-text-secondary">{p.displayName}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading profiles...
        </div>
      )}
    </div>
  );
}

export default ProfilePicker;