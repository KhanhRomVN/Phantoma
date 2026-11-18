import { Check } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import type { Fork, Profile } from '../../../types';
import { Avatar } from '../../common/Avatar';
import { ServiceIcon } from '../../common/StatusBadge';
import { Pill } from './ConfigPanel/ConfigBits';
const CHROME_URL = 'https://www.google.com/intl/vi_vn/chrome/';

interface BrowserPanelProps {
  profile: Profile;

  isChrome: boolean;
  forks: Fork[];
  loading: boolean;
  forkId: string;
  onSelectChrome: () => void;
  onSelectFork: (id: string) => void;
}

function CheckMark() {
  return (
    <span className='flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-white'>
      <Check className='h-2.5 w-2.5' />
    </span>
  );
}

export function BrowserPanel({ profile, isChrome, forks, loading, forkId, onSelectChrome, onSelectFork }: BrowserPanelProps) {
  const hue = profile.avatarHue;
  const installedCount = forks.filter((f) => f.installed).length;

  return (
    <aside className='relative flex min-h-0 flex-col border-r border-border bg-card-background'>
      <div
        aria-hidden
        className='pointer-events-none absolute inset-x-0 top-0 h-44'
        style={{
          background: `radial-gradient(120% 100% at 0% 0%, hsl(${hue} 70% 55% / 0.28), transparent 65%), radial-gradient(90% 80% at 100% 0%, hsl(${(hue + 70) % 360} 70% 55% / 0.14), transparent 70%)`,
        }}
      />
      <div className='relative flex h-16 shrink-0 items-center gap-3 border-b border-border px-4'>
        <Avatar name={profile.displayName} hue={profile.avatarHue} src={profile.avatarUrl} size={40} />
        <div className='flex min-w-0 flex-col'>
          <span className='truncate text-sm font-semibold text-text-primary'>{profile.displayName}</span>
          <span className='truncate text-[11px] text-text-secondary'>{profile.email}</span>
        </div>
      </div>

      <div className='relative flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4'>
        <div className='flex flex-col gap-2'>
          <span className='text-[10px] font-semibold uppercase tracking-wider text-text-secondary'>Browser</span>
          <button
            type='button'
            onClick={onSelectChrome}
            className={cn(
              'flex items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40',
              isChrome ? 'border-dashed border-primary' : 'border-transparent bg-text-secondary/5 hover:bg-text-secondary/10',
            )}
          >
            <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/60'>
              <ServiceIcon name='Google Chrome' url={CHROME_URL} size={20} />
            </span>
            <span className='flex min-w-0 flex-1 flex-col'>
              <span className='truncate text-xs font-semibold text-text-primary'>Google Chrome</span>
              <span className='truncate text-[11px] text-text-secondary'>Real device footprint</span>
            </span>
            {isChrome && <CheckMark />}
          </button>
        </div>

        <div className='flex flex-col gap-2'>
          <div className='flex items-center justify-between'>
            <span className='text-[10px] font-semibold uppercase tracking-wider text-text-secondary'>Chromium forks</span>
            <span className='text-[10px] text-text-secondary'>{installedCount} installed</span>
          </div>
          <div className='flex flex-col gap-1.5'>
            {!loading && forks.length === 0 && (
              <span className='rounded-xl bg-text-secondary/5 px-3 py-2.5 text-[11px] text-text-secondary'>No forks available</span>
            )}
            {forks.map((f) => {
              const active = !isChrome && f.id === forkId;
              return (
                <button
                  key={f.id}
                  type='button'
                  disabled={!f.installed}
                  title={f.installed ? `${f.name} — ${f.desc}` : `${f.name} is not installed`}
                  onClick={() => onSelectFork(f.id)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                    active ? 'border-dashed border-primary' : 'border-transparent bg-text-secondary/5 hover:bg-text-secondary/10',
                  )}
                >
                  <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background/60'>
                    <ServiceIcon name={f.name} url={f.url} size={18} />
                  </span>
                  <span className='flex min-w-0 flex-1 flex-col gap-0.5'>
                    <span className='flex min-w-0 items-center gap-1.5'>
                      <span className='min-w-0 truncate whitespace-nowrap text-xs font-medium text-text-primary'>{f.name}</span>
                      <Pill tone={f.tone}>{f.badge}</Pill>
                    </span>
                    <span className='flex min-w-0 items-center gap-2'>
                      <span className='min-w-0 flex-1 truncate whitespace-nowrap text-[10px] text-text-secondary'>{f.desc}</span>
                      <span className='max-w-[45%] shrink-0 truncate whitespace-nowrap font-mono text-[10px] text-text-secondary/70'>
                        {f.installed ? `v${f.version ?? '?'}` : 'Not installed'}
                      </span>
                    </span>
                  </span>
                  {active && <CheckMark />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}

export default BrowserPanel;