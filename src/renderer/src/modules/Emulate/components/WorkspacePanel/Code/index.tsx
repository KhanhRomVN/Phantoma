/**
 * ------------------------------------------------------------------
 * Code Workspace Panel
 * ------------------------------------------------------------------
 * Panel hiển thị file explorer và nội dung file được chọn.
 * Gọi trực tiếp Code server qua codeApi (không phụ thuộc useCodeStore).
 * UI/UX tham khảo modules/Code: icon theo loại file, chevron, spinner,
 * context menu, và Monaco viewer (CodeBlock) ở chế độ read-only.
 *
 * Layout:
 * - Trái: Tree view (lazy-load từng thư mục)
 * - Phải: Monaco viewer
 * ------------------------------------------------------------------
 */

import { useState, useCallback, memo, useEffect } from 'react';
import { FolderOpen, ChevronRight, Loader, RefreshCw, ChevronsDownUp, X } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { getFileIconPath, getFolderIconPath } from '@renderer/utils/file-icon';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from '@renderer/components/ui/Dropdown';
import CodeBlock from '@renderer/components/common/CodeBlock';
import { dialogIpc } from '@renderer/modules/Code/shared/ipc/dialog.ipc';
import { shellIpc } from '@renderer/modules/Code/shared/ipc/shell.ipc';
import { codeApi } from '@renderer/modules/Code/shared/api/code.api';
import type { DirEntry } from '@renderer/modules/Code/shared/api/types/fs.types';

interface CodeWorkspacePanelProps {
  className?: string;
  activeTargetId: string | null;
  targetWorkspacePath?: string;
  onUpdateWorkspacePath?: (targetId: string, path: string | null) => Promise<void>;
}

const nameCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

const sortEntries = (entries: DirEntry[]): DirEntry[] =>
  [...entries].sort((a, b) =>
    a.isDirectory !== b.isDirectory ? (a.isDirectory ? -1 : 1) : nameCollator.compare(a.name, b.name),
  );

const copyText = (text: string) => {
  navigator.clipboard.writeText(text).catch(() => {});
};

interface TreeItemProps {
  entry: DirEntry;
  depth: number;
  rootPath: string;
  selectedFile: string | null;
  refreshKey: number;
  collapseKey: number;
  onSelectFile: (path: string) => void;
}

const TreeItem = memo(function TreeItem({
  entry,
  depth,
  rootPath,
  selectedFile,
  refreshKey,
  collapseKey,
  onSelectFile,
}: TreeItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<DirEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setChildren(null);
  }, [refreshKey]);

  useEffect(() => {
    setExpanded(false);
  }, [collapseKey]);

  useEffect(() => {
    if (!entry.isDirectory || !expanded || children !== null) return;
    let cancelled = false;
    setLoading(true);
    codeApi.fs
      .listDir(entry.path)
      .then((list) => {
        if (!cancelled) setChildren(sortEntries(list ?? []));
      })
      .catch(() => {
        if (!cancelled) setChildren([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [entry.isDirectory, entry.path, expanded, children]);

  const handleClick = () => {
    if (entry.isDirectory) setExpanded((v) => !v);
    else onSelectFile(entry.path);
  };

  const handleCopyRelative = () => {
    const base = rootPath.replace(/\/+$/, '') + '/';
    copyText(entry.path.startsWith(base) ? entry.path.slice(base.length) : entry.path);
  };

  const handleOpenFolder = () => {
    shellIpc.openPath(entry.path).catch(() => {});
  };

  const isActive = selectedFile === entry.path;
  const iconSrc = entry.isDirectory
    ? getFolderIconPath(entry.name, expanded)
    : getFileIconPath(entry.name);
  const fallbackIcon = entry.isDirectory ? '/images/icon/folder-base.svg' : '/images/icon/file.svg';

  return (
    <div>
      <Dropdown
        open={menuOpen}
        onOpenChange={setMenuOpen}
        trigger="contextmenu"
        className="w-full"
      >
        <DropdownTrigger asChild>
          <button
            onClick={handleClick}
            style={{ paddingLeft: `${8 + depth * 12}px` }}
            className={cn(
              'flex items-center gap-1.5 w-full py-1 pr-2 rounded text-sm text-left transition-colors outline-none focus:outline-none',
              isActive
                ? 'bg-card-hover text-text-primary'
                : 'text-text-secondary hover:bg-card-hover hover:text-text-primary',
            )}
          >
            {entry.isDirectory ? (
              loading ? (
                <Loader
                  className="w-3.5 h-3.5 shrink-0 text-text-secondary animate-spin"
                  strokeWidth={1.5}
                />
              ) : (
                <ChevronRight
                  className={cn(
                    'w-3.5 h-3.5 shrink-0 transition-transform text-text-secondary',
                    expanded && 'rotate-90',
                  )}
                  strokeWidth={1.5}
                />
              )
            ) : (
              <span className="w-3.5 h-3.5 shrink-0" />
            )}
            <img
              src={iconSrc}
              alt=""
              className="w-4 h-4 shrink-0"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (img.src.endsWith(fallbackIcon)) img.style.display = 'none';
                else img.src = fallbackIcon;
              }}
            />
            <span className="truncate text-[13px]">{entry.name}</span>
          </button>
        </DropdownTrigger>
        <DropdownContent className="min-w-[180px]" size="sm">
          {entry.isDirectory && (
            <>
              <DropdownItem onClick={handleOpenFolder}>Open Folder</DropdownItem>
              <DropdownSeparator />
            </>
          )}
          <DropdownItem onClick={() => copyText(entry.path)}>Copy Path</DropdownItem>
          <DropdownItem onClick={handleCopyRelative}>Copy Relative Path</DropdownItem>
        </DropdownContent>
      </Dropdown>
      {entry.isDirectory &&
        expanded &&
        children?.map((child) => (
          <TreeItem
            key={child.path}
            entry={child}
            depth={depth + 1}
            rootPath={rootPath}
            selectedFile={selectedFile}
            refreshKey={refreshKey}
            collapseKey={collapseKey}
            onSelectFile={onSelectFile}
          />
        ))}
    </div>
  );
});

const CodeWorkspacePanel: React.FC<CodeWorkspacePanelProps> = ({
  className,
  activeTargetId,
  targetWorkspacePath,
  onUpdateWorkspacePath,
}) => {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(targetWorkspacePath || null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [contents, setContents] = useState<Record<string, string>>({});
  const [rootEntries, setRootEntries] = useState<DirEntry[] | null>(null);
  const fileContent = selectedFile ? (contents[selectedFile] ?? '') : '';
  const fileLoading = selectedFile !== null && contents[selectedFile] === undefined;
  const [refreshKey, setRefreshKey] = useState(0);
  const [collapseKey, setCollapseKey] = useState(0);

  useEffect(() => {
    setSelectedFolder(targetWorkspacePath || null);
    setSelectedFile(null);
    setOpenTabs([]);
    setContents({});
  }, [targetWorkspacePath]);

  const handleSelectFolder = useCallback(async () => {
    try {
      const result = await dialogIpc.selectPaths({ kind: 'folder', multiple: false });
      if (result?.success && result.paths && result.paths.length > 0) {
        const folderPath = result.paths[0];
        setSelectedFolder(folderPath);
        setSelectedFile(null);
        setOpenTabs([]);
        setContents({});
        if (activeTargetId && onUpdateWorkspacePath) {
          await onUpdateWorkspacePath(activeTargetId, folderPath);
        }
      }
    } catch (error) {
      console.error('[CodeWorkspace] Failed to select folder:', error);
    }
  }, [activeTargetId, onUpdateWorkspacePath]);

  useEffect(() => {
    if (!selectedFolder) {
      setRootEntries(null);
      return;
    }
    let cancelled = false;
    setRootEntries(null);
    codeApi.fs
      .listDir(selectedFolder)
      .then((list) => {
        if (!cancelled) setRootEntries(sortEntries(list ?? []));
      })
      .catch((error) => {
        console.error('[CodeWorkspace] Failed to load folder:', error);
        if (!cancelled) setRootEntries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedFolder, refreshKey]);

  const handleFileSelect = useCallback(
    async (filePath: string) => {
      setSelectedFile(filePath);
      setOpenTabs((tabs) => (tabs.includes(filePath) ? tabs : [...tabs, filePath]));
      if (contents[filePath] !== undefined) return;
      try {
        const content = await codeApi.fs.readFile(filePath);
        setContents((prev) => ({ ...prev, [filePath]: content ?? '' }));
      } catch (error) {
        console.error('[CodeWorkspace] Failed to load file:', error);
        setContents((prev) => ({ ...prev, [filePath]: 'Error loading file' }));
      }
    },
    [contents],
  );

  const handleCloseTab = useCallback(
    (filePath: string) => {
      const idx = openTabs.indexOf(filePath);
      if (idx === -1) return;
      const next = openTabs.filter((t) => t !== filePath);
      setOpenTabs(next);
      setContents((prev) => {
        const { [filePath]: _removed, ...rest } = prev;
        return rest;
      });
      if (selectedFile === filePath) setSelectedFile(next[Math.min(idx, next.length - 1)] ?? null);
    },
    [openTabs, selectedFile],
  );

  if (!selectedFolder) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background relative overflow-hidden p-6">
        <div className="absolute inset-0 pointer-events-none opacity-[0.05]">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-primary blur-[130px]" />
        </div>
        <div className="relative z-10 text-center max-w-[740px] w-full flex flex-col items-center justify-center">
          <div className="relative w-[92px] h-[92px] mb-5">
            <i className="absolute inset-0 rounded-[22px] border border-border bg-card-background transform rotate-[-8deg]" />
            <i className="absolute inset-0 rounded-[22px] border border-transparent bg-card-hover transform rotate-[5deg]" />
            <i className="absolute inset-0 rounded-[22px] border border-primary/50 bg-card-background shadow-[0_8px_30px_rgba(255,106,31,0.2)] grid place-items-center text-primary">
              <FolderOpen className="w-9 h-9 stroke-[1.4]" />
            </i>
          </div>
          <h1 className="text-[17px] font-semibold text-text-primary mb-1.5">No folder selected</h1>
          <p className="text-[12.5px] max-w-[420px] text-text-secondary leading-relaxed mb-4">
            Select a folder to explore its files and view code content.
          </p>
          <button
            onClick={handleSelectFolder}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <FolderOpen size={16} />
            Select Folder
          </button>
        </div>
      </div>
    );
  }

  const toolbarBtn =
    'p-1 rounded text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors';

  return (
    <div className={cn('flex h-full', className)}>
      <div className="w-64 border-r border-border flex flex-col shrink-0">
        <div className="flex items-center justify-between h-9 px-2 border-b border-border bg-panel-background">
          <span
            className="text-[13px] text-text-secondary truncate max-w-[50%]"
            title={selectedFolder}
          >
            {selectedFolder.split('/').filter(Boolean).pop() ?? 'Files'}
          </span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className={toolbarBtn}
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setCollapseKey((k) => k + 1)}
              className={toolbarBtn}
              title="Collapse all"
            >
              <ChevronsDownUp className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
            <button onClick={handleSelectFolder} className={toolbarBtn} title="Change folder">
              <FolderOpen className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {rootEntries === null ? (
            <div className="flex items-center gap-2 p-3 text-xs text-text-secondary">
              <Loader className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
              Loading...
            </div>
          ) : rootEntries.length === 0 ? (
            <p className="text-xs text-text-secondary p-3">Empty folder</p>
          ) : (
            rootEntries.map((entry) => (
              <TreeItem
                key={entry.path}
                entry={entry}
                depth={0}
                rootPath={selectedFolder}
                selectedFile={selectedFile}
                refreshKey={refreshKey}
                collapseKey={collapseKey}
                onSelectFile={handleFileSelect}
              />
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {selectedFile ? (
          <>
            <div className="h-9 border-b border-border flex items-stretch overflow-x-auto shrink-0 bg-panel-background">
              {openTabs.map((tab) => {
                const tabName = tab.split('/').pop() ?? tab;
                const active = tab === selectedFile;
                return (
                  <div
                    key={tab}
                    title={tab}
                    onClick={() => setSelectedFile(tab)}
                    onAuxClick={(e) => {
                      if (e.button === 1) handleCloseTab(tab);
                    }}
                    className={cn(
                      'group flex items-center gap-1.5 pl-3 pr-1.5 border-r border-border cursor-pointer shrink-0 max-w-[200px] text-[13px] transition-colors',
                      active
                        ? 'bg-background text-text-primary border-t-2 border-t-primary'
                        : 'text-text-secondary hover:bg-card-hover hover:text-text-primary',
                    )}
                  >
                    <img
                      src={getFileIconPath(tabName)}
                      alt=""
                      className="w-4 h-4 shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <span className="truncate">{tabName}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseTab(tab);
                      }}
                      className={cn(
                        'p-0.5 rounded hover:bg-card-hover text-text-secondary hover:text-text-primary',
                        !active && 'opacity-0 group-hover:opacity-100',
                      )}
                      title="Close"
                    >
                      <X className="w-3 h-3" strokeWidth={1.5} />
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="flex-1 min-h-0 relative">
              {fileLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader className="w-4 h-4 animate-spin text-text-secondary" strokeWidth={1.5} />
                </div>
              ) : (
                <CodeBlock
                  key={selectedFile}
                  code={fileContent}
                  filePath={selectedFile}
                  language="plaintext"
                  showLineNumbers
                  wordWrap="off"
                  hideDiagnostics
                  editorOptions={{ readOnly: true }}
                  className="h-full"
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-text-secondary">Select a file to view its content</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(CodeWorkspacePanel);