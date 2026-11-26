import { useState, useMemo } from 'react';
import {
  Search, Copy, Check, ChevronRight, Layers, CheckCircle2, XCircle, ChevronDown,
  Braces, Table2, X, AlertTriangle, Loader2, FileJson, Download,
} from 'lucide-react';
import { useCopy } from '../hooks/useCopy';
import type { RawPages, ScanState, PageStatus } from '../../types';
import { SCAN_TARGETS } from '../../scan/targets';

interface Props {
  raw: RawPages;
  scanState: ScanState;
}

const shortUrl = (u: string) => u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
const fieldCount = (d: any) => (d ? Object.keys(d).filter((k) => !k.startsWith('__')).length : 0);
const typeOf = (v: any): string => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);

interface MarkProps {
  text: string;
  q: string;
}

function Mark({ text, q }: MarkProps) {
  const s = String(text);
  if (!q) return <>{s}</>;
  const i = s.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return <>{s}</>;
  return (
    <>
      {s.slice(0, i)}
      <mark>{s.slice(i, i + q.length)}</mark>
      {s.slice(i + q.length)}
    </>
  );
}

function Prim({ v, q }: { v: any; q: string }) {
  const t = typeOf(v);
  return (
    <span className={`v-${t}`}>
      {t === 'string' ? (
        <>
          "<Mark text={v} q={q} />"
        </>
      ) : (
        <Mark text={String(v)} q={q} />
      )}
    </span>
  );
}

interface NodeProps {
  k: string | number | null;
  v: any;
  depth: number;
  q: string;
  onCopy: (path: string, value: any) => void;
  copied: string | null;
  path: string;
  last: boolean;
}

function Node({ k, v, depth, q, onCopy, copied, path, last }: NodeProps) {
  const isObj = v && typeof v === 'object';
  const entries = isObj ? Object.entries(v) : [];
  const [open, setOpen] = useState(depth < 2);
  const hasMatch = (val: any, query: string): boolean => {
    if (!query) return true;
    const L = query.toLowerCase();
    if (val && typeof val === 'object')
      return Object.entries(val).some(([key, x]) => key.toLowerCase().includes(L) || hasMatch(x, query));
    return String(val).toLowerCase().includes(L);
  };
  const forced = q && isObj && hasMatch(v, q);
  const show = open || forced;
  const dim = typeof k === 'string' && k.startsWith('__');
  const label = k !== null && (
    <span className={`k ${dim ? 'dim' : ''}`}>
      {typeof k === 'number' ? k : (
        <>
          "<Mark text={k as string} q={q} />"
        </>
      )}
      <i>:</i>
    </span>
  );
  const cp = (
    <button className="mini" onClick={() => onCopy(path, v)} title="Copy value" aria-label="Copy value">
      {copied === path ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
  const comma = last ? '' : ',';
  if (!isObj)
    return (
      <div className="ln" style={{ paddingLeft: depth * 18 + 22 }}>
        {label}
        <Prim v={v} q={q} />
        {comma}
        {cp}
      </div>
    );
  const [o, c] = Array.isArray(v) ? ['[', ']'] : ['{', '}'];
  return (
    <>
      <div className="ln" style={{ paddingLeft: depth * 18 }}>
        <button className="tg" onClick={() => setOpen(!show)} aria-label="Collapse / expand">
          {show ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
        {label}
        <span className="br">{o}</span>
        {!show && (
          <span className="fold" onClick={() => setOpen(true)}>
            {entries.length} items
          </span>
        )}
        {!show && (
          <span className="br">
            {c}
            {comma}
          </span>
        )}
        {cp}
      </div>
      {show &&
        entries.map(([ck, cv], i) => (
          <Node
            key={ck}
            k={Array.isArray(v) ? i : ck}
            v={cv}
            depth={depth + 1}
            q={q}
            onCopy={onCopy}
            copied={copied}
            path={`${path}.${ck}`}
            last={i === entries.length - 1}
          />
        ))}
      {show && (
        <div className="ln" style={{ paddingLeft: depth * 18 + 22 }}>
          <span className="br">
            {c}
            {comma}
          </span>
        </div>
      )}
    </>
  );
}

export function RawDataTab({ raw, scanState }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | PageStatus>('all');
  const [q, setQ] = useState('');
  const [view, setView] = useState<'json' | 'table'>('json');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const { copy, copied } = useCopy();

  const items = useMemo(
    () =>
      SCAN_TARGETS.map((t) => {
        const pageState = scanState.pages[t.id];
        const data = raw[t.id];
        return {
          ...t,
          site: t.siteLabel,
          title: t.label,
          status: pageState?.status || 'pending',
          error: pageState?.error,
          n: fieldCount(data),
        };
      }),
    [raw, scanState]
  );

  const ok = items.filter((i) => i.status === 'ok').length;
  const bad = items.filter((i) => i.status === 'error').length;
  const sites = [...new Set(items.map((i) => i.site))];
  const cur = items.find((i) => i.id === active);
  const data = active ? raw[active] : null;

  const hasMatchInData = (val: any, query: string): boolean => {
    if (!query) return true;
    const L = query.toLowerCase();
    if (val && typeof val === 'object')
      return Object.entries(val).some(([key, x]) => key.toLowerCase().includes(L) || hasMatchInData(x, query));
    return String(val).toLowerCase().includes(L);
  };

  const matches = (i: typeof items[0]) =>
    (filter === 'all' || i.status === filter) &&
    (!q ||
      i.id.toLowerCase().includes(q.toLowerCase()) ||
      i.title.toLowerCase().includes(q.toLowerCase()) ||
      i.url.toLowerCase().includes(q.toLowerCase()) ||
      hasMatchInData(raw[i.id], q));

  const copyAll = () => {
    const allData = SCAN_TARGETS.reduce((acc, target) => {
      if (raw[target.id]) acc[target.id] = raw[target.id];
      return acc;
    }, {} as Record<string, any>);
    copy('all', JSON.stringify(allData, null, 2));
  };

  return (
    <div className="stack rd">


      <div className="body">
        {/* Page list */}
        <aside className="list">
          <div className="find">
            <Search size={14} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search pages, keys or values…"
            />
            {q && (
              <button onClick={() => setQ('')} aria-label="Clear search">
                <X size={13} />
              </button>
            )}
          </div>
          <div className="chips">
            {[
              ['all', 'All', items.length, Layers],
              ['ok', 'Success', ok, CheckCircle2],
              ['error', 'Failed', bad, XCircle],
            ].map(([k, l, n, Ic]) => (
              <button
                key={k as string}
                className={`chip c-${k} ${filter === k ? 'on' : ''}`}
                onClick={() => setFilter(k as any)}
              >
                {/* @ts-ignore */}
                <Ic size={13} />
                {l as string}
                <em>{n as number}</em>
              </button>
            ))}
          </div>
          <div className="scroll">
            {sites.map((s) => {
              const rows = items.filter((i) => i.site === s && matches(i));
              if (!rows.length) return null;
              const shut = collapsed[s];
              return (
                <section key={s}>
                  <button
                    className="gh"
                    onClick={() => setCollapsed({ ...collapsed, [s]: !shut })}
                  >
                    {shut ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                    <span>{s}</span>
                    <em>{rows.length}</em>
                  </button>
                  {!shut &&
                    rows.map((i) => (
                      <button
                        key={i.id}
                        className={`row ${i.status} ${active === i.id ? 'on' : ''}`}
                        onClick={() => setActive(i.id)}
                      >
                        <span className="dot">
                          {i.status === 'scraping' && <Loader2 size={11} />}
                        </span>
                        <span className="rt">
                          <b>{i.title}</b>
                          <small>{shortUrl(i.url)}</small>
                        </span>
                        <span className="rn">
                          {i.status === 'error'
                            ? 'error'
                            : i.status === 'scraping'
                            ? 'scanning'
                            : i.n
                            ? `${i.n} fields`
                            : 'pending'}
                        </span>
                      </button>
                    ))}
                </section>
              );
            })}
          </div>
        </aside>

        {/* Data viewer */}
        <main className="view">
          <div className="vh">
            <div className="vt">
              <FileJson size={18} />
              <div>
                <h3>{cur?.title}</h3>
                <a href={cur?.url} title={cur?.id} target="_blank" rel="noreferrer">
                  {cur?.url}
                </a>
              </div>
            </div>
            <div className="acts">
              <div className="seg2" role="tablist">
                <button className={view === 'json' ? 'on' : ''} onClick={() => setView('json')}>
                  <Braces size={13} />
                  JSON
                </button>
                <button className={view === 'table' ? 'on' : ''} onClick={() => setView('table')}>
                  <Table2 size={13} />
                  Table
                </button>
              </div>
              <button className="btn" onClick={copyAll}>
                {copied === 'all' ? <Check size={13} /> : <Download size={13} />}
                {copied === 'all' ? 'Copied' : `Copy all (${Object.keys(raw).length})`}
              </button>
              <button className="btn pri" disabled={!data} onClick={() => copy('this', data)}>
                {copied === 'this' ? <Check size={13} /> : <Copy size={13} />}
                {copied === 'this' ? 'Copied' : 'Copy this page'}
              </button>
            </div>
          </div>

          <div className="code">
            {!data && cur?.status === 'error' && (
              <div className="empty bad">
                <span className="eb">
                  <AlertTriangle size={22} />
                </span>
                <h4>Couldn't read this page</h4>
                <p>{cur.error}. Let the page finish loading, then rescan.</p>
              </div>
            )}
            {!data && cur?.status !== 'error' && (
              <div className="empty">
                <span className="eb">
                  <Loader2 size={22} className="spin" />
                </span>
                <h4>Waiting for data</h4>
                <p>Results appear here once the scan finishes.</p>
              </div>
            )}
            {data && view === 'json' && (
              <div className="tree">
                <Node
                  k={null}
                  v={data}
                  depth={0}
                  q={q}
                  onCopy={copy}
                  copied={copied}
                  path={active!}
                  last
                />
              </div>
            )}
            {data && view === 'table' && (
              <table>
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Type</th>
                    <th>Value</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data)
                    .filter(([k, v]) => hasMatchInData({ [k]: v }, q))
                    .map(([k, v]) => (
                      <tr key={k}>
                        <td className="tk">
                          <Mark text={k} q={q} />
                        </td>
                        <td>
                          <span className={`ty t-${typeOf(v)}`}>{typeOf(v)}</span>
                        </td>
                        <td className="tv">
                          {v && typeof v === 'object' ? (
                            <code>{JSON.stringify(v)}</code>
                          ) : (
                            <Prim v={v} q={q} />
                          )}
                        </td>
                        <td>
                          <button className="mini show" onClick={() => copy(k, v)}>
                            {copied === k ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
          {data && (
            <footer>
              <span>{fieldCount(data)} fields</span>
              <span>{new Blob([JSON.stringify(data)]).size} bytes</span>
              <span>{cur?.site}</span>
            </footer>
          )}
        </main>
      </div>
    </div>
  );
}