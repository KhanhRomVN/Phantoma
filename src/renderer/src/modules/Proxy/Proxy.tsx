import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, Power, Trash2, X } from 'lucide-react';
import type { Proxy as ProxyRecord, ProxyDraft, ProxyFilters } from './types';
import { DEFAULT_PROXY_FILTERS } from './types';
import type { ProxySource, SourceStats } from './types';
import { proxyApi } from './services/proxy-api.service';
import { profileApi } from '../Profile/services/profile-api.service';
import { daysLeft } from './utils/format';
import { SourceBar } from './components/SourceBar';
import { StatSection } from './components/StatSection';
import { ProxyToolPanel } from './components/ProxyToolPanel';
import { ProxyTable } from './components/ProxyTable';
import { ProxyDrawer } from './components/ProxyDrawer/ProxyDrawer';
import { ProxyEmpty } from './components/ProxyDrawer/ProxyEmpty';
import { CreateProxyModal } from './components/modal/CreateProxyModal';
import { ImportProxyModal } from './components/modal/ImportProxyModal';
import { ConfirmDeleteProxyModal } from './components/modal/ConfirmDeleteProxyModal';
import { SourceModal } from './components/modal/SourceModal';
import { ConfirmDeleteSourceModal } from './components/modal/ConfirmDeleteSourceModal';

type DialogKind = 'create' | 'import' | 'delete' | 'source' | 'deleteSource';

function matches(p: ProxyRecord, f: ProxyFilters): boolean {
  if (f.status !== 'all' && p.status !== f.status) return false;
  if (f.protocol !== 'all' && p.protocol !== f.protocol) return false;
  if (f.kind !== 'all' && p.kind !== f.kind) return false;
  if (f.country !== 'all' && p.country !== f.country) return false;
  const q = f.search.trim().toLowerCase();
  if (!q) return true;
  return [p.name, p.host, p.exitIp, p.isp, p.provider, p.city, ...p.tags].some((v) =>
    v.toLowerCase().includes(q),
  );
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function Proxy() {
  const [proxies, setProxies] = useState<ProxyRecord[]>([]);
  const [sources, setSources] = useState<ProxySource[]>([]);
  const [activeSourceId, setActiveSourceId] = useState<string>('');
  const [filters, setFilters] = useState<ProxyFilters>(DEFAULT_PROXY_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [testingIds, setTestingIds] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [vpnBusy, setVpnBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (): Promise<void> => {
    try {
      const [nextSources, nextProxies] = await Promise.all([
        proxyApi.sources.list(),
        proxyApi.proxies.list(),
      ]);
      setSources(nextSources);
      setProxies(nextProxies);
      setActiveSourceId((prev) =>
        nextSources.some((s) => s.id === prev) ? prev : (nextSources[0]?.id ?? ''),
      );
      setError(null);
    } catch (err) {
      setError(message(err));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(
    () =>
      proxyApi.proxies.subscribe((next) =>
        setProxies((prev) =>
          prev.some((p) => p.id === next.id)
            ? prev.map((p) => (p.id === next.id ? next : p))
            : prev,
        ),
      ),
    [],
  );

  const activeSource = useMemo(
    () => sources.find((s) => s.id === activeSourceId) ?? null,
    [sources, activeSourceId],
  );
  const sourceProxies = useMemo(
    () => proxies.filter((p) => p.sourceId === activeSourceId),
    [proxies, activeSourceId],
  );
  const sourcesView = useMemo(
    () => sources.map((s) => ({ ...s, count: proxies.filter((p) => p.sourceId === s.id).length })),
    [sources, proxies],
  );
  const sourceStats = useMemo(() => {
    const result: Record<string, SourceStats> = {};
    for (const s of sources) {
      const list = proxies.filter((p) => p.sourceId === s.id);
      const lat = list.map((p) => p.latencyMs).filter((v): v is number => v !== null);
      const metered = list.filter((p) => p.quotaTotalGb);
      result[s.id] = {
        healthy: list.filter((p) => p.status === 'healthy').length,
        dead: list.filter((p) => p.status === 'dead').length,
        avgLatency: lat.length ? Math.round(lat.reduce((a, b) => a + b, 0) / lat.length) : 0,
        quotaUsedGb: metered.reduce((a, p) => a + p.quotaUsedGb, 0),
        quotaTotalGb: metered.reduce((a, p) => a + (p.quotaTotalGb ?? 0), 0),
        expiring: list.filter((p) => {
          const d = daysLeft(p.expiresAt);
          return d !== null && d >= 0 && d <= 7;
        }).length,
      };
    }
    return result;
  }, [sources, proxies]);
  const visible = useMemo(
    () => sourceProxies.filter((p) => matches(p, filters)),
    [sourceProxies, filters],
  );
  const selected = useMemo(
    () => proxies.find((p) => p.id === selectedId) ?? null,
    [proxies, selectedId],
  );
  const existingKeys = useMemo(() => new Set(proxies.map((p) => `${p.host}:${p.port}`)), [proxies]);
  const deleting = useMemo(
    () => proxies.filter((p) => deleteIds.includes(p.id)),
    [proxies, deleteIds],
  );
  const filtersDirty = (Object.keys(DEFAULT_PROXY_FILTERS) as (keyof ProxyFilters)[]).some(
    (k) => filters[k] !== DEFAULT_PROXY_FILTERS[k],
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
    (checked: boolean) => setCheckedIds(checked ? new Set(visible.map((p) => p.id)) : new Set()),
    [visible],
  );

  const testProxies = useCallback(async (targets: ProxyRecord[]): Promise<void> => {
    const ids = targets.map((p) => p.id);
    if (ids.length === 0) return;
    setTestingIds((prev) => new Set([...prev, ...ids]));
    try {
      const results = await proxyApi.proxies.test(ids);
      const byId = new Map(results.map((r) => [r.id, r]));
      setProxies((prev) => prev.map((p) => byId.get(p.id) ?? p));
      setError(null);
    } catch (err) {
      setError(message(err));
    } finally {
      setTestingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }
  }, []);

  const askDelete = (ids: string[]): void => {
    setDeleteIds(ids);
    setDialog('delete');
  };

  const confirmDelete = async (): Promise<void> => {
    const gone = new Set(deleteIds);
    try {
      await proxyApi.proxies.removeMany(deleteIds);
      setProxies((prev) => prev.filter((p) => !gone.has(p.id)));
      setCheckedIds((prev) => new Set([...prev].filter((id) => !gone.has(id))));
      setSelectedId((prev) => (prev && gone.has(prev) ? null : prev));
      setError(null);
    } catch (err) {
      setError(message(err));
    }
    setDeleteIds([]);
  };

  const createProxy = async (draft: ProxyDraft, sourceId: string): Promise<void> => {
    try {
      const created = await proxyApi.proxies.create({ ...draft, sourceId });
      setProxies((prev) => [created, ...prev]);
      setError(null);
    } catch (err) {
      setError(message(err));
    }
  };

  const createWarp = async (input: { license: string; count: number }): Promise<void> => {
    const { created, errors } = await proxyApi.warp.create(input);
    setProxies((prev) => [...created, ...prev]);
    setError(errors.length > 0 ? errors[0] : null);
  };

  const importProxies = async (drafts: ProxyDraft[]): Promise<void> => {
    try {
      const { created, skipped } = await proxyApi.proxies.createMany(activeSourceId, drafts);
      setProxies((prev) => [...created, ...prev]);
      setError(
        skipped.length > 0 ? `${skipped.length} proxies skipped: ${skipped[0].reason}` : null,
      );
    } catch (err) {
      setError(message(err));
    }
  };

  const [editSourceId, setEditSourceId] = useState<string | null>(null);
  const editSource = useMemo(
    () => sources.find((s) => s.id === editSourceId) ?? null,
    [sources, editSourceId],
  );

  const openSource = (id: string | null): void => {
    setEditSourceId(id);
    setDialog('source');
  };

  const [deleteSourceId, setDeleteSourceId] = useState<string | null>(null);
  const deleteSource = useMemo(
    () => sourcesView.find((s) => s.id === deleteSourceId) ?? null,
    [sourcesView, deleteSourceId],
  );

  const askDeleteSource = (id: string): void => {
    setDeleteSourceId(id);
    setDialog('deleteSource');
  };

  const removeSource = async (): Promise<void> => {
    const target = deleteSource;
    if (!target) return;
    try {
      if (target.vpn) await proxyApi.vpn.remove(target.id);
      else await proxyApi.sources.remove(target.id);
      setSelectedId(null);
      await reload();
    } catch (err) {
      setError(message(err));
    }
    setDeleteSourceId(null);
  };

  const toggleVpn = async (): Promise<void> => {
    const account = activeSource?.vpn;
    if (!account) return;
    if (!account.activated) {
      openSource(account.id);
      return;
    }
    setVpnBusy(true);
    try {
      if (account.running) await proxyApi.vpn.stop(account.id);
      else await proxyApi.vpn.start(account.id);
      await reload();
      setError(null);
    } catch (err) {
      setError(message(err));
    } finally {
      setVpnBusy(false);
    }
  };

  const activateFoxhole = async (): Promise<void> => {
    const account = activeSource?.vpn;
    if (!account) return;
    await proxyApi.vpn.activate(account.id);
    await reload();
    setError(null);
  };

  const createFoxhole = async (input: { country: string; profileId: string }): Promise<void> => {
    const source = activeSource?.vpn;
    if (!source) return;
    const folder = input.profileId ? await profileApi.browser.folder(input.profileId) : null;
    if (source.running) await proxyApi.vpn.stop(source.id);
    await proxyApi.vpn.activate(source.id, {
      ...(folder
        ? {
            userDataDir: folder.launch.userDataDir,
            profileDirectory: folder.launch.profileDirectory ?? undefined,
          }
        : {}),
      profileId: input.profileId || undefined,
    });
    await proxyApi.vpn.start(source.id, { country: input.country });
    await reload();
    setError(null);
  };

  const createProton = async (input: {
    email: string;
    privateKey: string;
    peerPublicKey: string;
    endpoint: string;
  }): Promise<void> => {
    const source = activeSource?.vpn;
    if (!source) return;
    if (source.running) await proxyApi.vpn.stop(source.id);
    if (source.accounts.length > 0)
      await proxyApi.vpn.update(source.id, { name: input.email, credentials: input });
    else await proxyApi.vpn.create({ provider: 'proton', name: input.email, credentials: input });
    await proxyApi.vpn.activate(source.id);
    await proxyApi.vpn.start(source.id);
    await reload();
    setError(null);
  };

  const checkedList = proxies.filter((p) => checkedIds.has(p.id));
  const actions =
    error || activeSource?.type === 'vpn' ? (
      <>
        {error && <span className="max-w-[360px] truncate text-xs text-error">{error}</span>}
        {activeSource?.type === 'vpn' && (
          <button
            type="button"
            disabled={vpnBusy}
            onClick={() => void toggleVpn()}
            className="flex h-7 items-center gap-1.5 rounded-md bg-primary/10 px-2.5 text-xs font-medium text-primary hover:bg-primary/20 active:bg-primary/30 disabled:opacity-50"
          >
            <Power className="h-3.5 w-3.5" />
            {vpnBusy
              ? 'Working…'
              : !activeSource.vpn?.activated
                ? 'Activate'
                : activeSource.online
                  ? 'Stop'
                  : 'Start'}
          </button>
        )}
      </>
    ) : undefined;

  return (
    <div className="flex h-full min-h-0 w-full">
      <div className="relative flex min-w-0 flex-1 flex-col gap-3 p-4">
        <SourceBar
          sources={sourcesView}
          activeId={activeSourceId}
          stats={sourceStats}
          actions={actions}
          onAddSource={() => openSource(null)}
          onEditSource={(id) => openSource(id)}
          onDeleteSource={askDeleteSource}
          onChange={(id) => {
            setActiveSourceId(id);
            setCheckedIds(new Set());
            setSelectedId(null);
          }}
        />
        <StatSection proxies={sourceProxies} />
        <ProxyToolPanel
          filters={filters}
          onChange={setFilters}
          proxies={sourceProxies}
          testingAll={visible.some((p) => testingIds.has(p.id)) && testingIds.size > 1}
          onTestAll={() => void testProxies(visible)}
          onImport={() => setDialog('import')}
          onAdd={() => setDialog('create')}
        />
        <ProxyTable
          proxies={visible}
          selectedId={selectedId}
          checkedIds={checkedIds}
          testingIds={testingIds}
          onSelect={setSelectedId}
          onToggleCheck={toggleCheck}
          onToggleAll={toggleAll}
          onTest={(p) => void testProxies([p])}
          onDelete={(p) => askDelete([p.id])}
          filteredOut={filtersDirty}
          onClearFilters={() => setFilters(DEFAULT_PROXY_FILTERS)}
          onAdd={() => setDialog('create')}
        />

        <AnimatePresence>
          {checkedList.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.18 }}
              className="absolute bottom-7 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-dashed border-primary bg-background px-3 py-2 shadow-lg"
            >
              <span className="pr-1 text-xs font-medium text-text-primary">
                {checkedList.length} selected
              </span>
              <button
                type="button"
                onClick={() => void testProxies(checkedList)}
                className="flex h-7 items-center gap-1.5 rounded-md bg-primary/10 px-2.5 text-xs font-medium text-primary hover:bg-primary/20 active:bg-primary/30"
              >
                <Activity className="h-3.5 w-3.5" />
                Test
              </button>
              <button
                type="button"
                onClick={() => askDelete(checkedList.map((p) => p.id))}
                className="flex h-7 items-center gap-1.5 rounded-md bg-error/15 px-2.5 text-xs font-medium text-error hover:bg-error/20 active:bg-error/25"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
              <button
                type="button"
                onClick={() => setCheckedIds(new Set())}
                className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary hover:bg-text-secondary/15 hover:text-text-primary"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <aside className="h-full w-[570px] shrink-0 border-l border-border bg-background">
        {selected ? (
          <ProxyDrawer
            key={selected.id}
            proxy={selected}
            testing={testingIds.has(selected.id)}
            onClose={() => setSelectedId(null)}
            onTest={(p) => void testProxies([p])}
            onDelete={(p) => askDelete([p.id])}
          />
        ) : (
          <ProxyEmpty onAdd={() => setDialog('create')} onImport={() => setDialog('import')} />
        )}
      </aside>

      <CreateProxyModal
        isOpen={dialog === 'create'}
        onClose={() => setDialog(null)}
        onCreate={(d, sourceId) => void createProxy(d, sourceId)}
        sources={sourcesView}
        activeSourceId={activeSourceId}
        warp={activeSource?.type === 'vendor' && activeSource.provider === 'warp'}
        onCreateWarp={createWarp}
        foxhole={
          activeSource?.vpn?.provider === 'foxhole'
            ? {
                activated: activeSource.vpn.activated,
                running: activeSource.vpn.running,
                country: activeSource.vpn.config.country ?? '',
              }
            : null
        }
        onCreateFoxhole={createFoxhole}
        onActivateFoxhole={activateFoxhole}
        proton={activeSource?.vpn?.provider === 'proton'}
        onCreateProton={createProton}
      />
      <ImportProxyModal
        isOpen={dialog === 'import'}
        onClose={() => setDialog(null)}
        existingKeys={existingKeys}
        onImport={(drafts) => void importProxies(drafts)}
      />
      <ConfirmDeleteProxyModal
        isOpen={dialog === 'delete'}
        onClose={() => setDialog(null)}
        onConfirm={() => void confirmDelete()}
        proxies={deleting}
      />
      <SourceModal
        isOpen={dialog === 'source'}
        onClose={() => setDialog(null)}
        existingNames={sources
          .filter((s) => s.type === 'vendor' && s.id !== editSourceId)
          .map((s) => s.name)}
        source={editSource}
        onSaved={(id) => {
          void reload().then(() => setActiveSourceId(id));
        }}
      />
      <ConfirmDeleteSourceModal
        isOpen={dialog === 'deleteSource'}
        onClose={() => setDialog(null)}
        onConfirm={() => void removeSource()}
        source={deleteSource}
      />
    </div>
  );
}

export default Proxy;
