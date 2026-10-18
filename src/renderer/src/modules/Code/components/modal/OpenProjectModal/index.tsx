import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Loader2, FolderOpen, GitBranch, Search, Trash2, X, Check, AlertCircle } from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';

import { useCodeStore } from '../../../hooks/useCodeStore';
import { addCloneEntry } from '../../../utils/cloneHistory';
import { detectProjectStack, type StackInfo } from '@renderer/utils/detectStack';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalHeader } from '@renderer/components/ui/Modal/ModalHeader';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';
import {
  NewRepositoryForm,
  RecentClones,
  GIT_URL_REGEX,
  deriveFolderName,
} from './NewRepositoryForm';
import { ProjectDetailPanel, shortenPath } from './ProjectDetailPanel';

const DEFAULT_CLONE_DEST = '/home/khanhromvn/projects';

type Mode = 'local' | 'clone';
type Selection = { type: 'folder' } | { type: 'project'; id: string } | null;

interface OpenProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OpenProjectModal({ isOpen, onClose }: OpenProjectModalProps) {
  const addProject = useCodeStore((s) => s.addProject);
  const setCurrentProject = useCodeStore((s) => s.setCurrentProject);
  const projects = useCodeStore((s) => s.projects);
  const removeProject = useCodeStore((s) => s.removeProject);
  const currentProjectId = useCodeStore((s) => s.currentProjectId);

  const [mode, setMode] = useState<Mode>('local');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [browsePath, setBrowsePath] = useState('');
  const [selection, setSelection] = useState<Selection>(null);
  const [stackCache, setStackCache] = useState<Map<string, StackInfo>>(new Map());

  const [cloneUrl, setCloneUrl] = useState('');
  const [cloneFolderName, setCloneFolderName] = useState('');
  const [cloneDest, setCloneDest] = useState(DEFAULT_CLONE_DEST);
  const [folderNameEdited, setFolderNameEdited] = useState(false);

  const fetchingPathsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) return;
    setMode('local');
    setLoading(false);
    setError('');
    setSearchQuery('');
    setBrowsePath('');
    setSelection(null);
    setCloneUrl('');
    setCloneFolderName('');
    setCloneDest(DEFAULT_CLONE_DEST);
    setFolderNameEdited(false);
  }, [isOpen]);

  const recentProjects = useMemo(() => {
    let list = projects.filter((p) => p.id !== currentProjectId);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.path.toLowerCase().includes(q),
      );
    }
    return [...list].reverse();
  }, [projects, searchQuery, currentProjectId]);

  const target = useMemo(() => {
    if (mode !== 'local' || !selection) return null;
    if (selection.type === 'folder' && browsePath) {
      return { name: browsePath.split('/').pop() || 'Untitled', path: browsePath };
    }
    if (selection.type === 'project') {
      const proj = projects.find((p) => p.id === selection.id);
      if (proj) return { name: proj.name, path: proj.path };
    }
    return null;
  }, [mode, selection, browsePath, projects]);

  useEffect(() => {
    const path = target?.path;
    if (!path || stackCache.has(path) || fetchingPathsRef.current.has(path)) return;

    fetchingPathsRef.current.add(path);
    detectProjectStack(path)
      .then((info) => {
        setStackCache((prev) => new Map(prev).set(path, info));
      })
      .catch((err) => {
        console.error(`[OpenProjectModal] Detection failed for "${path}":`, err);
        setStackCache((prev) =>
          new Map(prev).set(path, {
            frameworks: [],
            languages: [],
            contributors: [],
            branches: [],
          }),
        );
      })
      .finally(() => {
        fetchingPathsRef.current.delete(path);
      });
  }, [target?.path, stackCache]);

  const cloneUrlValid = GIT_URL_REGEX.test(cloneUrl.trim());
  const cloneFolderValid = cloneFolderName.trim().length > 0 && !/[\\/]/.test(cloneFolderName);
  const canSubmit =
    mode === 'clone'
      ? cloneUrlValid && cloneFolderValid && cloneDest.trim().length > 0
      : selection !== null && target !== null;

  const handleSearchChange = (value: string) => {
    if (GIT_URL_REGEX.test(value.trim())) {
      setMode('clone');
      setCloneUrl(value.trim());
      setCloneFolderName(deriveFolderName(value));
      setFolderNameEdited(false);
      setSearchQuery('');
      return;
    }
    setSearchQuery(value);
  };

  const handleCloneUrlChange = (value: string) => {
    setCloneUrl(value);
    if (!folderNameEdited) setCloneFolderName(deriveFolderName(value));
  };

  const handleCloneFolderChange = (value: string) => {
    setCloneFolderName(value);
    setFolderNameEdited(true);
  };

  const pickDirectory = async (_title: string): Promise<string | null> => {
    try {
      const result = await window.api.invoke('dialog:select-paths', { kind: 'folder' });
      return result?.success && result.paths?.[0] ? result.paths[0] : null;
    } catch (err) {
      console.error('[OpenProjectModal] Browse failed:', err);
      return null;
    }
  };

  const handleBrowseFolder = async () => {
    const picked = await pickDirectory('Select Project Folder');
    if (picked) {
      setBrowsePath(picked);
      setSelection({ type: 'folder' });
      setMode('local');
    }
  };

  const handleBrowseDest = async () => {
    const picked = await pickDirectory('Select Clone Destination');
    if (picked) setCloneDest(picked);
  };

  const handleReuseClone = (entry: { url: string; name: string }) => {
    setCloneUrl(entry.url);
    setCloneFolderName(entry.name);
    setFolderNameEdited(true);
  };

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError('');
    try {
      if (mode === 'clone') {
        const url = cloneUrl.trim();
        const folderName = cloneFolderName.trim();
        const dest = `${cloneDest.trim().replace(/\/+$/, '')}/${folderName}`;
        await window.api.invoke('git:clone', { url, dest });
        addCloneEntry(url, folderName, dest);
        addProject({ name: folderName, path: dest, color: '#4fa8e0', template: 'blank' });
      } else if (selection?.type === 'folder' && browsePath) {
        const name = browsePath.split('/').pop() || 'Untitled';
        addProject({ name, path: browsePath, color: '#4fa8e0', template: 'blank' });
      } else if (selection?.type === 'project') {
        setCurrentProject(selection.id);
      }
      onClose();
    } catch (err: any) {
      console.error('[OpenProjectModal] Submit failed:', err);
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [
    canSubmit,
    loading,
    mode,
    cloneUrl,
    cloneFolderName,
    cloneDest,
    selection,
    browsePath,
    addProject,
    setCurrentProject,
    onClose,
  ]);

  const handleOpenProjectDirect = (id: string) => {
    setCurrentProject(id);
    onClose();
  };

  const handleRemoveProject = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeProject(id);
    if (selection?.type === 'project' && selection.id === id) setSelection(null);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && mode === 'clone' && !(e.target instanceof HTMLButtonElement)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const actionLabel =
    mode === 'clone'
      ? 'Clone & Open'
      : selection?.type === 'folder'
        ? 'Open Folder'
        : 'Open Project';

  const headerTitle = mode === 'clone' ? 'Clone Repository' : 'Open Project';
  const headerDesc =
    mode === 'clone'
      ? 'Import a project from a remote Git URL'
      : 'Pick a recent project or browse your filesystem';

  const renderTabs = () => (
    <div className="flex items-center p-0.5 rounded-lg bg-sidebar-item-hover border border-border shrink-0">
      {(
        [
          { id: 'local', label: 'Local', icon: FolderOpen },
          { id: 'clone', label: 'Clone', icon: GitBranch },
        ] as const
      ).map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => switchMode(id)}
          className={cn(
            'h-8 px-3 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all',
            mode === id
              ? 'bg-background text-text-primary shadow-sm border border-border'
              : 'text-text-secondary hover:text-text-primary border border-transparent',
          )}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
    </div>
  );

  const renderToolbar = () => (
    <div className="flex items-center gap-2.5 mb-4">
      {renderTabs()}
      {mode === 'local' && (
        <>
          <div className="flex-1 min-w-0 flex items-center gap-2.5 h-10 bg-sidebar-item-hover rounded-lg px-3 border border-border focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15 transition-all">
            <Search className="w-4 h-4 text-text-secondary shrink-0" strokeWidth={1.5} />
            <input
              type="text"
              autoFocus
              spellCheck={false}
              placeholder="Search projects, or paste a Git URL..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="flex-1 min-w-0 bg-transparent outline-none text-text-primary placeholder:text-text-secondary/50 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-text-secondary hover:text-text-primary"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={handleBrowseFolder}
            className="h-10 w-10 rounded-lg text-text-secondary hover:bg-white/[0.05] hover:text-text-primary flex items-center justify-center transition-all border border-border shrink-0"
            title="Browse"
            aria-label="Browse folder"
          >
            <FolderOpen className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );

  const renderRow = (opts: {
    key: string;
    name: string;
    path: string;
    selected: boolean;
    onSelect: () => void;
    onOpen?: () => void;
    onRemove?: (e: React.MouseEvent) => void;
  }) => (
    <div
      key={opts.key}
      role="button"
      tabIndex={0}
      onClick={opts.onSelect}
      onDoubleClick={opts.onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          opts.onSelect();
        }
      }}
      className={cn(
        'group flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all border focus:outline-none focus-visible:border-primary/40',
        opts.selected
          ? 'bg-primary/[0.07] border-primary/30'
          : 'border-transparent hover:bg-white/[0.04] hover:border-border',
      )}
    >
      <div
        className={cn(
          'w-9 h-9 rounded-lg grid place-items-center shrink-0 border transition-colors',
          opts.selected
            ? 'bg-primary/10 border-primary/30 text-primary'
            : 'bg-white/[0.05] border-border text-text-secondary',
        )}
      >
        {opts.selected ? <Check className="w-4 h-4" /> : <FolderOpen className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="font-medium text-sm text-text-primary truncate">{opts.name}</div>
        <small className="block text-[11px] font-mono text-text-secondary/60 truncate" title={opts.path}>
          {shortenPath(opts.path)}
        </small>
      </div>
      {opts.onRemove && (
        <button
          onClick={opts.onRemove}
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 w-7 h-7 rounded-md grid place-items-center text-text-secondary/50 hover:text-error hover:bg-error/10 transition-all shrink-0"
          title="Remove from recent"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );

  const renderLocalList = () => {
    if (recentProjects.length === 0 && !browsePath) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-6 text-center gap-4">
          <div className="w-14 h-14 rounded-2xl border border-dashed border-border grid place-items-center text-text-secondary/40">
            <FolderOpen className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary/90 mb-1">
              {searchQuery ? 'No matching projects' : 'No recent projects yet'}
            </p>
            <p className="text-xs text-text-secondary/60 max-w-[240px] mx-auto leading-relaxed">
              {searchQuery
                ? 'Try a different keyword, or browse for a folder.'
                : 'Browse a folder or clone a repository to get started.'}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        {browsePath && (
          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-secondary/60 mb-2 pl-1 text-left">
              Selected folder
            </h4>
            {renderRow({
              key: 'browse',
              name: browsePath.split('/').pop() || 'Untitled',
              path: browsePath,
              selected: selection?.type === 'folder',
              onSelect: () => setSelection({ type: 'folder' }),
            })}
          </div>
        )}
        {recentProjects.length > 0 && (
          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-secondary/60 mb-2 pl-1 text-left">
              Recent projects
              <span className="ml-2 font-mono text-text-secondary/40">{recentProjects.length}</span>
            </h4>
            <div className="space-y-1">
              {recentProjects.map((proj) =>
                renderRow({
                  key: proj.id,
                  name: proj.name,
                  path: proj.path,
                  selected: selection?.type === 'project' && selection.id === proj.id,
                  onSelect: () => setSelection({ type: 'project', id: proj.id }),
                  onOpen: () => handleOpenProjectDirect(proj.id),
                  onRemove: (e) => handleRemoveProject(e, proj.id),
                }),
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[1080px] h-[680px] p-0 overflow-hidden rounded-2xl border border-border shadow-2xl flex flex-col bg-background"
    >
      <ModalHeader
        title={headerTitle}
        description={headerDesc}
        onClose={onClose}
        className="[&_h3]:text-left [&_p]:text-left px-6 py-4 border-b border-border bg-background"
      />
      <ModalBody className="p-0 flex-1 min-h-0 overflow-hidden bg-background">
        <div
          className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] h-full w-full overflow-hidden"
          onKeyDown={handleKeyDown}
        >
          <div className="flex flex-col min-w-0 h-full overflow-hidden p-5 pb-0">
            {renderToolbar()}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 pb-5">
              {mode === 'local' ? (
                renderLocalList()
              ) : (
                <NewRepositoryForm
                  url={cloneUrl}
                  folderName={cloneFolderName}
                  dest={cloneDest}
                  onUrlChange={handleCloneUrlChange}
                  onFolderNameChange={handleCloneFolderChange}
                  onDestChange={setCloneDest}
                  onBrowseDest={handleBrowseDest}
                />
              )}
            </div>
          </div>
          <div className="h-full border-l border-border bg-card-background/30 overflow-y-auto custom-scrollbar hidden lg:block">
            {mode === 'clone' ? (
              <RecentClones onReuse={handleReuseClone} />
            ) : (
              <ProjectDetailPanel
                target={target}
                stackInfo={target ? stackCache.get(target.path) : undefined}
              />
            )}
          </div>
        </div>
      </ModalBody>
      <ModalFooter className="items-center px-5 py-3.5 bg-sidebar-background/50 border-t border-border">
        <div className="flex-1 mr-auto min-w-0 text-[11.5px]">
          {error ? (
            <span className="flex items-center gap-1.5 text-error truncate" title={error}>
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{error}</span>
            </span>
          ) : (
            <span className="text-text-secondary/60 truncate block">
              {mode === 'local' && 'Double-click a recent project to open it instantly'}
            </span>
          )}
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            className="h-8 px-4 text-xs font-medium rounded-lg bg-transparent border border-border text-text-secondary hover:bg-white/[0.05] hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className={cn(
              'h-8 px-4 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all border-none',
              canSubmit && !loading
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-text-secondary/10 text-text-secondary/50 cursor-not-allowed',
            )}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {actionLabel}
          </button>
        </div>
      </ModalFooter>
    </Modal>
  );
}

export default OpenProjectModal;