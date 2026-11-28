import { useCallback, useState } from 'react';

export type DialogKind = 'create' | 'import' | 'delete' | 'source' | 'deleteSource';

/** Which dialog is open, plus the ids it was opened for (proxies to delete, source to edit/delete). */
export function useProxyDialogs() {
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [editSourceId, setEditSourceId] = useState<string | null>(null);
  const [deleteSourceId, setDeleteSourceId] = useState<string | null>(null);

  const closeDialog = useCallback(() => setDialog(null), []);
  const openCreate = useCallback(() => setDialog('create'), []);
  const openImport = useCallback(() => setDialog('import'), []);

  const askDelete = useCallback((ids: string[]): void => {
    setDeleteIds(ids);
    setDialog('delete');
  }, []);

  const openSource = useCallback((id: string | null): void => {
    setEditSourceId(id);
    setDialog('source');
  }, []);

  const askDeleteSource = useCallback((id: string): void => {
    setDeleteSourceId(id);
    setDialog('deleteSource');
  }, []);

  const clearDeleteIds = useCallback(() => setDeleteIds([]), []);
  const clearDeleteSourceId = useCallback(() => setDeleteSourceId(null), []);

  return {
    dialog,
    deleteIds,
    editSourceId,
    deleteSourceId,
    closeDialog,
    openCreate,
    openImport,
    askDelete,
    openSource,
    askDeleteSource,
    clearDeleteIds,
    clearDeleteSourceId,
  };
}
