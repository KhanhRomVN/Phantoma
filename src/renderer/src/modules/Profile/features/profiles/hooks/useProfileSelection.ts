import { useCallback, useMemo, useState } from 'react';
import type { Profile as ProfileRecord, ProfileSource } from '../../../shared/types';

interface SelectionDeps {
  profiles: ProfileRecord[];
  sources: ProfileSource[];
  visible: ProfileRecord[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  setActiveSourceId: (id: string) => void;
}

export function useProfileSelection({
  profiles,
  sources,
  visible,
  selectedId,
  setSelectedId,
  setActiveSourceId,
}: SelectionDeps) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const selected = useMemo(
    () => profiles.find((p) => p.id === selectedId) ?? null,
    [profiles, selectedId],
  );

  // ASSUMED: duplicates are matched client-side by case-insensitive email across all loaded sources
  const duplicates = useMemo(() => {
    if (!selected) return [];
    const key = selected.email.trim().toLowerCase();
    const result = profiles
      .filter(
        (p) =>
          p.id !== selected.id &&
          p.sourceId !== selected.sourceId &&
          p.email.trim().toLowerCase() === key,
      )
      .map((p) => ({ profile: p, source: sources.find((s) => s.id === p.sourceId) }));
    return result;
  }, [profiles, sources, selected]);

  const openDuplicate = useCallback(
    (profileId: string) => {
      const target = profiles.find((p) => p.id === profileId);
      if (!target) return;
      setActiveSourceId(target.sourceId);
      setCheckedIds(new Set());
      setSelectedId(target.id);
    },
    [profiles, setActiveSourceId, setSelectedId],
  );

  const toggleCheck = useCallback((id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(
    (checked: boolean) => {
      setCheckedIds(checked ? new Set(visible.map((p) => p.id)) : new Set());
    },
    [visible],
  );

  const checkedProfiles = profiles.filter((p) => checkedIds.has(p.id));

  return { checkedIds, setCheckedIds, checkedProfiles, selected, duplicates, openDuplicate, toggleCheck, toggleAll };
}
