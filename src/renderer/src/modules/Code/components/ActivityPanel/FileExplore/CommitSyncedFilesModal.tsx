import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Loader } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalHeader } from '@renderer/components/ui/Modal/ModalHeader';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';
import { Button } from '@renderer/components/ui/Button';
import { getFileIconPath, getFolderIconPath } from '@renderer/utils/file-icon';

interface CommitSyncedFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDone: () => void;
  projectPath: string;
  files: string[];
}

const buildTemplate = (count: number) =>
  `chore: sync ${count} file${count === 1 ? '' : 's'} outside scope with default branch`;

interface TreeNode {
  name: string;
  key: string;
  children: Map<string, TreeNode>;
}

interface TreeRow {
  node: TreeNode;
  depth: number;
  isFolder: boolean;
}

const buildTree = (paths: string[]): TreeNode => {
  const root: TreeNode = { name: '', key: '', children: new Map() };
  for (const p of paths) {
    let cur = root;
    let key = '';
    for (const part of p.split('/').filter(Boolean)) {
      key = key ? `${key}/${part}` : part;
      let next = cur.children.get(part);
      if (!next) {
        next = { name: part, key, children: new Map() };
        cur.children.set(part, next);
      }
      cur = next;
    }
  }
  return root;
};

const flattenTree = (
  node: TreeNode,
  collapsed: Set<string>,
  depth = 0,
  out: TreeRow[] = [],
): TreeRow[] => {
  const sorted = [...node.children.values()].sort((a, b) => {
    const aFolder = a.children.size > 0;
    const bFolder = b.children.size > 0;
    if (aFolder !== bFolder) return aFolder ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const child of sorted) {
    const isFolder = child.children.size > 0;
    out.push({ node: child, depth, isFolder });
    if (isFolder && !collapsed.has(child.key)) flattenTree(child, collapsed, depth + 1, out);
  }
  return out;
};

export function CommitSyncedFilesModal({
  isOpen,
  onClose,
  onDone,
  projectPath,
  files,
}: CommitSyncedFilesModalProps) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setMessage(buildTemplate(files.length));
    setError(null);
  }, [isOpen]);

  const base = projectPath.replace(/\/+$/, '');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const tree = useMemo(
    () => buildTree(files.map((p) => (p.startsWith(`${base}/`) ? p.slice(base.length + 1) : p))),
    [files, base],
  );
  const rows = useMemo(() => flattenTree(tree, collapsed), [tree, collapsed]);
  const toggleFolder = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const handleSubmit = async () => {
    if (busy || files.length === 0 || !message.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await window.api.invoke(
        'git:commit-push-files',
        projectPath,
        files,
        message.trim(),
      );
      if (res?.error) {
        setError(res.committed ? `Committed, but push failed: ${res.error}` : res.error);
        if (res.committed) onDone();
        return;
      }
      onDone();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={busy ? () => {} : onClose}
      closeOnBackdropClick={false}
      className="w-[520px] max-w-[90vw] max-h-[80vh]"
    >
      <ModalHeader
        onClose={onClose}
        title={<span className="text-[15px]">Commit and push synced files</span>}
        description={
          <span className="text-[13px]">
            {files.length} file(s) outside scope · same as default branch
          </span>
        }
      />
      <ModalBody className="flex flex-col gap-3 min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 max-h-[260px] overflow-y-auto bg-card-background rounded-md py-1">
          {rows.map(({ node, depth, isFolder }) => {
            const expanded = !collapsed.has(node.key);
            return (
              <div
                key={node.key}
                onClick={isFolder ? () => toggleFolder(node.key) : undefined}
                className={cn(
                  'flex items-center gap-1.5 w-full py-1 pr-2 rounded text-left min-w-0',
                  isFolder && 'cursor-pointer hover:bg-card-hover',
                )}
                style={{ paddingLeft: `${8 + depth * 12}px` }}
              >
                <ChevronRight
                  className={cn(
                    'w-3.5 h-3.5 shrink-0 transition-transform text-text-secondary',
                    expanded && 'rotate-90',
                    !isFolder && 'invisible',
                  )}
                  strokeWidth={1.5}
                />
                <img
                  src={
                    isFolder ? getFolderIconPath(node.name, expanded) : getFileIconPath(node.name)
                  }
                  alt=""
                  className="w-4 h-4 shrink-0"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    const fallback = isFolder
                      ? '/images/icon/folder-base.svg'
                      : '/images/icon/file.svg';
                    if (img.src.endsWith(fallback)) img.style.display = 'none';
                    else img.src = fallback;
                  }}
                />
                <span className="truncate text-[13px] text-text-primary" title={node.key}>
                  {node.name}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[12px] text-text-secondary">Commit message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            disabled={busy}
            className="w-full resize-none rounded-md bg-card-background border border-border px-2 py-1.5 text-[13px] text-text-primary outline-none focus:border-primary"
          />
        </div>
        {error && <div className="text-[12px] text-error break-words">{error}</div>}
      </ModalBody>
      <ModalFooter>
        <button
          onClick={onClose}
          disabled={busy}
          className="h-8 px-3 rounded text-[13px] bg-button-soft-background text-text-secondary hover:bg-button-soft-background/80 hover:text-text-primary active:bg-button-soft-background/70 disabled:hover:bg-button-soft-background transition-colors"
        >
          Cancel
        </button>
        <Button
          className="bg-button-soft-background text-primary hover:bg-button-soft-background/80 active:bg-button-soft-background/70"
          onClick={handleSubmit}
          disabled={busy || files.length === 0 || !message.trim()}
        >
          {busy ? <Loader className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} /> : null}
          Commit and push
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default CommitSyncedFilesModal;
