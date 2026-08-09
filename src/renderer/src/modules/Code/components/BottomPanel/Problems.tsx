import { useState, useMemo, useCallback } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Lightbulb,
  Search,
  ChevronRight,
  ArrowUpDown,
  ChevronsUpDown,
  Copy,
  FileText,
} from 'lucide-react';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';
import { useCodeStore, type FileNode } from '../../hooks/useCodeStore';
import { useDiagnostics } from '../../hooks/useDiagnostics';
import { getFileIconPath } from '@renderer/shared/utils/fileIconMapper';
import { cn } from '@renderer/shared/utils/cn';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Diagnostic {
  uri: string;
  severity: number; // 1=Error, 2=Warning, 3=Info, 4=Hint
  message: string;
  source?: string;
  code?: string | number;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
}
// ─── Constants ───────────────────────────────────────────────────────────────
type SeverityKey = 'error' | 'warning' | 'info' | 'hint';

const SEV_CONFIG: Record<SeverityKey, { level: number; label: string; icon: React.ReactNode }> = {
  error: {
    level: 1,
    label: 'Errors',
    icon: <AlertCircle className="w-3.5 h-3.5" strokeWidth={2} />,
  },
  warning: {
    level: 2,
    label: 'Warnings',
    icon: <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2} />,
  },
  info: {
    level: 3,
    label: 'Infos',
    icon: <Info className="w-3.5 h-3.5" strokeWidth={2} />,
  },
  hint: {
    level: 4,
    label: 'Hints',
    icon: <Lightbulb className="w-3.5 h-3.5" strokeWidth={2} />,
  },
};

const SEV_ORDER: SeverityKey[] = ['error', 'warning', 'info', 'hint'];

const SEV_ICON: Record<SeverityKey, React.ReactNode> = {
  error: <AlertCircle className="w-[15px] h-[15px] text-error shrink-0" strokeWidth={2} />,
  warning: <AlertTriangle className="w-[15px] h-[15px] text-warn shrink-0" strokeWidth={2} />,
  info: <Info className="w-[15px] h-[15px] text-info shrink-0" strokeWidth={2} />,
  hint: <Lightbulb className="w-[15px] h-[15px] text-text-secondary shrink-0" strokeWidth={2} />,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sevKeyFromLevel(level: number): SeverityKey {
  switch (level) {
    case 1:
      return 'error';
    case 2:
      return 'warning';
    case 3:
      return 'info';
    case 4:
      return 'hint';
    default:
      return 'info';
  }
}

function getFileName(uri: string): string {
  try {
    const url = new URL(uri);
    const parts = url.pathname.split('/');
    return parts[parts.length - 1] || uri;
  } catch {
    return uri;
  }
}

function getFilePath(uri: string): string {
  try {
    const url = new URL(uri);
    return url.pathname;
  } catch {
    return uri.replace('file://', '');
  }
}

function getRelativePath(uri: string): string {
  const fullPath = getFilePath(uri);
  const parts = fullPath.split('/');
  return parts.slice(-3).join('/') || fullPath;
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-transparent text-info font-bold">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

async function getLineContent(filePath: string, lineNumber: number): Promise<string> {
  try {
    const monaco = (window as any).monaco;
    if (monaco) {
      const uri = monaco.Uri.parse('file://' + filePath);
      const model = monaco.editor.getModel(uri);
      if (model) {
        const content = model.getValue();
        const lines = content.split('\n');
        return lines[lineNumber - 1] || '';
      }
    }
    const content = await window.api.invoke('fs:read-file', filePath);
    const lines = content.split('\n');
    return lines[lineNumber - 1] || '';
  } catch {
    return '';
  }
}

function formatCopyLine(diagnostic: Diagnostic, lineContent: string, relativePath: string): string {
  const line = diagnostic.range.start.line + 1;
  return `${relativePath}: "${diagnostic.message}" at line ${line}\n\`\`\`\n${lineContent.trim()}\n\`\`\``;
}

function formatCopyMessage(diagnostic: Diagnostic): string {
  return diagnostic.message;
}

async function navigateToDiagnostic(diagnostic: Diagnostic) {
  const filePath = getFilePath(diagnostic.uri);
  const fileName = getFileName(diagnostic.uri);
  const line = diagnostic.range.start.line + 1;
  const col = diagnostic.range.start.character + 1;
  const endLine = diagnostic.range.end.line + 1;
  const endCol = diagnostic.range.end.character + 1;

  const store = useCodeStore.getState();
  const project = store.projects.find((p) => p.id === store.currentProjectId);
  if (!project) return;

  let existingFileId: string | null = null;
  for (const fid of project.openFiles) {
    const node = project.fileNodeMap[fid];
    if (node && (node.path === filePath || node.path === diagnostic.uri)) {
      existingFileId = fid;
      break;
    }
  }

  if (existingFileId) {
    store.setActiveFileTab(existingFileId);
  } else {
    const tempNode: FileNode = {
      id: filePath,
      name: fileName,
      type: 'file',
      path: filePath,
    };
    store.openFile(project.id, filePath, fileName, tempNode);
  }

  setTimeout(() => {
    const monaco = (window as any).monaco;
    if (!monaco) return;
    const uri = monaco.Uri.parse('file://' + filePath);
    const editors = monaco.editor.getEditors();
    const editor = editors.find((e: any) => e.getModel()?.uri.toString() === uri.toString());
    if (editor) {
      editor.revealLineInCenter(line);
      editor.setSelection({
        startLineNumber: line,
        startColumn: col,
        endLineNumber: endLine,
        endColumn: endCol,
      });
      editor.focus();
    }
  }, 150);
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface FileGroup {
  file: string;
  path: string;
  items: Diagnostic[];
  counts: Record<SeverityKey, number>;
  topSeverity: SeverityKey;
}

interface ContextMenuState {
  x: number;
  y: number;
  type: 'row' | 'header';
  diagnostic?: Diagnostic;
  group?: FileGroup;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function Problems() {
  // Use custom diagnostics store
  const { allDiagnostics: allDiagsFromStore } = useDiagnostics();

  const [severities, setSeverities] = useState<Record<SeverityKey, boolean>>({
    error: true,
    warning: true,
    info: true,
    hint: true,
  });
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<'severity' | 'file'>('severity');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const { allDiagnostics, groups } = useMemo(() => {
    // Use diagnostics from store instead of recalculating
    const all = (allDiagsFromStore || []).map((d) => ({
      ...d,
      severity: d.severity as number,
    }));

    const q = query.trim().toLowerCase();
    const filtered = all.filter((d) => {
      const sev = sevKeyFromLevel(d.severity);
      if (!severities[sev]) return false;
      if (!q) return true;
      const fileName = getFileName(d.uri);
      const filePath = getFilePath(d.uri);
      return (
        fileName.toLowerCase().includes(q) ||
        d.message.toLowerCase().includes(q) ||
        filePath.toLowerCase().includes(q)
      );
    });

    const map = new Map<string, FileGroup>();
    filtered.forEach((d) => {
      const path = getFilePath(d.uri);
      if (!map.has(path)) {
        map.set(path, {
          file: getFileName(d.uri),
          path,
          items: [],
          counts: { error: 0, warning: 0, info: 0, hint: 0 },
          topSeverity: 'info',
        });
      }
      const group = map.get(path)!;
      group.items.push(d);
      const sev = sevKeyFromLevel(d.severity);
      group.counts[sev]++;
      if (SEV_ORDER.indexOf(sev) < SEV_ORDER.indexOf(group.topSeverity)) {
        group.topSeverity = sev;
      }
    });

    let groupsArr = Array.from(map.values());

    if (sortMode === 'file') {
      groupsArr.sort((a, b) => a.file.localeCompare(b.file));
    } else {
      groupsArr.sort((a, b) => SEV_ORDER.indexOf(a.topSeverity) - SEV_ORDER.indexOf(b.topSeverity));
    }

    groupsArr.forEach((g) =>
      g.items.sort(
        (a, b) =>
          SEV_ORDER.indexOf(sevKeyFromLevel(a.severity)) -
          SEV_ORDER.indexOf(sevKeyFromLevel(b.severity)),
      ),
    );

    return { allDiagnostics: all, groups: groupsArr };
  }, [allDiagsFromStore, severities, query, sortMode]);

  const totalCounts = useMemo(() => {
    const counts: Record<SeverityKey, number> = { error: 0, warning: 0, info: 0, hint: 0 };
    allDiagnostics.forEach((d) => {
      counts[sevKeyFromLevel(d.severity)]++;
    });
    return counts;
  }, [allDiagnostics]);

  const toggleSeverity = useCallback((sev: SeverityKey) => {
    setSeverities((prev) => ({ ...prev, [sev]: !prev[sev] }));
  }, []);

  const toggleCollapseAll = useCallback(() => {
    const newState = !allCollapsed;
    setAllCollapsed(newState);
    setCollapsed(newState ? new Set(groups.map((g) => g.path)) : new Set());
  }, [allCollapsed, groups]);

  const toggleGroup = useCallback((path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleRowClick = useCallback((diagnostic: Diagnostic) => {
    navigateToDiagnostic(diagnostic);
  }, []);

  const handleRowContextMenu = useCallback((e: React.MouseEvent, diagnostic: Diagnostic) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, type: 'row', diagnostic });
  }, []);

  const handleHeaderContextMenu = useCallback((e: React.MouseEvent, group: FileGroup) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, type: 'header', group });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const handleCopyLine = useCallback(async () => {
    if (!contextMenu) return;
    if (contextMenu.type === 'row' && contextMenu.diagnostic) {
      const lineContent = await getLineContent(
        getFilePath(contextMenu.diagnostic.uri),
        contextMenu.diagnostic.range.start.line + 1,
      );
      const relPath = getRelativePath(contextMenu.diagnostic.uri);
      const text = formatCopyLine(contextMenu.diagnostic, lineContent, relPath);
      navigator.clipboard?.writeText(text).catch(() => {});
    } else if (contextMenu.type === 'header' && contextMenu.group) {
      const promises = contextMenu.group.items.map(async (d) => {
        const lineContent = await getLineContent(getFilePath(d.uri), d.range.start.line + 1);
        const relPath = getRelativePath(d.uri);
        return formatCopyLine(d, lineContent, relPath);
      });
      const texts = await Promise.all(promises);
      navigator.clipboard?.writeText(texts.join('\n\n')).catch(() => {});
    }
    closeContextMenu();
  }, [contextMenu, closeContextMenu]);

  const handleCopyMessage = useCallback(() => {
    if (!contextMenu) return;
    if (contextMenu.type === 'row' && contextMenu.diagnostic) {
      const text = formatCopyMessage(contextMenu.diagnostic);
      navigator.clipboard?.writeText(text).catch(() => {});
    } else if (contextMenu.type === 'header' && contextMenu.group) {
      const text = contextMenu.group.items.map((d) => formatCopyMessage(d)).join('\n');
      navigator.clipboard?.writeText(text).catch(() => {});
    }
    closeContextMenu();
  }, [contextMenu, closeContextMenu]);

  if (allDiagnostics.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-text-secondary">
          <svg
            className="w-7 h-7 mx-auto mb-2.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12l3 3 5-6" />
          </svg>
          <div className="text-xs">Không có vấn đề nào</div>
          <div className="text-[10px] text-text-secondary mt-1">
            Mở file có lỗi để thấy diagnostics
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-sidebar flex-shrink-0 flex-wrap">
        {SEV_ORDER.map((sev) => {
          const cfg = SEV_CONFIG[sev];
          const active = severities[sev];
          const count = totalCounts[sev];
          if (count === 0) return null;
          return (
            <button
              key={sev}
              onClick={() => toggleSeverity(sev)}
              className={cn(
                'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold border transition-all',
                sev === 'error' && 'text-error border-error/30',
                sev === 'warning' && 'text-warn border-warn/30',
                sev === 'info' && 'text-info border-info/30',
                sev === 'hint' && 'text-text-secondary border-text-secondary/30',
                !active && 'opacity-40',
              )}
            >
              {cfg.icon}
              <span>{count}</span> {cfg.label}
            </button>
          );
        })}

        <div className="flex-1" />

        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-sidebar-item-hover border border-border rounded-md w-[168px] focus-within:w-[200px] focus-within:border-info transition-all">
          <Search className="w-3 h-3 text-text-secondary shrink-0" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Lọc theo tên file hoặc nội dung..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 min-w-0 bg-transparent outline-none text-[11px] text-text-primary placeholder:text-text-secondary"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <button
          onClick={() => setSortMode((prev) => (prev === 'severity' ? 'file' : 'severity'))}
          className={cn(
            'w-[26px] h-[26px] rounded-md flex items-center justify-center shrink-0 transition-all',
            sortMode === 'file'
              ? 'bg-info/15 text-info'
              : 'text-text-secondary hover:text-text-primary hover:bg-sidebar-item-hover',
          )}
          title={sortMode === 'file' ? 'Đang sắp xếp theo File' : 'Sắp xếp theo Severity'}
        >
          <ArrowUpDown className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>

        <button
          onClick={toggleCollapseAll}
          className={cn(
            'w-[26px] h-[26px] rounded-md flex items-center justify-center shrink-0 transition-all',
            allCollapsed
              ? 'bg-info/15 text-info'
              : 'text-text-secondary hover:text-text-primary hover:bg-sidebar-item-hover',
          )}
          title="Thu gọn tất cả"
        >
          <ChevronsUpDown className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
        {groups.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-text-secondary text-xs">
              Không có vấn đề nào khớp với bộ lọc hiện tại
            </div>
          </div>
        ) : (
          groups.map((group) => {
            const isCollapsed = collapsed.has(group.path);
            const iconPath = getFileIconPath(group.file);

            return (
              <div key={group.path} className="border-b border-border bg-sidebar">
                <button
                  onClick={() => toggleGroup(group.path)}
                  onContextMenu={(e) => handleHeaderContextMenu(e, group)}
                  className="flex items-center gap-2 w-full px-2.5 py-2 cursor-pointer hover:bg-sidebar-item-hover text-left"
                >
                  <ChevronRight
                    className={cn(
                      'w-3 h-3 text-text-secondary shrink-0 transition-transform',
                      !isCollapsed && 'rotate-90',
                    )}
                    strokeWidth={2.5}
                  />
                  <img
                    src={iconPath}
                    alt=""
                    className="w-5 h-5 shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span className="font-mono text-xs font-semibold text-text-primary shrink-0">
                    {group.file}
                  </span>
                  <span className="font-mono text-[10.5px] text-text-secondary truncate flex-1 min-w-0">
                    {group.path}
                  </span>
                  {SEV_ORDER.filter((s) => group.counts[s] > 0).map((s) => (
                    <span
                      key={s}
                      className={cn(
                        'inline-flex items-center font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0',
                        s === 'error' && 'text-error bg-error/10',
                        s === 'warning' && 'text-warn bg-warn/10',
                        s === 'info' && 'text-info bg-info/10',
                        s === 'hint' && 'text-text-secondary bg-text-secondary/10',
                      )}
                    >
                      {group.counts[s]}
                    </span>
                  ))}
                </button>

                {!isCollapsed && (
                  <div className="border-t border-border">
                    {group.items.map((d, idx) => {
                      const sev = sevKeyFromLevel(d.severity);
                      const line = d.range.start.line + 1;
                      const col = d.range.start.character + 1;

                      return (
                        <div
                          key={`${d.uri}-${idx}`}
                          className="group flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border last:border-b-0 hover:bg-sidebar-item-hover cursor-pointer transition-colors"
                          style={{ paddingLeft: 56 }}
                          onClick={() => handleRowClick(d)}
                          onContextMenu={(e) => handleRowContextMenu(e, d)}
                        >
                          {SEV_ICON[sev]}

                          <span className="flex-1 min-w-0 text-[12.5px] text-text-primary whitespace-nowrap overflow-hidden text-ellipsis">
                            {highlightText(d.message, query)}
                            {d.source && (
                              <span className="text-text-secondary ml-1">({d.source})</span>
                            )}
                          </span>

                          <span className="shrink-0 font-mono text-[10.5px] text-text-secondary">
                            Line {line}, Col {col}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <Dropdown
        open={contextMenu !== null}
        onOpenChange={(open) => {
          if (!open) closeContextMenu();
        }}
        position={contextMenu ? { top: contextMenu.y, left: contextMenu.x } : undefined}
        strategy="fixed"
        side="bottom"
        align="start"
      >
        <DropdownTrigger>
          <div />
        </DropdownTrigger>
        <DropdownContent className="min-w-[180px]">
          <DropdownItem onClick={handleCopyLine} className="text-xs">
            <Copy className="w-3.5 h-3.5 text-text-secondary shrink-0" strokeWidth={1.5} />
            <span>Copy</span>
          </DropdownItem>
          <DropdownItem onClick={handleCopyMessage} className="text-xs">
            <FileText className="w-3.5 h-3.5 text-text-secondary shrink-0" strokeWidth={1.5} />
            <span>Copy message</span>
          </DropdownItem>
        </DropdownContent>
      </Dropdown>
    </div>
  );
}

export default Problems;
