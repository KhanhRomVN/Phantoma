import { useState, useEffect, useMemo, useRef } from 'react';
import { Loader2, FolderOpen, GitBranch, Search, Trash2, X } from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';
import { logger } from '@renderer/utils/logger';
import { useCodeStore } from '../../../hooks/useCodeStore';
import { addCloneEntry } from '../../../utils/cloneHistory';
import { detectProjectStack, type StackInfo } from '@renderer/utils/detectStack';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalHeader } from '@renderer/components/ui/Modal/ModalHeader';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';
import { NewRepositoryForm } from './NewRepositoryForm';
import { ProjectDetailPanel } from './ProjectDetailPanel';

const GIT_URL_REGEX = /^(https?:\/\/|git@)\S+/i;

interface OpenProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OpenProjectModal({ isOpen, onClose }: OpenProjectModalProps) {
  const addProject = useCodeStore((s) => s.addProject);
  const setCurrentProject = useCodeStore((s) => s.setCurrentProject);
  const projects = useCodeStore((s) => s.projects);
  const removeProject = useCodeStore((s) => s.removeProject);
  const currentProjectId = useCodeStore((s) => s.currentProjectId); // Get active project ID

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [browsePath, setBrowsePath] = useState('');
  const [subView, setSubView] = useState<'local' | 'clone'>('local');
  const [stackCache, setStackCache] = useState<Map<string, StackInfo>>(new Map());
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isBrowseSelected, setIsBrowseSelected] = useState(false);

  const isCloneMode = useMemo(() => GIT_URL_REGEX.test(searchQuery.trim()), [searchQuery]);

  const canSubmit = useMemo(() => {
    if (isCloneMode) return true;
    return !!browsePath;
  }, [isCloneMode, browsePath]);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setBrowsePath('');
      setSelectedProjectId(null);
      setIsBrowseSelected(false);
      setSubView('local');
    }
  }, [isOpen]);

  const filteredProjects = useMemo(() => {
    let list = [...projects];

    // Exclude the currently active project from recent list to avoid confusion/duplication
    if (currentProjectId) {
      list = list.filter((p) => p.id !== currentProjectId);
    }

    if (searchQuery && subView === 'local') {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.path.toLowerCase().includes(q),
      );
    }
    return list.reverse();
  }, [projects, searchQuery, subView, currentProjectId]);

  // Ref to track paths currently being fetched to prevent duplicate calls during rapid re-renders
  const fetchingPathsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (subView !== 'local') return;

    // Collect all unique paths that might need detection:
    // 1. From the list of recent projects
    // 2. From the manually browsed folder (if any)
    const pathsToCheck = new Set<string>();

    filteredProjects.forEach((p) => pathsToCheck.add(p.path));
    if (browsePath) pathsToCheck.add(browsePath);

    // Filter out those already cached or currently fetching
    const needsDetection = Array.from(pathsToCheck).filter(
      (path) => !stackCache.has(path) && !fetchingPathsRef.current.has(path),
    );

    if (needsDetection.length === 0) return;

    needsDetection.forEach(async (path) => {
      // Determine name for logging purposes
      const projName =
        path === browsePath
          ? browsePath.split('/').pop() || 'Browsed Folder'
          : filteredProjects.find((p) => p.path === path)?.name || 'Unknown';

      // Mark as fetching immediately
      fetchingPathsRef.current.add(path);

      try {
        const info = await detectProjectStack(path);

        // Update cache
        setStackCache((prev) => {
          const next = new Map(prev);
          next.set(path, info);
          return next;
        });
      } catch (err) {
        console.error(`[ERROR OpenProjectModal] Detection failed for "${projName}":`, err);
        // Cache empty result to stop retries
        setStackCache((prev) => {
          const next = new Map(prev);
          next.set(path, { frameworks: [], languages: [], contributors: [], branches: [] });
          return next;
        });
      } finally {
        // Remove from fetching set regardless of success/failure
        fetchingPathsRef.current.delete(path);
      }
    });
  }, [filteredProjects, subView, stackCache, browsePath]); // Added browsePath to deps

  const groupedProjects = useMemo(() => {
    const groups: Record<string, typeof filteredProjects> = {};
    filteredProjects.forEach((proj, idx) => {
      let label = 'Earlier';
      if (idx < 2) label = 'Today';
      else if (idx < 4) label = 'Yesterday';
      else if (idx < 8) label = 'Last Week';
      if (!groups[label]) groups[label] = [];
      groups[label].push(proj);
    });
    return Object.entries(groups).map(([label, items]) => ({ label, items }));
  }, [filteredProjects]);

  const shortenPath = (path: string): string => {
    if (!path) return '';
    const parts = path.split('/').filter(Boolean);
    if (parts.length <= 3) return path;
    const start = parts[0] === 'home' || parts[0] === 'Users' ? '~/' : '';
    const end = parts.slice(-2).join('/');
    return `${start}.../${end}`;
  };

  const handleBrowseFolder = async () => {
    try {
      const result = await window.api.invoke('showOpenDialog', {
        properties: ['openDirectory'],
        title: 'Select Project Folder',
      });
      const isCanceled = result?.canceled === true || result?.success === false;
      if (!isCanceled && result?.filePaths?.[0]) {
        setBrowsePath(result.filePaths[0]);
        setIsBrowseSelected(true);
        setSelectedProjectId(null);
      }
    } catch (err) {
      logger.error('[OpenProjectModal] Browse failed:', err);
    }
  };

  const handleSubmit = async (cloneData?: { url: string; dest: string; folderName: string }) => {
    if (!canSubmit && !cloneData) return;

    setLoading(true);
    try {
      if (cloneData) {
        // Clone flow handled by child component passing data up or triggering here
        await window.api.invoke('git:clone', { url: cloneData.url, dest: cloneData.dest });
        addCloneEntry(cloneData.url, cloneData.folderName, cloneData.dest);
        addProject({
          name: cloneData.folderName,
          path: cloneData.dest,
          color: '#4fa8e0',
          template: 'blank',
        });
      } else if (isCloneMode) {
        // Fallback for direct URL submission from top bar if needed, though NewRepositoryForm usually handles this
        const match = searchQuery.match(/\/([^/]+?)(\.git)?$/);
        const folderName = match ? match[1] : 'repo';
        const destPath = `/home/khanhromvn/projects/${folderName}`;
        await window.api.invoke('git:clone', { url: searchQuery.trim(), dest: destPath });
        addCloneEntry(searchQuery.trim(), folderName, destPath);
        addProject({ name: folderName, path: destPath, color: '#4fa8e0', template: 'blank' });
      } else if (browsePath) {
        const name = browsePath.split('/').pop() || 'Untitled';
        addProject({ name, path: browsePath, color: '#4fa8e0', template: 'blank' });
      } else if (selectedProjectId) {
        setCurrentProject(selectedProjectId);
      }
      onClose();
    } catch (err) {
      logger.error('[OpenProjectModal] Submit failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveProject = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeProject(id);
  };

  const handleSelectProject = (projId: string) => {
    setSelectedProjectId(projId);
    setIsBrowseSelected(false);
  };

  const handleToggleCloneView = () => {
    setSubView((prev) => (prev === 'local' ? 'clone' : 'local'));
    if (subView === 'clone') setSearchQuery('');
  };

  const renderTopBar = () => (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex-1 flex items-center gap-3 bg-sidebar-item-hover rounded-lg px-3 py-2 border border-border focus-within:border-primary/50 transition-colors">
        <Search className="w-4 h-4 text-text-secondary shrink-0" strokeWidth={1.5} />
        <input
          type="text"
          placeholder={
            subView === 'clone'
              ? 'Search repo by name, owner, or paste Git URL...'
              : 'Search local projects...'
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent outline-none text-text-primary placeholder:text-text-secondary/60 text-sm font-mono"
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
      {subView === 'local' && (
        <button
          onClick={handleBrowseFolder}
          title="Add Folder"
          className="h-[38px] px-3 rounded-lg bg-transparent text-text-secondary hover:bg-white/[0.05] hover:text-text-primary flex items-center gap-2 transition-all border border-border/50 shrink-0"
        >
          <FolderOpen className="w-4 h-4" />
          <span className="text-xs font-medium">Add Folder</span>
        </button>
      )}
      <button
        onClick={handleToggleCloneView}
        className={cn(
          'h-[38px] px-3 rounded-lg text-xs font-medium border transition-all flex items-center gap-2 shrink-0',
          subView === 'clone'
            ? 'bg-primary/10 border-primary/30 text-primary'
            : 'bg-sidebar-item-hover border-border text-text-secondary hover:text-text-primary hover:bg-sidebar-item-active',
        )}
      >
        <GitBranch className="w-3.5 h-3.5" />
        <span>{subView === 'clone' ? 'Exit Clone' : 'Clone Repo'}</span>
      </button>
    </div>
  );

  const renderLocalList = () => {
    if (groupedProjects.length === 0 && !browsePath) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-6 text-center gap-3 opacity-70">
          <div className="w-12 h-12 rounded-xl bg-card-hover border border-border grid place-items-center text-text-secondary">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary mb-1">No local projects found</p>
            <p className="text-xs text-text-secondary max-w-[200px] mx-auto leading-relaxed">
              Create or open a project to get started.
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-6">
        {browsePath && subView === 'local' && (
          <div className="mb-4">
            <h4 className="text-[10px] font-mono uppercase tracking-widest text-text-secondary/70 mb-2 pl-1 text-left">
              Select Folder
            </h4>
            <div
              onClick={() => {
                setIsBrowseSelected(true);
                setSelectedProjectId(null);
              }}
              className={cn(
                'group flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all',
                isBrowseSelected
                  ? 'bg-text-secondary/10'
                  : 'bg-text-secondary/5 hover:bg-text-secondary/10',
              )}
            >
              <div className="w-8 h-8 rounded-md grid place-items-center shrink-0 bg-white/[0.05] border border-border overflow-hidden">
                <FolderOpen className="w-4 h-4 text-text-secondary" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="font-medium text-sm text-text-primary truncate">
                  {browsePath.split('/').pop()}
                </div>
                <small className="block text-[11px] font-mono text-text-secondary/60 truncate">
                  {shortenPath(browsePath)}
                </small>
              </div>
              <div className="h-[60%] w-[1px] bg-border shrink-0 mx-1" />
            </div>
          </div>
        )}
        {groupedProjects.map((group) => (
          <div key={group.label}>
            <h4 className="text-xs font-medium uppercase tracking-wide text-text-secondary/60 mb-2 pl-0">
              {group.label}
            </h4>
            <div className="space-y-1">
              {group.items.map((proj) => {
                const isSelected = selectedProjectId === proj.id;
                return (
                  <div
                    key={`${group.label}-${proj.id}`}
                    onClick={() => handleSelectProject(proj.id)}
                    className={cn(
                      'group flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all border',
                      isSelected
                        ? 'bg-white/[0.06] border-border shadow-sm'
                        : 'border-transparent hover:bg-white/[0.03] hover:border-border',
                    )}
                  >
                    <div className="w-8 h-8 rounded-md grid place-items-center shrink-0 bg-white/[0.05] border border-border overflow-hidden">
                      <FolderOpen className="w-4 h-4 text-text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-medium text-sm text-text-primary truncate">
                        {proj.name}
                      </div>
                      <small className="block text-[11px] font-mono text-text-secondary/60 truncate">
                        {shortenPath(proj.path)}
                      </small>
                    </div>
                    <button
                      onClick={(e) => handleRemoveProject(e, proj.id)}
                      className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded grid place-items-center text-text-secondary/40 hover:text-error hover:bg-error/10 transition-all shrink-0"
                      title="Remove from recent"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const headerTitle = isCloneMode
    ? 'Clone Repository'
    : browsePath
      ? 'Open Local Folder'
      : 'Open Project';
  const headerDesc = isCloneMode
    ? 'Import a project from a remote Git URL'
    : browsePath
      ? 'Ready to open selected directory'
      : 'Recent projects or browse local filesystem';
  const actionLabel = isCloneMode ? 'Clone & Open' : browsePath ? 'Open Folder' : 'Open Project';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[1200px] h-[780px] p-0 overflow-hidden rounded-xl border border-border shadow-2xl flex flex-col bg-background"
    >
      <ModalHeader
        title={headerTitle}
        description={headerDesc}
        onClose={onClose}
        className="[&_h3]:text-left [&_p]:text-left px-6 py-4 border-b border-border bg-background"
      />
      <ModalBody className="p-0 flex-1 overflow-hidden bg-background">
        <div className="grid grid-cols-[1fr_400px] h-full w-full overflow-hidden bg-background">
          <div className="flex flex-col min-w-0 h-full overflow-hidden p-5 pb-0">
            {renderTopBar()}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 pb-5">
              {subView === 'local' ? (
                renderLocalList()
              ) : (
                <NewRepositoryForm searchQuery={searchQuery} onCloneSuccess={handleSubmit} />
              )}
            </div>
          </div>
          <div className="h-full border-l border-border bg-card-background/30 overflow-y-auto custom-scrollbar hidden lg:block">
            <ProjectDetailPanel
              selectedProjectId={selectedProjectId}
              browsePath={browsePath}
              stackCache={stackCache}
              projects={projects}
              onSubmit={handleSubmit}
              onClose={onClose}
            />
          </div>
        </div>
      </ModalBody>
      <ModalFooter className="justify-end px-5 py-4 bg-sidebar-background/50 border-t border-border">
        <div className="flex-1 mr-auto text-[11.5px] text-text-secondary/60 flex items-center gap-3 min-w-0">
          {isCloneMode && (
            <span>Supports HTTPS and SSH · credentials use your system keychain</span>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="h-[30px] px-3.5 text-xs font-medium rounded-md bg-transparent border border-border text-text-secondary hover:bg-white/[0.05] hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSubmit()}
            disabled={!canSubmit || loading}
            className={cn(
              'h-[30px] px-3.5 text-xs font-semibold rounded-md flex items-center gap-2 transition-all border-none',
              canSubmit && !loading
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-text-secondary/10 text-text-secondary/50 cursor-not-allowed',
            )}
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            {actionLabel}
          </button>
        </div>
      </ModalFooter>
    </Modal>
  );
}

export default OpenProjectModal;
