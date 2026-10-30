import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';
import { getFileIconPath } from '@renderer/shared/utils/fileIconMapper';
import { useCodeStore, type StoredWorkspacePanel } from '../../hooks/useCodeStore';
import { useGitFileStatus } from '../../hooks/useGitFileStatus';
import { getPanelMeta } from '../ContentPanel/Workspace/WorkspacePanes';

const MAX_RESULTS = 100;
const NO_PANELS: StoredWorkspacePanel[] = [];

type Row =
  | { kind: 'tab'; panel: StoredWorkspacePanel; title: string }
  | { kind: 'file'; rel: string };

function getTabTitle(panel: StoredWorkspacePanel): string {
  if (panel.type === 'agent') {
    if (panel.workflowAgentId) return panel.title;
    return panel.agentTitle ? `Zen|${panel.agentTitle}` : 'Zen';
  }
  return panel.title || getPanelMeta(panel.type).label;
}

interface QuickOpenModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function scoreMatch(path: string, query: string): number {
  const p = path.toLowerCase();
  const name = p.slice(p.lastIndexOf('/') + 1);
  if (name === query) return 1000;
  if (name.startsWith(query)) return 800 - name.length;
  if (name.includes(query)) return 600 - name.length;
  if (p.includes(query)) return 400 - p.length;
  let qi = 0;
  for (let i = 0; i < p.length && qi < query.length; i++) {
    if (p[i] === query[qi]) qi++;
  }
  return qi === query.length ? 100 - p.length : -1;
}

export function QuickOpenModal({ isOpen, onClose }: QuickOpenModalProps) {
  const projectPath = useCodeStore((s) => {
    const p = s.projects.find((x) => x.id === s.currentProjectId);
    return p?.explorerRoot ?? p?.path ?? '';
  });
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const gitStatus = useGitFileStatus(isOpen ? projectPath : undefined);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setActive(0);
    if (!projectPath) {
      setFiles([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    window.api
      .invoke('workspace:list-files', projectPath)
      .then((res: { success: boolean; files: string[] }) => {
        if (!cancelled) setFiles(res?.success ? res.files : []);
      })
      .catch((err: unknown) => {
        console.error('[QuickOpenModal] List files failed:', err);
        if (!cancelled) setFiles([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, projectPath]);

  const sessionId = useCodeStore((s) => s.activeWorkspaceSessionId);
  const storedPanels = useCodeStore(
    (s) => s.projects.find((p) => p.id === s.currentProjectId)?.workspacePanels ?? NO_PANELS,
  );

  const results = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase();
    const tabs: Row[] = storedPanels
      .filter((p) => p.sessionId === sessionId)
      .map((panel) => {
        const title = getTabTitle(panel);
        const s = q
          ? Math.max(scoreMatch(title, q), panel.filePath ? scoreMatch(panel.filePath, q) : -1)
          : 0;
        return { row: { kind: 'tab', panel, title } as Row, s };
      })
      .filter((x) => x.s >= 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.row);
    const fileRows: Row[] = (
      q
        ? files
            .map((f) => ({ f, s: scoreMatch(f, q) }))
            .filter((x) => x.s >= 0)
            .sort((a, b) => b.s - a.s)
            .map((x) => x.f)
        : files
    )
      .slice(0, MAX_RESULTS)
      .map((rel) => ({ kind: 'file', rel }));
    return [...tabs, ...fileRows];
  }, [files, query, storedPanels, sessionId]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({
      block: 'nearest',
    });
  }, [active]);

  const openResult = (row: Row) => {
    const state = useCodeStore.getState();
    const activeSessionId = state.activeWorkspaceSessionId;
    if (activeSessionId) {
      if (row.kind === 'tab') {
        state.setContentViewMode('workspace');
        state.requestFocusPanel(activeSessionId, row.panel.id);
      } else {
        const name = row.rel.split('/').pop() || row.rel;
        state.requestOpenFile(activeSessionId, `${projectPath.replace(/\/+$/, '')}/${row.rel}`, name);
      }
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[active]) openResult(results[active]);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
      onMouseDown={onClose}
    >
      <div
        className="w-[560px] max-w-[90vw] h-[420px] max-h-[80vh] flex flex-col rounded-xl border border-border bg-background shadow-2xl overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-2.5 h-11 px-3.5 border-b border-border shrink-0">
          <Search className="w-4 h-4 text-text-secondary shrink-0" strokeWidth={1.5} />
          <input
            autoFocus
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={projectPath ? 'Search tabs and files...' : 'Select a project first'}
            className="flex-1 min-w-0 bg-transparent outline-none text-sm text-text-primary placeholder:text-text-secondary/50"
          />
        </div>
        <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto custom-scrollbar py-1">
          {results.length === 0 ? (
            <div className="h-full flex items-center justify-center px-4 text-xs text-text-secondary/60">
              {loading ? 'Loading files...' : 'No matching results'}
            </div>
          ) : (
            results.map((row, idx) => {
              const hasBoth = results[0].kind === 'tab' && results[results.length - 1].kind === 'file';
              const prev = results[idx - 1];
              const sectionLabel =
                hasBoth && (!prev || prev.kind !== row.kind)
                  ? row.kind === 'tab'
                    ? 'Open tabs'
                    : 'Project files'
                  : null;
              const label = sectionLabel && (
                <div className="px-3.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-text-secondary/60">
                  {sectionLabel}
                </div>
              );
              if (row.kind === 'tab') {
                const { panel, title } = row;
                return (
                  <div key={`tab-${panel.id}`}>
                    {label}
                    <div
                      data-idx={idx}
                      onClick={() => openResult(row)}
                      onMouseMove={() => setActive(idx)}
                      className={cn(
                        'flex items-center gap-2.5 px-3.5 py-1.5 cursor-pointer',
                        idx === active ? 'bg-text-secondary/[0.12]' : '',
                      )}
                    >
                      {panel.type === 'file' ? (
                        <img
                          src={getFileIconPath(title)}
                          alt=""
                          className="w-4 h-4 shrink-0 object-contain"
                          draggable={false}
                        />
                      ) : (
                        <span className="shrink-0">{getPanelMeta(panel.type, 'w-4 h-4').icon}</span>
                      )}
                      <span className="text-[13px] truncate text-text-primary shrink-0 max-w-[60%]">
                        {title}
                      </span>
                      {panel.filePath && (
                        <span
                          className="text-[11px] font-mono text-text-secondary/60 truncate min-w-0"
                          title={panel.filePath}
                        >
                          {panel.filePath}
                        </span>
                      )}
                    </div>
                  </div>
                );
              }
              const rel = row.rel;
              const name = rel.split('/').pop() || rel;
              const dir = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '';
              const status = gitStatus[`${projectPath.replace(/\/+$/, '')}/${rel}`];
              return (
                <div key={`file-${rel}`}>
                {label}
                <div
                  data-idx={idx}
                  onClick={() => openResult(row)}
                  onMouseMove={() => setActive(idx)}
                  className={cn(
                    'flex items-center gap-2.5 px-3.5 py-1.5 cursor-pointer',
                    idx === active ? 'bg-text-secondary/[0.12]' : '',
                  )}
                >
                  <img
                    src={getFileIconPath(name)}
                    alt=""
                    className="w-4 h-4 shrink-0 object-contain"
                    draggable={false}
                  />
                  <span
                    className={cn(
                      'text-[13px] truncate shrink-0 max-w-[60%]',
                      status === 'added'
                        ? 'text-emerald-500'
                        : status === 'modified'
                          ? 'text-orange-400'
                          : 'text-text-primary',
                    )}
                  >
                    {name}
                  </span>
                  <span className="text-[11px] font-mono text-text-secondary/60 truncate min-w-0" title={rel}>
                    {dir}
                  </span>
                </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default QuickOpenModal;