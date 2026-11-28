import { useCallback, useMemo, useState } from 'react';
import type { Proxy } from '../../../shared/types/proxy-domain.types';

/**
 * Row selection: one inspected proxy (`selectedId`) plus a set of checked rows for bulk actions.
 * `visible` is what "select all" applies to; `proxies` is what ids are resolved against.
 */
export function useProxySelection(proxies: Proxy[], visible: Proxy[]) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const selected = useMemo(
    () => proxies.find((p) => p.id === selectedId) ?? null,
    [proxies, selectedId],
  );
  const checkedList = proxies.filter((p) => checkedIds.has(p.id));

  const select = useCallback((id: string) => setSelectedId(id), []);
  const clearSelected = useCallback(() => setSelectedId(null), []);

  const toggleCheck = useCallback((id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(
    (checked: boolean) => setCheckedIds(checked ? new Set(visible.map((p) => p.id)) : new Set()),
    [visible],
  );

  const clearChecked = useCallback(() => setCheckedIds(new Set()), []);

  /** Drops both the checks and the inspected proxy (used when switching source). */
  const reset = useCallback(() => {
    setCheckedIds(new Set());
    setSelectedId(null);
  }, []);

  /** Removes deleted proxies from the checks and closes the inspector if it showed one. */
  const forget = useCallback((ids: string[]) => {
    const gone = new Set(ids);
    setCheckedIds((prev) => new Set([...prev].filter((id) => !gone.has(id))));
    setSelectedId((prev) => (prev && gone.has(prev) ? null : prev));
  }, []);

  return {
    selectedId,
    selected,
    checkedIds,
    checkedList,
    select,
    clearSelected,
    toggleCheck,
    toggleAll,
    clearChecked,
    reset,
    forget,
  };
}
