import { useCallback, useEffect, useMemo, useState } from 'react';
import { proxiesApi, useProxies, useProxyFilters, useProxyMutations, useProxySelection, useProxyTesting } from '../../features/proxy';
import { computeSourceStats, sourcesApi, useSources, withProxyCounts } from '../../features/sources';
import { useVpnLifecycle, vpnApi, warpApi } from '../../features/vpn';
import type { WarpCreateInput } from '../../features/vpn';
import { errorMessage } from '../../shared/utils/error';
import { foxholeProfileGateway } from '../integrations/foxhole-profile.adapter';
import { useProxyDialogs } from './useProxyDialogs';

/**
 * Wires the proxy, source and VPN features together for the Proxy page.
 * Each concern lives in its own hook; this one only owns the cross-feature glue
 * (shared error banner, combined reload, and flows that touch more than one feature).
 */
export function useProxyPage() {
  const [error, setError] = useState<string | null>(null);
  const { proxies, setProxies } = useProxies();
  const { sources, activeSourceId, activeSource, setActiveSourceId, applySources } = useSources();
  const dialogs = useProxyDialogs();

  const reload = useCallback(async (): Promise<void> => {
    try {
      const [nextSources, nextProxies] = await Promise.all([sourcesApi.list(), proxiesApi.list()]);
      applySources(nextSources);
      setProxies(nextProxies);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [applySources, setProxies]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const sourceProxies = useMemo(
    () => proxies.filter((p) => p.sourceId === activeSourceId),
    [proxies, activeSourceId],
  );
  const sourcesView = useMemo(() => withProxyCounts(sources, proxies), [sources, proxies]);
  const sourceStats = useMemo(() => computeSourceStats(sources, proxies), [sources, proxies]);
  const existingKeys = useMemo(() => new Set(proxies.map((p) => `${p.host}:${p.port}`)), [proxies]);

  const filtering = useProxyFilters(sourceProxies);
  const selection = useProxySelection(proxies, filtering.visible);
  const testing = useProxyTesting({ setProxies, setError });
  const mutations = useProxyMutations({ setProxies, setError });
  const vpn = useVpnLifecycle({
    activeSource,
    reload,
    setError,
    openSource: dialogs.openSource,
    foxholeProfiles: foxholeProfileGateway,
  });

  const deleting = useMemo(
    () => proxies.filter((p) => dialogs.deleteIds.includes(p.id)),
    [proxies, dialogs.deleteIds],
  );
  const editSource = useMemo(
    () => sources.find((s) => s.id === dialogs.editSourceId) ?? null,
    [sources, dialogs.editSourceId],
  );
  const deleteSource = useMemo(
    () => sourcesView.find((s) => s.id === dialogs.deleteSourceId) ?? null,
    [sourcesView, dialogs.deleteSourceId],
  );

  const selectSource = (id: string): void => {
    setActiveSourceId(id);
    selection.reset();
  };

  const confirmDelete = async (): Promise<void> => {
    const ids = dialogs.deleteIds;
    if (await mutations.deleteProxies(ids)) selection.forget(ids);
    dialogs.clearDeleteIds();
  };

  const importProxies = (drafts: Parameters<typeof mutations.importProxies>[0]): Promise<void> =>
    mutations.importProxies(drafts, activeSourceId);

  const createWarp = async (input: WarpCreateInput): Promise<void> => {
    const { created, errors } = await warpApi.create(input);
    mutations.prependProxies(created);
    setError(errors.length > 0 ? errors[0] : null);
  };

  const removeSource = async (): Promise<void> => {
    const target = deleteSource;
    if (!target) return;
    try {
      if (target.vpn) await vpnApi.remove(target.id);
      else await sourcesApi.remove(target.id);
      selection.clearSelected();
      await reload();
    } catch (err) {
      setError(errorMessage(err));
    }
    dialogs.clearDeleteSourceId();
  };

  const onSourceSaved = (id: string): void => {
    void reload().then(() => setActiveSourceId(id));
  };

  return {
    error,
    dialogs,
    sources: { all: sources, view: sourcesView, stats: sourceStats, active: activeSource, activeId: activeSourceId, edit: editSource, deleting: deleteSource },
    proxies: { sourceProxies, existingKeys, deleting },
    filtering,
    selection,
    testing,
    vpn,
    actions: {
      selectSource,
      confirmDelete,
      createProxy: mutations.createProxy,
      importProxies,
      createWarp,
      removeSource,
      onSourceSaved,
    },
  };
}
