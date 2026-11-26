import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Database, FileSearch, Loader2 } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { getFileIconPath } from '@renderer/utils/file-icon';
import { Badge } from '../shared';

interface SqlTable {
  name: string;
  columns: string[];
  rows: unknown[][];
  total: number;
}

interface PreviewData {
  size: number;
  kind?: 'text' | 'image' | 'video' | 'audio' | 'pdf' | 'sqlite' | 'toolarge';
  binary?: boolean;
  truncated?: boolean;
  content?: string;
  dataUrl?: string;
  tables?: SqlTable[];
  error?: string;
}

const invoke = <T,>(channel: string, ...args: unknown[]): Promise<T> =>
  window.api.invoke(channel, ...args);

export const formatBytes = (n: number): string => {
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
};

const Empty: React.FC<{ icon: React.ReactNode; title: string; hint?: string }> = ({
  icon,
  title,
  hint,
}) => (
  <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-text-secondary/10 text-text-secondary">
      {icon}
    </span>
    <div className="text-[12.5px] font-medium text-text-primary">{title}</div>
    {hint && <div className="text-[11.5px] text-text-secondary">{hint}</div>}
  </div>
);

const cellText = (v: unknown): string => (v === null || v === undefined ? 'NULL' : String(v));

const SqlView: React.FC<{ tables: SqlTable[] }> = ({ tables }) => {
  const [active, setActive] = useState(0);
  useEffect(() => setActive(0), [tables]);
  const t = tables[active];
  if (!t) return <Empty icon={<Database className="h-5 w-5" />} title="No tables" />;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-border px-2 py-1.5">
        {tables.map((x, i) => (
          <button
            key={x.name}
            type="button"
            onClick={() => setActive(i)}
            className={cn(
              'h-6 shrink-0 cursor-pointer rounded-md px-2 font-mono text-[11.5px] outline-none transition-colors',
              i === active
                ? 'bg-warn/20 text-warn'
                : 'text-text-secondary hover:bg-card-hover hover:text-text-primary',
            )}
          >
            {x.name}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="min-w-full border-collapse font-mono text-[11.5px]">
          <thead className="sticky top-0 bg-card-background">
            <tr>
              {t.columns.map((c) => (
                <th
                  key={c}
                  className="whitespace-nowrap border-b border-border px-2.5 py-1.5 text-left font-medium text-text-secondary"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.rows.map((row, ri) => (
              <tr key={ri} className="hover:bg-card-hover">
                {row.map((v, ci) => (
                  <td
                    key={ci}
                    title={cellText(v)}
                    className={cn(
                      'max-w-[260px] truncate border-b border-border/40 px-2.5 py-1',
                      v === null || v === undefined ? 'text-text-secondary/60' : 'text-text-primary',
                    )}
                  >
                    {cellText(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="shrink-0 border-t border-border px-3 py-1.5 text-[11px] text-text-secondary">
        {t.rows.length < t.total
          ? `Showing ${t.rows.length} of ${t.total} rows`
          : `${t.total} row${t.total === 1 ? '' : 's'}`}
      </div>
    </div>
  );
};

const FilePreview: React.FC<{ rel: string | null; className?: string }> = ({ rel, className }) => {
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!rel) {
      setData(null);
      return;
    }
    let off = false;
    setLoading(true);
    setData(null);
    invoke<PreviewData>('backup:read-file', rel)
      .then((res) => {
        if (!off) setData(res);
      })
      .catch((e) => {
        if (!off) setData({ size: 0, error: e instanceof Error ? e.message : String(e) });
      })
      .finally(() => {
        if (!off) setLoading(false);
      });
    return () => {
      off = true;
    };
  }, [rel]);

  const kind = data?.kind ?? (data?.binary ? undefined : 'text');

  const lineNumbers = useMemo(() => {
    if (kind !== 'text' || !data?.content) return '';
    const count = data.content.split('\n').length;
    return Array.from({ length: count }, (_, i) => i + 1).join('\n');
  }, [data, kind]);

  const name = rel?.split('/').pop() ?? '';

  const renderBody = () => {
    if (loading || !data) return <Empty icon={<Loader2 className="h-5 w-5 animate-spin" />} title="Loading..." />;
    if (data.error)
      return <Empty icon={<AlertCircle className="h-5 w-5" />} title="Cannot preview" hint={data.error} />;
    switch (kind) {
      case 'image':
        return (
          <div className="flex h-full items-center justify-center p-3">
            <img src={data.dataUrl} alt={name} className="max-h-full max-w-full object-contain" />
          </div>
        );
      case 'video':
        return (
          <div className="flex h-full items-center justify-center p-3">
            <video src={data.dataUrl} controls className="max-h-full max-w-full" />
          </div>
        );
      case 'audio':
        return (
          <div className="flex h-full items-center justify-center p-4">
            <audio src={data.dataUrl} controls className="w-full" />
          </div>
        );
      case 'pdf':
        return <iframe src={data.dataUrl} title={name} className="h-full w-full border-0" />;
      case 'sqlite':
        return <SqlView tables={data.tables ?? []} />;
      case 'toolarge':
        return (
          <Empty
            icon={<FileSearch className="h-5 w-5" />}
            title="File too large to preview"
            hint={formatBytes(data.size)}
          />
        );
      case 'text':
        return data.content === '' ? (
          <Empty icon={<FileSearch className="h-5 w-5" />} title="Empty file" />
        ) : (
          <div className="h-full overflow-auto">
            <div className="flex min-w-max p-3 font-mono text-[11.5px] leading-5">
              <pre className="m-0 select-none pr-3 text-right text-text-secondary/60">{lineNumbers}</pre>
              <pre className="m-0 text-text-primary">{data.content}</pre>
            </div>
          </div>
        );
      default:
        return (
          <Empty
            icon={<FileSearch className="h-5 w-5" />}
            title="Binary file"
            hint="Preview is not available for this file type"
          />
        );
    }
  };

  return (
    <div className={cn('flex min-w-0 flex-col overflow-hidden', className)}>
      {!rel ? (
        <Empty
          icon={<FileSearch className="h-5 w-5" />}
          title="No file selected"
          hint="Select a file on the left to preview its content"
        />
      ) : (
        <>
          <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
            <img src={getFileIconPath(name)} alt="" draggable={false} className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-[12.5px] text-text-primary" title={rel}>
              {rel}
            </span>
            {data && !data.error && <Badge tone="muted">{formatBytes(data.size)}</Badge>}
          </div>
          <div className="min-h-0 flex-1">{renderBody()}</div>
          {kind === 'text' && data?.truncated && (
            <div className="shrink-0 border-t border-border px-3 py-1.5 text-[11px] text-text-secondary">
              Showing the first 512 KB
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FilePreview;