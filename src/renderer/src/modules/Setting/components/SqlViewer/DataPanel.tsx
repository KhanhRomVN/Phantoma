import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Braces,
  Check,
  Copy,
  Download,
  Filter,
  Loader2,
  Rows3,
  Table2,
  X,
} from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Badge } from '../shared';
import { exportToCsv, exportToJson } from '../../utils/export';

export interface SqlTableData {
  name: string;
  columns: string[];
  rows: unknown[][];
  total: number;
}

interface DataPanelProps {
  table: SqlTableData | null;
  fileName: string;
  loading: boolean;
  error?: string;
  hasFile: boolean;
}

type Density = 'compact' | 'comfortable';

const display = (v: unknown): string => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

const cellClass = (v: unknown): string => {
  if (v === null || v === undefined) return 'italic text-text-secondary/50';
  if (typeof v === 'number') return 'text-info';
  if (typeof v === 'boolean') return 'text-purple';
  if (typeof v === 'object') return 'text-teal';
  const s = String(v);
  if (/^<blob /.test(s)) return 'text-pink';
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return 'text-warn';
  if (/^https?:\/\//.test(s)) return 'text-blue';
  if (/^[{[]/.test(s)) return 'text-teal';
  return 'text-text-primary';
};

const compare = (a: unknown, b: unknown): number => {
  const an = a === null || a === undefined;
  const bn = b === null || b === undefined;
  if (an || bn) return an === bn ? 0 : an ? 1 : -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return display(a).localeCompare(display(b), undefined, { numeric: true });
};

const DataPanel: React.FC<DataPanelProps> = ({ table, fileName, loading, error, hasFile }) => {
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<{ col: number; dir: 'asc' | 'desc' } | null>(null);
  const density = 'comfortable' as Density;
  const [selected, setSelected] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const tableKey = `${fileName}:${table?.name ?? ''}`;
  const lastKey = React.useRef(tableKey);
  if (lastKey.current !== tableKey) {
    lastKey.current = tableKey;
    setFilter('');
    setSort(null);
    setSelected(null);
  }

  const rows = useMemo(() => {
    if (!table) return [];
    const q = filter.trim().toLowerCase();
    let list = table.rows.map((r, i) => ({ r, i }));
    if (q) list = list.filter(({ r }) => r.some((v) => display(v).toLowerCase().includes(q)));
    if (sort) {
      const k = sort.dir === 'asc' ? 1 : -1;
      list = [...list].sort((a, b) => compare(a.r[sort.col], b.r[sort.col]) * k);
    }
    return list;
  }, [table, filter, sort]);

  const copy = (text: string, key: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1000);
    });
  };

  const toRecords = () =>
    rows.map(({ r }) => Object.fromEntries((table?.columns ?? []).map((c, j) => [c, r[j]])));

  const exportCsv = () => {
    if (!table) return;
    exportToCsv({ columns: table.columns, columnTypes: {}, rows: [] }, toRecords(), table.name);
  };
  const exportJson = () => {
    if (!table) return;
    exportToJson(toRecords(), table.name);
  };

  const toggleSort = (col: number) =>
    setSort((prev) =>
      !prev || prev.col !== col ? { col, dir: 'asc' } : prev.dir === 'asc' ? { col, dir: 'desc' } : null,
    );

  if (!hasFile || loading || error || !table) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center gap-2 text-center">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-info" />
        ) : error ? (
          <>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-error/10 text-error">
              <X className="h-5 w-5" />
            </span>
            <p className="m-0 max-w-sm text-[12.5px] text-error">{error}</p>
          </>
        ) : (
          <>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Table2 className="h-6 w-6" />
            </span>
            <p className="m-0 text-[13px] font-medium text-text-primary">
              {hasFile ? 'Select a table' : 'Select a database'}
            </p>
            <p className="m-0 text-[11.5px] text-text-secondary">
              {hasFile ? 'Pick a table from the middle panel.' : 'Pick a file from the left panel.'}
            </p>
          </>
        )}
      </div>
    );
  }

  const selectedRow = selected !== null ? table.rows[selected] : null;
  const pad = density === 'compact' ? 'py-1' : 'py-2.5';

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
        <Table2 className="h-4 w-4 text-primary" />
        <span className="text-[13px] font-semibold text-text-primary">{table.name}</span>
        {filter && <Badge tone="warn">{rows.length} matched</Badge>}
        <span className="flex-1" />
        <div className="relative">
          <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter rows..."
            className="h-8 w-72 rounded-md border-0 bg-card-background pl-8 pr-2 text-[12.5px] text-text-primary outline-none focus:outline-none focus:ring-0 placeholder:text-text-secondary"
          />
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={rows.length === 0}
          className="inline-flex h-7 items-center gap-1.5 rounded-md bg-success/10 px-2.5 text-[12px] font-medium text-success outline-none transition-colors hover:brightness-125 disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" /> CSV
        </button>
        <button
          type="button"
          onClick={exportJson}
          disabled={rows.length === 0}
          className="inline-flex h-7 items-center gap-1.5 rounded-md bg-purple/10 px-2.5 text-[12px] font-medium text-purple outline-none transition-colors hover:brightness-125 disabled:opacity-50"
        >
          <Braces className="h-3.5 w-3.5" /> JSON
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col overflow-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead className="sticky top-0 z-10 bg-table-header-background">
              <tr>
                <th className="w-10 border-b border-border px-2 py-2 text-right text-[10.5px] font-medium text-text-secondary">
                  #
                </th>
                {table.columns.map((c, j) => {
                  const active = sort?.col === j;
                  return (
                    <th
                      key={c}
                      onClick={() => toggleSort(j)}
                      className={cn(
                        'cursor-pointer select-none whitespace-nowrap border-b border-border px-3 py-2 text-left font-medium transition-colors hover:text-primary',
                        active ? 'text-primary' : 'text-text-primary',
                      )}
                    >
                      <span className="inline-flex items-center gap-1">
                        {c}
                        {active &&
                          (sort?.dir === 'asc' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          ))}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ r, i }) => (
                <tr
                  key={i}
                  onClick={() => setSelected(selected === i ? null : i)}
                  className={cn(
                    'cursor-pointer transition-colors',
                    selected === i ? 'bg-primary/10' : 'hover:bg-table-row-hover',
                  )}
                >
                  <td className={cn('border-b border-border/40 px-2 text-right font-mono text-[10.5px] text-text-secondary/60', pad)}>
                    {i + 1}
                  </td>
                  {r.map((v, j) => (
                    <td
                      key={j}
                      title={display(v)}
                      className={cn(
                        'max-w-[320px] truncate border-b border-border/40 px-3 font-mono',
                        pad,
                        cellClass(v),
                      )}
                    >
                      {display(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-1.5 p-6 text-center">
              <Rows3 className="h-6 w-6 text-text-secondary/60" />
              <p className="m-0 text-[12.5px] font-medium text-text-primary">
                {filter ? 'No rows match' : 'Table is empty'}
              </p>
              <p className="m-0 text-[11.5px] text-text-secondary">
                {filter ? 'Try a different filter.' : 'This table has no rows yet.'}
              </p>
            </div>
          )}
        </div>

        {selectedRow && (
          <aside className="flex w-72 shrink-0 flex-col border-l border-border bg-panel-background">
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <span className="text-[12.5px] font-semibold text-text-primary">Row {(selected ?? 0) + 1}</span>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-text-secondary hover:text-text-primary"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {table.columns.map((c, j) => {
                const key = `${selected}-${c}`;
                return (
                  <div key={c} className="mb-3">
                    <div className="mb-1 flex items-center justify-between text-[10.5px] font-medium uppercase tracking-wider text-text-secondary">
                      {c}
                      <button
                        type="button"
                        onClick={() => copy(display(selectedRow[j]), key)}
                        className="text-text-secondary hover:text-primary"
                      >
                        {copied === key ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                    <div
                      className={cn(
                        'max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-md bg-background px-2 py-1.5 font-mono text-[11.5px]',
                        cellClass(selectedRow[j]),
                      )}
                    >
                      {display(selectedRow[j])}
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        )}
      </div>

      {table.total > table.rows.length && (
        <div className="shrink-0 border-t border-border bg-table-footer-background px-4 py-1.5 text-[11px] text-text-secondary">
          Showing first {table.rows.length} of {table.total} rows.
        </div>
      )}
    </div>
  );
};

export default DataPanel;