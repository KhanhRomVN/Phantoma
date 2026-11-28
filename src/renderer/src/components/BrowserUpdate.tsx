/**
 * ------------------------------------------------------------------
 * BrowserUpdate
 * ------------------------------------------------------------------
 * Nút nổi bật trên HeaderBar hiển thị trạng thái version của các browser fork
 * (ungoogled-chromium...). Click mở dropdown: mỗi fork là 1 DropdownItem kèm nút Update.
 * ------------------------------------------------------------------
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Loader2, RefreshCw } from 'lucide-react';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from '@renderer/components/ui/Dropdown';
import { Button } from '@renderer/components/ui/Button';
import { cn } from '@renderer/utils/cn';
import { ForkUpdateInfo } from '@renderer/modules/Profile/shared/types';
import { profileApi } from '@renderer/modules/Profile/shared/api/profile.api';

const POLL_BUSY_MS = 1000;
const POLL_OFFLINE_MS = 3000; // ASSUMED: profile server may start after the renderer (on-demand spawn), so retry until it answers
const POLL_IDLE_MS = 10 * 60 * 1000;

const isBusy = (f: ForkUpdateInfo): boolean => !!f.job && f.job.phase !== 'error';

function useForkUpdates() {
  const [forks, setForks] = useState<ForkUpdateInfo[] | null>(null);
  const [checking, setChecking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);

  const load = useCallback(async (force = false) => {
    if (timer.current) clearTimeout(timer.current);
    let delay = POLL_OFFLINE_MS;
    try {
      const data = force
        ? await profileApi.browser.checkUpdates()
        : await profileApi.browser.updates();
      if (!alive.current) return;
      setForks(data);
      delay = data.some(isBusy) ? POLL_BUSY_MS : POLL_IDLE_MS;
    } catch {
      if (!alive.current) return;
    }
    timer.current = setTimeout(() => void load(), delay);
  }, []);

  useEffect(() => {
    alive.current = true;
    void load();
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [load]);

  const check = async () => {
    setChecking(true);
    await load(true);
    setChecking(false);
  };

  const install = async (id: string) => {
    try {
      const info = await profileApi.browser.installFork(id);
      setForks((prev) => prev?.map((f) => (f.id === id ? info : f)) ?? prev);
    } catch (err) {
      console.error('Failed to start browser install:', err);
    }
    void load();
  };

  return { forks, checking, check, install };
}

function summarize(forks: ForkUpdateInfo[] | null) {
  if (!forks) return { label: 'Browsers', tone: 'idle' as const };
  const busy = forks.find(isBusy);
  if (busy?.job) {
    const pct = busy.job.phase === 'downloading' ? ` ${Math.round(busy.job.progress * 100)}%` : '';
    return { label: `Installing${pct}`, tone: 'busy' as const };
  }
  const updatable = forks.filter((f) => f.hasUpdate);
  if (updatable.length > 0)
    return { label: `Update available (${updatable.length})`, tone: 'update' as const };
  const first = forks[0];
  return {
    label: first?.current ? `Chromium ${first.current}` : 'Browsers',
    tone: 'idle' as const,
  };
}

export function BrowserUpdate() {
  const { forks, checking, check, install } = useForkUpdates();
  const { label, tone } = summarize(forks);

  return (
    <Dropdown align="end" width={340}>
      <DropdownTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer',
            tone === 'update' && 'bg-primary/15 text-primary hover:bg-primary/25',
            tone === 'busy' && 'bg-amber-500/15 text-amber-500 hover:bg-amber-500/25',
            tone === 'idle' &&
              'bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/15',
          )}
        >
          {tone === 'busy' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
          ) : (
            <Download className="w-3.5 h-3.5" strokeWidth={2} />
          )}
          <span className="whitespace-nowrap">{label}</span>
          {tone === 'update' && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          )}
        </button>
      </DropdownTrigger>
      <DropdownContent>
        {!forks && (
          <DropdownItem disabled closeOnSelect={false}>
            Profile server is not reachable
          </DropdownItem>
        )}
        {forks?.map((f) => (
          <DropdownItem
            key={f.id}
            noPadding
            closeOnSelect={false}
            className="py-1.5 px-3 items-start"
          >
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <span className="text-[13px] font-medium text-text-primary">{f.name}</span>
              <span className="text-[11px] font-mono text-text-secondary">
                {f.current ? `Installed ${f.current}` : 'Not installed'}
                {f.latest ? ` · Latest ${f.latest}` : ''}
              </span>
              {f.job?.phase === 'error' && (
                <span className="text-[11px] text-error truncate">{f.job.error}</span>
              )}
              {!f.job && f.checkError && (
                <span className="text-[11px] text-error truncate">{f.checkError}</span>
              )}
              {!f.supported && (
                <span className="text-[11px] text-text-secondary">
                  Auto-update is not supported on this platform
                </span>
              )}
            </div>
            {isBusy(f) && f.job ? (
              <span className="text-[11px] font-mono text-amber-500 self-center whitespace-nowrap">
                {f.job.phase === 'downloading'
                  ? `${Math.round(f.job.progress * 100)}%`
                  : f.job.phase}
              </span>
            ) : (
              f.supported &&
              (f.hasUpdate || f.job?.phase === 'error') && (
                <Button
                  className="self-center bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30"
                  onClick={(e) => {
                    e.stopPropagation();
                    void install(f.id);
                  }}
                >
                  Update
                </Button>
              )
            )}
          </DropdownItem>
        ))}
        <DropdownSeparator />
        <DropdownItem
          icon={<RefreshCw className={cn('w-3.5 h-3.5', checking && 'animate-spin')} />}
          closeOnSelect={false}
          onClick={() => void check()}
          disabled={checking}
        >
          Check for updates
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}
