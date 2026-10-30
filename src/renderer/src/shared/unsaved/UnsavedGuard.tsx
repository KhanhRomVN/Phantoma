import { useCallback, useEffect, useState } from 'react';
import UnsavedChangesModal from '@renderer/components/UnsavedChangesModal';
import {
  countUnsaved,
  getUnsavedGroups,
  saveAllUnsaved,
  type UnsavedGroup,
} from './unsavedRegistry';

export function UnsavedGuard() {
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<UnsavedGroup[]>([]);
  const [hasSaveError, setHasSaveError] = useState(false);

  const reloadApp = useCallback(() => {
    (window as any).__skipUnloadGuard = true;
    window.location.reload();
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setHasSaveError(false);
  }, []);

  const handleSaveAll = useCallback(async () => {
    const remaining = await saveAllUnsaved();
    if (remaining.length === 0) {
      reloadApp();
      return;
    }
    setGroups(remaining);
    setHasSaveError(true);
  }, [reloadApp]);

  useEffect(() => {
    const onReloadKey = (e: KeyboardEvent) => {
      const isReload = ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') || e.key === 'F5';
      if (!isReload) return;
      const current = getUnsavedGroups();
      if (current.length === 0) return;
      e.preventDefault();
      e.stopPropagation();
      setGroups(current);
      setHasSaveError(false);
      setOpen(true);
    };
    window.addEventListener('keydown', onReloadKey, true);
    return () => window.removeEventListener('keydown', onReloadKey, true);
  }, []);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if ((window as any).__skipUnloadGuard) return;
      if (countUnsaved() > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  return (
    <UnsavedChangesModal
      isOpen={open}
      onClose={handleClose}
      groups={groups}
      hasSaveError={hasSaveError}
      onSaveAll={handleSaveAll}
      onDiscard={reloadApp}
    />
  );
}

export default UnsavedGuard;