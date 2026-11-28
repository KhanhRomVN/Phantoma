import { ProxyEmpty } from '../features/proxy';
import { ProxyDrawer } from '../features/proxy-activity';
import { VpnStatusAction } from '../features/vpn';
import { ProxyDialogs } from './components/ProxyDialogs';
import { ProxyWorkspace } from './components/ProxyWorkspace';
import { useProxyPage } from './hooks/useProxyPage';

export function ProxyPage() {
  const page = useProxyPage();
  const { error, dialogs, sources, proxies, filtering, selection, testing, vpn, actions } = page;
  const activeSource = sources.active;
  const isVpnSource = activeSource?.type === 'vpn';

  const sourceActions =
    error || isVpnSource ? (
      <>
        {error && <span className="max-w-[360px] truncate text-xs text-error">{error}</span>}
        {activeSource && isVpnSource && (
          <VpnStatusAction
            busy={vpn.vpnBusy}
            activated={Boolean(activeSource.vpn?.activated)}
            online={activeSource.online}
            onToggle={() => void vpn.toggleVpn()}
          />
        )}
      </>
    ) : undefined;

  const selected = selection.selected;

  return (
    <div className="flex h-full min-h-0 w-full">
      <ProxyWorkspace
        sources={sources.view}
        activeSourceId={sources.activeId}
        sourceStats={sources.stats}
        sourceActions={sourceActions}
        onAddSource={() => dialogs.openSource(null)}
        onEditSource={dialogs.openSource}
        onDeleteSource={dialogs.askDeleteSource}
        onSelectSource={actions.selectSource}
        sourceProxies={proxies.sourceProxies}
        visible={filtering.visible}
        filters={filtering.filters}
        filtersDirty={filtering.filtersDirty}
        onFiltersChange={filtering.setFilters}
        onClearFilters={filtering.clearFilters}
        selectedId={selection.selectedId}
        checkedIds={selection.checkedIds}
        checkedList={selection.checkedList}
        testingIds={testing.testingIds}
        onSelect={selection.select}
        onToggleCheck={selection.toggleCheck}
        onToggleAll={selection.toggleAll}
        onClearChecked={selection.clearChecked}
        onTest={(list) => void testing.testProxies(list)}
        onDelete={dialogs.askDelete}
        onAdd={dialogs.openCreate}
        onImport={dialogs.openImport}
      />

      <aside className="h-full w-[570px] shrink-0 border-l border-border bg-background">
        {selected ? (
          <ProxyDrawer
            key={selected.id}
            proxy={selected}
            testing={testing.testingIds.has(selected.id)}
            onClose={selection.clearSelected}
            onTest={(p) => void testing.testProxies([p])}
            onDelete={(p) => dialogs.askDelete([p.id])}
          />
        ) : (
          <ProxyEmpty onAdd={dialogs.openCreate} onImport={dialogs.openImport} />
        )}
      </aside>

      <ProxyDialogs page={page} />
    </div>
  );
}

export default ProxyPage;
