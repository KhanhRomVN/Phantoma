import { useCallback, useEffect, useState } from 'react';
import { toastService } from '@renderer/components/ui/Toast';

export interface BackupSchedule {
  enabled: boolean;
  intervalMin: number;
}

export interface BackupStatus {
  root: string;
  enabled: boolean;
  remoteUrl?: string;
  branch?: string;
  changes?: number;
  unpushed?: number;
  lastSync?: string | null;
  schedule?: BackupSchedule;
}

export type SyncState = 'idle' | 'loading' | 'success' | 'error';

interface SyncPayload {
  state: SyncState;
  error?: string;
}

export const COMMIT_MESSAGE = 'Backup Phantoma configuration';
const SYNC_TOAST_ID = 'backup-sync';

const invoke = <T,>(channel: string, ...args: unknown[]): Promise<T> =>
  window.api.invoke(channel, ...args);

export function useBackup() {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [syncState, setSyncState] = useState<SyncState>('idle');

  const refresh = useCallback(async () => {
    try {
      setStatus(await invoke<BackupStatus>('backup:status'));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 30000);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    const off = window.api.on('backup:state', (_e: unknown, p: SyncPayload) => {
      setSyncState(p.state);
      if (p.state === 'loading') {
        toastService.show({
          id: SYNC_TOAST_ID,
          variant: 'loading',
          title: 'Syncing backup...',
          description: 'Committing and pushing to GitHub',
        });
      } else if (p.state === 'success') {
        toastService.show({
          id: SYNC_TOAST_ID,
          variant: 'success',
          title: 'Backup synced',
          description: 'Changes were pushed to GitHub',
          duration: 4000,
        });
      } else if (p.state === 'error') {
        toastService.show({
          id: SYNC_TOAST_ID,
          variant: 'error',
          title: 'Sync failed',
          description: p.error,
          duration: 6000,
        });
      }
      void refresh();
    });
    return off;
  }, [refresh]);

  useEffect(() => {
    if (syncState !== 'success' && syncState !== 'error') return;
    const t = setTimeout(() => setSyncState('idle'), 3000);
    return () => clearTimeout(t);
  }, [syncState]);

  const sync = useCallback(async () => {
    try {
      await invoke<{ ok?: boolean; error?: string }>('backup:sync');
    } catch (e) {
      setSyncState('error');
      toastService.show({
        id: SYNC_TOAST_ID,
        variant: 'error',
        title: 'Sync failed',
        description: e instanceof Error ? e.message : String(e),
        duration: 6000,
      });
    }
  }, []);

  return { status, syncState, refresh, sync };
}