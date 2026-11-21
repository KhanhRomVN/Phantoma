import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Database, RefreshCw, Search } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { BAR, Badge, TEXT, TONE } from '../shared';
import type { Tone } from '../shared';
import TablesPanel from './TablesPanel';
import DataPanel from './DataPanel';
import type { SqlTableData } from './DataPanel';

interface SqlFile {
  id: string;
  group: string;
  name: string;
  path: string;
  exists: boolean;
}

interface FileData {
  error?: string;
  path?: string;
  size?: number;
  format?: 'sqlite' | 'dump';
  tables?: SqlTableData[];
}

const invoke = <T,>(channel: string, ...args: unknown[]): Promise<T> =>
  window.api.invoke(channel, ...args);

const GROUP_TONE: Record<string, Tone> = {
  code: 'info',
  profile: 'pink',
  proxy: 'warn',
  phantoma: 'primary',
  'profile/backup': 'teal',
};

const SEARCH_CLASS =
  'h-8 w-full rounded-md border-0 bg-card-background pl-8 pr-2 text-[12.5px] text-text-primary outline-none focus:outline-none focus:ring-0 placeholder:text-text-secondary';

const SqlViewer: React.FC = () => {
  const [files, setFiles] = useState<SqlFile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [data, setData] = useState<FileData | null>(null);
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  const loadFiles = useCallback(async () => {
    const list = await invoke<SqlFile[]>('sqlview:list').catch(() => []);
    setFiles(Array.isArray(list) ? list : []);
  }, []);

  const loadFile = useCallback(async (id: string, keepTable?: string | null) => {
    setLoading(true);
    try {
      const res = await invoke<FileData>('sqlview:read', id);
      setData(res);
      const names = res.tables?.map((t) => t.name) ?? [];
      setActiveTable(keepTable && names.includes(keepTable) ? keepTable : (names[0] ?? null));
    } catch (e) {
      setData({ error: e instanceof Error ? e.message : String(e) });
      setActiveTable(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  const select = (f: SqlFile) => {
    if (!f.exists) return;
    setActiveId(f.id);
    void loadFile(f.id);
  };

  const refresh = () => {
    void loadFiles();
    if (activeId) void loadFile(activeId, activeTable);
  };

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return files
      .filter((f) => !q || f.name.toLowerCase().includes(q) || f.group.toLowerCase().includes(q))
      .reduce<Record<string, SqlFile[]>>((acc, f) => {
        (acc[f.group] ||= []).push(f);
        return acc;
      }, {});
  }, [files, query]);

  const table = data?.tables?.find((t) => t.name === activeTable) ?? null;
  const active = files.find((f) => f.id === activeId);

  return (
    <div className="flex h-full min-h-0 w-full">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-panel-background">
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3">
          <span className="text-[13px] font-semibold text-text-primary">SQL Viewer</span>
          <button
            type="button"
            onClick={refresh}
            title="Refresh"
            className="flex h-7 w-7 items-center justify-center rounded-md bg-card-background text-text-secondary outline-none transition-colors hover:text-text-primary"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </button>
        </div>

        <div className="shrink-0 p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search databases"
              className={SEARCH_CLASS}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {Object.entries(groups).map(([group, list]) => {
            const tone = GROUP_TONE[group] ?? 'muted';
            return (
              <div key={group} className="mb-3">
                <div className="mb-1 flex items-center gap-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                  <span className={cn('h-1.5 w-1.5 rounded-full', BAR[tone])} />
                  {group}
                  <span className="ml-auto font-normal opacity-60">{list.length}</span>
                </div>
                {list.map((f) => {
                  const isActive = activeId === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => select(f)}
                      disabled={!f.exists}
                      title={f.path}
                      className={cn(
                        'mb-0.5 flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left outline-none transition-colors',
                        isActive
                          ? TONE[tone]
                          : 'text-text-secondary hover:bg-card-hover hover:text-text-primary',
                        !f.exists && 'cursor-not-allowed opacity-40 hover:bg-transparent',
                      )}
                    >
                      <Database className={cn('h-3.5 w-3.5 shrink-0', TEXT[tone])} />
                      <span className="min-w-0 flex-1 truncate font-mono text-[12px]">
                        {f.name}
                      </span>
                      {!f.exists && (
                        <Badge tone="muted" className="shrink-0 px-1 py-0 text-[9px]">
                          missing
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
          {files.length > 0 && Object.keys(groups).length === 0 && (
            <p className="m-0 px-2 py-6 text-center text-[11.5px] text-text-secondary">
              No databases match.
            </p>
          )}
        </div>
      </aside>

      <TablesPanel
        tables={data?.tables ?? []}
        active={activeTable}
        onSelect={setActiveTable}
        hasFile={!!activeId}
      />

      <DataPanel
        table={table}
        fileName={active?.id ?? ''}
        loading={loading}
        error={data?.error}
        hasFile={!!activeId}
      />
    </div>
  );
};

export default SqlViewer;
