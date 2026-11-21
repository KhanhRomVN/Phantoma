import React, { useMemo, useState } from 'react';
import { Search, Table2 } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { TEXT, TONE } from '../shared';
import type { Tone } from '../shared';
import type { SqlTableData } from './DataPanel';

interface TablesPanelProps {
  tables: SqlTableData[];
  active: string | null;
  onSelect: (name: string) => void;
  hasFile: boolean;
}

const ROW_TONES: Tone[] = ['blue', 'purple', 'pink', 'teal', 'warn', 'success', 'violet', 'info'];

const SEARCH_CLASS =
  'h-8 w-full rounded-md border-0 bg-card-background pl-8 pr-2 text-[12.5px] text-text-primary outline-none focus:outline-none focus:ring-0 placeholder:text-text-secondary disabled:opacity-50';

const TablesPanel: React.FC<TablesPanelProps> = ({ tables, active, onSelect, hasFile }) => {
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tables.filter((t) => !q || t.name.toLowerCase().includes(q));
  }, [tables, query]);

  const emptyTitle = !hasFile ? 'No database selected' : tables.length === 0 ? 'No tables' : 'No matches';
  const emptyHint = !hasFile
    ? 'Pick a file from the left panel.'
    : tables.length === 0
      ? 'This database has no tables yet.'
      : 'Try a different search term.';

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-panel-background">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3">
        <span className="text-[13px] font-semibold text-text-primary">Tables</span>
        <span className="rounded-md bg-card-background px-1.5 py-0.5 text-[11px] font-medium text-text-secondary">
          {tables.length}
        </span>
      </div>

      <div className="shrink-0 p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tables"
            disabled={!hasFile}
            className={SEARCH_CLASS}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-2">
        {visible.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-1.5 px-4 text-center">
            <Table2 className="h-6 w-6 text-text-secondary/60" />
            <p className="m-0 text-[12.5px] font-medium text-text-primary">{emptyTitle}</p>
            <p className="m-0 text-[11.5px] text-text-secondary">{emptyHint}</p>
          </div>
        ) : (
          visible.map((t, i) => {
            const tone = ROW_TONES[i % ROW_TONES.length];
            const isActive = active === t.name;
            return (
              <button
                key={t.name}
                type="button"
                onClick={() => onSelect(t.name)}
                title={`${t.name} · ${t.columns.length} columns · ${t.total} rows`}
                className={cn(
                  'mb-0.5 flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left outline-none transition-colors',
                  isActive ? TONE[tone] : 'hover:bg-card-hover',
                )}
              >
                <Table2 className={cn('h-3.5 w-3.5 shrink-0', TEXT[tone])} />
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate text-[12.5px] font-medium',
                    isActive ? '' : 'text-text-primary',
                  )}
                >
                  {t.name}
                </span>
                <span className="shrink-0 font-mono text-[10.5px] opacity-70">{t.total}</span>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};

export default TablesPanel;