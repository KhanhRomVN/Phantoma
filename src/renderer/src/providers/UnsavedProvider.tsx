import { useCallback, useEffect, useState, type ReactNode } from 'react';
import UnsavedChangesModal from '@renderer/components/UnsavedChangesModal';

export interface UnsavedItem {
  id: string;
  name: string;
  detail?: string;
  badge?: string;
}

export interface UnsavedProviderEntry {
  id: string;
  label: string;
  getItems: () => UnsavedItem[];
  saveItem?: (itemId: string) => Promise<void>;
}

export interface UnsavedGroup {
  providerId: string;
  label: string;
  canSave: boolean;
  items: UnsavedItem[];
}

const providers = new Map<string, UnsavedProviderEntry>();

export function registerUnsavedProvider(provider: UnsavedProviderEntry): () => void {
  providers.set(provider.id, provider);
  return () => {
    if (providers.get(provider.id) === provider) providers.delete(provider.id);
  };
}

function getUnsavedGroups(): UnsavedGroup[] {
  const groups: UnsavedGroup[] = [];
  providers.forEach((provider) => {
    const items = provider.getItems();
    if (items.length === 0) return;
    groups.push({
      providerId: provider.id,
      label: provider.label,
      canSave: !!provider.saveItem,
      items,
    });
  });
  return groups;
}

function countUnsaved(): number {
  return getUnsavedGroups().reduce((n, g) => n + g.items.length, 0);
}

async function saveAllUnsaved(): Promise<UnsavedGroup[]> {
  for (const provider of Array.from(providers.values())) {
    if (!provider.saveItem) continue;
    for (const item of provider.getItems()) {
      try {
        await provider.saveItem(item.id);
      } catch (err) {
        console.error('[Unsaved] Failed to save ' + provider.id + ':' + item.id, err);
      }
    }
  }
  return getUnsavedGroups();
}

export function UnsavedProvider({ children }: { children: ReactNode }) {
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
    <>
      {children}
      <UnsavedChangesModal
        isOpen={open}
        onClose={handleClose}
        groups={groups}
        hasSaveError={hasSaveError}
        onSaveAll={handleSaveAll}
        onDiscard={reloadApp}
      />
    </>
  );
}

export default UnsavedProvider;