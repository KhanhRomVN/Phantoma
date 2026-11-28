import type { ReactNode } from 'react';
import type { Proxy } from '../../shared/types/proxy-domain.types';
import type { ProxySource } from '../../shared/types/source-domain.types';
import { ProxyStats, ProxyTable, ProxyToolbar } from '../../features/proxy';
import type { ProxyFilters } from '../../features/proxy';
import { SourceBar } from '../../features/sources';
import type { SourceStats } from '../../features/sources';
import { ProxyBulkActions } from './ProxyBulkActions';

interface ProxyWorkspaceProps {
  sources: ProxySource[];
  activeSourceId: string;
  sourceStats: Record<string, SourceStats>;
  sourceActions: ReactNode;
  onAddSource: () => void;
  onEditSource: (id: string) => void;
  onDeleteSource: (id: string) => void;
  onSelectSource: (id: string) => void;

  /** Proxies of the active source (before filtering). */
  sourceProxies: Proxy[];
  /** Proxies of the active source after filtering; these are the table rows. */
  visible: Proxy[];
  filters: ProxyFilters;
  filtersDirty: boolean;
  onFiltersChange: (next: ProxyFilters) => void;
  onClearFilters: () => void;

  selectedId: string | null;
  checkedIds: Set<string>;
  checkedList: Proxy[];
  testingIds: Set<string>;
  onSelect: (id: string) => void;
  onToggleCheck: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  onClearChecked: () => void;

  onTest: (proxies: Proxy[]) => void;
  onDelete: (ids: string[]) => void;
  onAdd: () => void;
  onImport: () => void;
}

/** Left column of the page: source tabs, stats, toolbar, table and the bulk action bar. */
export function ProxyWorkspace(props: ProxyWorkspaceProps) {
  const { visible, testingIds, checkedList } = props;
  return (
    <div className="relative flex min-w-0 flex-1 flex-col gap-3 p-4">
      <SourceBar
        sources={props.sources}
        activeId={props.activeSourceId}
        stats={props.sourceStats}
        actions={props.sourceActions}
        onAddSource={props.onAddSource}
        onEditSource={props.onEditSource}
        onDeleteSource={props.onDeleteSource}
        onChange={props.onSelectSource}
      />
      <ProxyStats proxies={props.sourceProxies} />
      <ProxyToolbar
        filters={props.filters}
        onChange={props.onFiltersChange}
        proxies={props.sourceProxies}
        testingAll={visible.some((p) => testingIds.has(p.id)) && testingIds.size > 1}
        onTestAll={() => props.onTest(visible)}
        onImport={props.onImport}
        onAdd={props.onAdd}
      />
      <ProxyTable
        proxies={visible}
        selectedId={props.selectedId}
        checkedIds={props.checkedIds}
        testingIds={testingIds}
        onSelect={props.onSelect}
        onToggleCheck={props.onToggleCheck}
        onToggleAll={props.onToggleAll}
        onTest={(p) => props.onTest([p])}
        onDelete={(p) => props.onDelete([p.id])}
        filteredOut={props.filtersDirty}
        onClearFilters={props.onClearFilters}
        onAdd={props.onAdd}
      />
      <ProxyBulkActions
        checked={checkedList}
        onTest={() => props.onTest(checkedList)}
        onDelete={() => props.onDelete(checkedList.map((p) => p.id))}
        onClear={props.onClearChecked}
      />
    </div>
  );
}
