import { useMemo, useState } from 'react';
import { cn } from '@renderer/utils/cn';
import type { Proxy, ProxyStatus } from '../../../../shared/types/proxy-domain.types';
import { nextSort, sortProxies } from '../../utils/proxy-sort';
import type { SortKey, SortState } from '../../utils/proxy-sort';
import { ProxyRowMenu } from './ProxyRowMenu';
import type { RowMenuState } from './ProxyRowMenu';
import { ProxyTableEmpty } from './ProxyTableEmpty';
import { ProxyTableHeader } from './ProxyTableHeader';
import { ProxyTableRow } from './ProxyTableRow';

interface ProxyTableProps {
  proxies: Proxy[];
  selectedId: string | null;
  checkedIds: Set<string>;
  testingIds: Set<string>;
  onSelect: (id: string) => void;
  onToggleCheck: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  onTest: (proxy: Proxy) => void;
  onDelete: (proxy: Proxy) => void;
  filteredOut?: boolean;
  onClearFilters?: () => void;
  onAdd?: () => void;
}

export function ProxyTable({
  proxies,
  selectedId,
  checkedIds,
  testingIds,
  onSelect,
  onToggleCheck,
  onToggleAll,
  onTest,
  onDelete,
  filteredOut = false,
  onClearFilters,
  onAdd,
}: ProxyTableProps) {
  const [sort, setSort] = useState<SortState | null>(null);
  const [menu, setMenu] = useState<RowMenuState | null>(null);

  const allChecked = proxies.length > 0 && proxies.every((p) => checkedIds.has(p.id));

  const rows = useMemo(() => sortProxies(proxies, sort), [proxies, sort]);

  const menuProxy = menu ? (proxies.find((p) => p.id === menu.id) ?? null) : null;

  const toggleSort = (key: SortKey): void => setSort((prev) => nextSort(prev, key));

  return (
    <div className='relative min-h-0 flex-1 overflow-auto rounded-md bg-card-background'>
      <table className={cn('w-full border-collapse text-xs', rows.length === 0 && 'h-full')}>
        <ProxyTableHeader allChecked={allChecked} sort={sort} onToggleAll={onToggleAll} onSort={toggleSort} />
        <tbody>
          {rows.length === 0 && (
            <ProxyTableEmpty filteredOut={filteredOut} onClearFilters={onClearFilters} onAdd={onAdd} />
          )}
          {rows.map((p, rowIndex) => {
            const status: ProxyStatus = testingIds.has(p.id) ? 'testing' : p.status;
            return (
              <ProxyTableRow
                key={p.id}
                proxy={p}
                status={status}
                rowIndex={rowIndex}
                selected={selectedId === p.id}
                menuOpen={menu?.id === p.id}
                checked={checkedIds.has(p.id)}
                onSelect={onSelect}
                onToggleCheck={onToggleCheck}
                onOpenMenu={(id, position) => setMenu({ id, ...position })}
              />
            );
          })}
        </tbody>
      </table>

      <ProxyRowMenu menu={menu} proxy={menuProxy} onClose={() => setMenu(null)} onTest={onTest} onDelete={onDelete} />
    </div>
  );
}

export default ProxyTable;
