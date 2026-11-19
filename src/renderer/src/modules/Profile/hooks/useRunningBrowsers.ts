import { useCallback, useEffect, useMemo, useState } from 'react';
import { profileApi } from '../services/profile-api.service';
import type { RunningBrowser } from '../services/profile-api.service';

export const BROWSER_CHANGED_EVENT = 'profile:browser-changed';
const POLL_MS = 2000;

export function notifyBrowserChanged(): void {
  window.dispatchEvent(new Event(BROWSER_CHANGED_EVENT));
}

const sameList = (a: RunningBrowser[], b: RunningBrowser[]): boolean =>
  a.length === b.length && a.every((r, i) => r.emailId === b[i].emailId && r.pid === b[i].pid);

export function useRunningBrowsers() {
  const [running, setRunning] = useState<RunningBrowser[]>([]);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const next = await profileApi.browser.running();
      setRunning((prev) => (sameList(prev, next) ? prev : next));
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    const onChanged = (): void => void refresh();
    void refresh();
    const timer = window.setInterval(onChanged, POLL_MS);
    window.addEventListener(BROWSER_CHANGED_EVENT, onChanged);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(BROWSER_CHANGED_EVENT, onChanged);
    };
  }, [refresh]);

  const runningIds = useMemo(() => new Set(running.map((r) => r.emailId)), [running]);

  return { running, runningIds, refresh };
}