import { useEffect, useMemo, useState } from 'react';
import { toastService } from '@renderer/components/ui/Toast';
import { profileApi } from '../../shared/api/profile.api';
import type { Profile as ProfileRecord, SavedQuery } from '../../shared/types';
import { useProfileViewStore } from '../../features/profiles';
import { compileQuery, DEFAULT_QUICK_FILTERS, matchQuickFilters, savedQueryText } from '../../features/queries';
import type { QuickFilters } from '../../features/queries';

interface FilterDeps {
  run: (task: () => Promise<void>) => Promise<void>;
  sourceProfiles: ProfileRecord[];
}

export function useProfilePageFilters({ run, sourceProfiles }: FilterDeps) {
  const [filters, setFilters] = useState<QuickFilters>(() => ({
    ...DEFAULT_QUICK_FILTERS,
    search: useProfileViewStore.getState().search,
  }));
  const [queries, setQueries] = useState<SavedQuery[]>([]);
  const [activeQueryId, setActiveQueryId] = useState<string | null>(null);
  const [previewQuery, setPreviewQuery] = useState<SavedQuery | null>(null);
  const [queryDrawer, setQueryDrawer] = useState<{ editId: string | null } | null>(null);

  useEffect(() => {
    void run(async () => {
      setQueries(await profileApi.queries.list());
    });
  }, [run]);

  const activeQuery = useMemo(
    () => queries.find((q) => q.id === activeQueryId) ?? null,
    [queries, activeQueryId],
  );

  const activeCompiled = useMemo(() => {
    const shown = previewQuery ?? activeQuery;
    if (!shown) return null;
    const text = savedQueryText(shown);
    if (!text) return null;
    const c = compileQuery(text);
    return c.ok ? c : null;
  }, [activeQuery, previewQuery]);

  const visible = useMemo(
    () =>
      sourceProfiles.filter(
        (p) => matchQuickFilters(p, filters) && (!activeCompiled || activeCompiled.match(p)),
      ),
    [sourceProfiles, filters, activeCompiled],
  );

  const editingQuery = useMemo(
    () => (queryDrawer?.editId ? (queries.find((q) => q.id === queryDrawer.editId) ?? null) : null),
    [queries, queryDrawer],
  );

  const saveQuery = (q: SavedQuery): void => {
    void run(async () => {
      const input = { ...q, text: savedQueryText(q) };
      const saved = queries.some((x) => x.id === q.id)
        ? await profileApi.queries.update(q.id, input)
        : await profileApi.queries.create(input);
      setQueries((prev) =>
        prev.some((x) => x.id === saved.id) ? prev.map((x) => (x.id === saved.id ? saved : x)) : [...prev, saved],
      );
      setActiveQueryId(saved.id);
      setQueryDrawer(null);
      toastService.show({ variant: 'success', title: 'Query saved' });
    });
  };

  const deleteQuery = (id: string): void => {
    void run(async () => {
      await profileApi.queries.remove(id);
      setQueries((prev) => prev.filter((q) => q.id !== id));
      setActiveQueryId((prev) => (prev === id ? null : prev));
      setQueryDrawer((prev) => (prev?.editId === id ? null : prev));
      toastService.show({ variant: 'success', title: 'Query deleted' });
    });
  };

  return {
    filters,
    setFilters,
    queries,
    activeQueryId,
    setActiveQueryId,
    previewQuery,
    setPreviewQuery,
    queryDrawer,
    setQueryDrawer,
    editingQuery,
    visible,
    saveQuery,
    deleteQuery,
  };
}
