import { memo, useEffect, useMemo, useState } from 'react';
import { ChevronRight, Loader } from 'lucide-react';
import { Dropdown, DropdownTrigger, DropdownContent } from '@renderer/components/ui/Dropdown';
import { getFileIconPath, getFolderIconPath } from '@renderer/shared/utils/fileIconMapper';
import { cn } from '@renderer/shared/utils/cn';
import { useCodeStore } from '../../../hooks/useCodeStore';

interface DirEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

const sortEntries = (a: DirEntry, b: DirEntry): number => {
  if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
  return collator.compare(a.name, b.name);
};

async function listDir(dirPath: string): Promise<DirEntry[]> {
  try {
    const entries = await window.api.invoke('fs:list-dir', dirPath);
    return Array.isArray(entries) ? [...entries].sort(sortEntries) : [];
  } catch {
    return [];
  }
}

interface MiniNodeProps {
  entry: DirEntry;
  depth: number;
  targetPath: string;
  onOpenFile: (path: string, name: string) => void;
}

function MiniNode({ entry, depth, targetPath, onOpenFile }: MiniNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<DirEntry[] | null>(null);

  useEffect(() => {
    if (entry.isDirectory && expanded && children === null) {
      listDir(entry.path).then(setChildren);
    }
  }, [entry.isDirectory, entry.path, expanded, children]);

  const isTarget = entry.path === targetPath;
  const iconSrc = entry.isDirectory
    ? getFolderIconPath(entry.name, expanded)
    : getFileIconPath(entry.name);
  const fallbackIcon = entry.isDirectory ? '/images/icon/folder-base.svg' : '/images/icon/file.svg';

  const handleClick = () => {
    if (entry.isDirectory) setExpanded((v) => !v);
    else onOpenFile(entry.path, entry.name);
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          'flex items-center gap-1.5 w-full py-1 pr-2 rounded text-left text-[13px] transition-colors outline-none',
          isTarget
            ? 'bg-card-hover text-text-primary'
            : 'text-text-secondary hover:bg-card-hover hover:text-text-primary',
        )}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        {entry.isDirectory ? (
          expanded && children === null ? (
            <Loader className="w-3.5 h-3.5 shrink-0 animate-spin" strokeWidth={1.5} />
          ) : (
            <ChevronRight
              className={cn('w-3.5 h-3.5 shrink-0 transition-transform', expanded && 'rotate-90')}
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
        <span className="truncate">{entry.name}</span>
      </button>
      {entry.isDirectory &&
        expanded &&
        children?.map((child) => (
          <MiniNode
            key={child.path}
            entry={child}
            depth={depth + 1}
            targetPath={targetPath}
            onOpenFile={onOpenFile}
          />
        ))}
    </div>
  );
}

interface MiniExplorerProps {
  dirPath: string;
  targetPath: string;
  onOpenFile: (path: string, name: string) => void;
}

function MiniExplorer({ dirPath, targetPath, onOpenFile }: MiniExplorerProps) {
  const [entries, setEntries] = useState<DirEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listDir(dirPath).then((list) => {
      if (!cancelled) setEntries(list);
    });
    return () => {
      cancelled = true;
    };
  }, [dirPath]);

  return (
    <div className="max-h-[320px] overflow-y-auto py-1">
      {entries === null ? (
        <div className="flex items-center justify-center py-3 text-text-secondary">
          <Loader className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
        </div>
      ) : (
        entries.map((entry) => (
          <MiniNode
            key={entry.path}
            entry={entry}
            depth={0}
            targetPath={targetPath}
            onOpenFile={onOpenFile}
          />
        ))
      )}
    </div>
  );
}

interface SegmentProps {
  label: string;
  parentDir: string;
  targetPath: string;
  isFile: boolean;
}

function Segment({ label, parentDir, targetPath, isFile }: SegmentProps) {
  const [open, setOpen] = useState(false);

  const handleOpenFile = (path: string, name: string) => {
    const sessionId = useCodeStore.getState().activeWorkspaceSessionId;
    if (sessionId) useCodeStore.getState().requestOpenFile(sessionId, path, name);
    setOpen(false);
  };

  return (
    <Dropdown open={open} onOpenChange={setOpen} align="start" sideOffset={4} width={260}>
      <DropdownTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-1 px-1.5 py-0.5 rounded text-[12px] transition-colors outline-none hover:bg-card-hover',
            isFile ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary',
            open && 'bg-card-hover',
          )}
        >
          {isFile && (
            <img
              src={getFileIconPath(label)}
              alt=""
              className="w-3.5 h-3.5 shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <span className="whitespace-nowrap">{label}</span>
        </button>
      </DropdownTrigger>
      <DropdownContent className="min-w-[200px]" size="sm">
        <MiniExplorer dirPath={parentDir} targetPath={targetPath} onOpenFile={handleOpenFile} />
      </DropdownContent>
    </Dropdown>
  );
}

interface FileBreadcrumbProps {
  filePath: string;
}

export const FileBreadcrumb = memo(function FileBreadcrumb({ filePath }: FileBreadcrumbProps) {
  const root = useCodeStore((s) => {
    const p = s.projects.find((pr) => pr.id === s.currentProjectId);
    return p?.explorerRoot ?? p?.path ?? null;
  });

  const segments = useMemo(() => {
    const parts = filePath.split('/');
    const rootPrefix = root ? (root.endsWith('/') ? root : root + '/') : null;
    const startIdx =
      rootPrefix && filePath.startsWith(rootPrefix) ? rootPrefix.split('/').length - 1 : 1;
    return parts.slice(startIdx).map((label, k) => {
      const end = startIdx + k;
      return {
        label,
        parentDir: parts.slice(0, end).join('/') || '/',
        targetPath: parts.slice(0, end + 1).join('/'),
        isFile: end === parts.length - 1,
      };
    });
  }, [filePath, root]);

  return (
    <div className="flex items-center w-full h-7 px-2 gap-0.5 border-b border-divider flex-shrink-0 overflow-x-auto">
      {segments.map((seg, i) => (
        <div key={seg.targetPath} className="flex items-center shrink-0">
          {i > 0 && (
            <ChevronRight className="w-3 h-3 shrink-0 text-text-secondary/60" strokeWidth={1.5} />
          )}
          <Segment
            label={seg.label}
            parentDir={seg.parentDir}
            targetPath={seg.targetPath}
            isFile={seg.isFile}
          />
        </div>
      ))}
    </div>
  );
});