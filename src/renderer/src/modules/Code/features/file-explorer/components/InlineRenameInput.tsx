import { useRef, useEffect } from 'react';
import { toastService } from '@renderer/components/ui/Toast';
import { useCodeStore, type FileNode } from '../../../shared/stores/code.store';
import { codeApi } from '../../../shared/api/code.api';
import { getFileIconPath, getFolderIconPath } from '@renderer/utils/file-icon';
import { refreshProjectTree } from '../services/file-tree.service';

// ─── InlineRenameInput ──────────────────────────────────────────────────────
export interface InlineRenameInputProps {
  node: FileNode;
  depth: number;
  projectId: string;
  onDone: () => void;
}

export function InlineRenameInput({ node, depth, projectId, onDone }: InlineRenameInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef(false);
  const isFolder = node.type === 'folder';
  const iconSrc = isFolder ? getFolderIconPath(node.name, false) : getFileIconPath(node.name);
  const fallbackIcon = isFolder ? '/images/icon/folder-base.svg' : '/images/icon/file.svg';

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    const dot = isFolder ? -1 : node.name.lastIndexOf('.');
    el.setSelectionRange(0, dot > 0 ? dot : node.name.length);
  }, [isFolder, node.name]);

  const finish = async (commit: boolean) => {
    if (doneRef.current) return;
    doneRef.current = true;
    const newName = inputRef.current?.value.trim();
    if (commit && newName && newName !== node.name && node.path && !newName.includes('/')) {
      try {
        const parentPath = node.path.substring(0, node.path.lastIndexOf('/'));
        await codeApi.fs.rename(node.path, `${parentPath}/${newName}`);
        const state = useCodeStore.getState();
        state.invalidateDir(projectId, parentPath);
        const p = state.projects.find((pr) => pr.id === projectId);
        const root = p?.explorerRoot ?? p?.path;
        if (root) await refreshProjectTree(projectId, root);
      } catch (err) {
        console.error('[FileExplorer] Failed to rename:', err);
        toastService.show({
          variant: 'error',
          title: 'Rename failed',
          description: String((err as Error)?.message ?? err).split('\n')[0],
        });
      }
    }
    onDone();
  };

  return (
    <div
      className="flex items-center gap-1.5 w-full py-1 pr-2"
      style={{ paddingLeft: `${8 + depth * 12}px` }}
    >
      <span className="w-3.5 h-3.5 shrink-0" />
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
      <input
        ref={inputRef}
        defaultValue={node.name}
        spellCheck={false}
        className="flex-1 min-w-0 bg-input-background text-[13px] text-text-primary outline-none rounded px-1.5 py-0.5"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') void finish(true);
          if (e.key === 'Escape') void finish(false);
        }}
        onBlur={() => void finish(true)}
      />
    </div>
  );
}
