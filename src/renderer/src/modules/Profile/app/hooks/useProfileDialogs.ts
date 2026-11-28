import { useState } from 'react';
import type { Profile as ProfileRecord, RunningBrowser } from '../../shared/types';

export type DialogKind = 'source' | 'import' | 'profile' | 'group' | 'transfer' | 'delete';

interface DialogDeps {
  profiles: ProfileRecord[];
  running: RunningBrowser[];
}

export function useProfileDialogs({ profiles, running }: DialogDeps) {
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [editSourceId, setEditSourceId] = useState<string | null>(null);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [stopId, setStopId] = useState<string | null>(null);

  const deleteTargets = profiles.filter((p) => deleteIds.includes(p.id));
  const stopTarget = profiles.find((p) => p.id === stopId) ?? null;
  const stopBrowser = running.find((r) => r.emailId === stopId)?.browser;

  const requestDelete = (ids: string[]): void => {
    setDeleteIds(ids);
    setDialog('delete');
  };

  return {
    dialog,
    setDialog,
    editSourceId,
    setEditSourceId,
    deleteIds,
    stopId,
    setStopId,
    deleteTargets,
    stopTarget,
    stopBrowser,
    requestDelete,
  };
}
