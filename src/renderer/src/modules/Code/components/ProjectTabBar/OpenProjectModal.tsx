import { useState, useEffect, useCallback } from 'react';
import { FolderOpen, Search, X, ArrowUp, ArrowDown, CornerDownLeft } from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@renderer/components/ui/Modal';
import { Kbd } from '@renderer/components/ui/Kbd';
import { useCodeStore, type FileNode } from '../../hooks/useCodeStore';
import { cn } from '@renderer/shared/utils/cn';

// ─── Types ──────────────────────────────────────────────────────────────────
const TYPE_META: Record<string, { label: string; color: string }> = {
  web: { label: 'Web App', color: '#5eb3ff' },
  api: { label: 'API Service', color: '#3ecf8e' },
  cli: { label: 'CLI Tool', color: '#ff9d5c' },
  lib: { label: 'Library', color: '#c792ea' },
  mobile: { label: 'Mobile App', color: '#ff6b9d' },
  empty: { label: 'Empty', color: '#7d8394' },
};

interface RecentProject {
  name: string;
  path: string;
  type: string;
  openedAt: number;
  running: boolean;
}

interface DirEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  mtime: number;
}

const STORAGE_KEY = 'recent-projects';
const MAX_SCAN_DEPTH = 5;

// ─── Helpers ────────────────────────────────────────────────────────────────
const getRecentProjects = (): RecentProject[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveRecentProjects = (projects: RecentProject[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
};

const addRecentProject = (project: Omit<RecentProject, 'openedAt' | 'running'>) => {
  const projects = getRecentProjects().filter((p) => p.path !== project.path);
  projects.unshift({ ...project, openedAt: Date.now(), running: false });
  saveRecentProjects(projects.slice(0, 20));
};

const timeAgo = (ts: number): string => {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

// ─── Directory Scanner ──────────────────────────────────────────────────────
let fileIdCounter = 0;

const dirEntryToFileNode = (entry: DirEntry): FileNode => ({
  id: `fs_${++fileIdCounter}`,
  name: entry.name,
  type: entry.isDirectory ? 'folder' : 'file',
  path: entry.path,
  children: entry.isDirectory ? [] : undefined,
});

export const scanDirectory = async (dirPath: string, depth: number = 0): Promise<FileNode[]> => {
  if (depth >= MAX_SCAN_DEPTH) return [];

  try {
    const entries: DirEntry[] = await window.api.invoke('fs:list-dir', dirPath);
    if (!entries || !Array.isArray(entries)) return [];

    const sorted = entries
      .filter((e) => !e.name.startsWith('.') && e.name !== 'node_modules')
      .sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

    const nodes: FileNode[] = [];
    for (const entry of sorted) {
      const node = dirEntryToFileNode(entry);
      if (entry.isDirectory) {
        node.children = await scanDirectory(entry.path, depth + 1);
      }
      nodes.push(node);
    }
    return nodes;
  } catch {
    return [];
  }
};

// ─── Component ──────────────────────────────────────────────────────────────
interface OpenProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OpenProjectModal({ isOpen, onClose }: OpenProjectModalProps) {
  const { addProject, setCurrentProject, setProjectFiles } = useCodeStore();
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRecentProjects(getRecentProjects());
      setSearch('');
      setActiveIndex(0);
    }
  }, [isOpen]);

  const filtered = recentProjects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.path.toLowerCase().includes(search.toLowerCase()),
  );

  const safeActiveIndex = Math.min(activeIndex, Math.max(0, filtered.length - 1));

  const openFolderInIDE = useCallback(
    async (folderPath: string, folderName: string) => {
      setLoading(true);
      try {
        addProject({ name: folderName, path: folderPath, color: '#5eb3ff', template: 'empty' });
        const state = useCodeStore.getState();
        const newProject = state.projects[state.projects.length - 1];
        if (newProject) {
          setCurrentProject(newProject.id);
          const files = await scanDirectory(folderPath);
          setProjectFiles(newProject.id, files);
        }
      } finally {
        setLoading(false);
        onClose();
      }
    },
    [addProject, setCurrentProject, setProjectFiles, onClose],
  );

  const handleOpen = useCallback(
    (project: RecentProject) => {
      addRecentProject({ name: project.name, path: project.path, type: project.type });
      openFolderInIDE(project.path, project.name);
    },
    [openFolderInIDE],
  );

  const handleBrowse = useCallback(async () => {
    try {
      const result = await window.api.invoke('selectFolder');
      if (result && result.success && result.folderPath) {
        const segments = result.folderPath.replace(/\\/g, '/').split('/').filter(Boolean);
        const name = segments[segments.length - 1] || result.folderPath;
        addRecentProject({ name, path: result.folderPath, type: 'empty' });
        openFolderInIDE(result.folderPath, name);
      }
    } catch {
      // user cancelled
    }
  }, [openFolderInIDE]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const p = filtered[safeActiveIndex];
      if (p) handleOpen(p);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg">
      <ModalHeader
        title="Open Project"
        description="Open a recent project or browse for a folder"
        onClose={onClose}
      />

      <div className="flex items-center gap-2.5 px-5 py-2.5 border-b border-border shrink-0">
        <span className="font-mono text-sm text-accent select-none shrink-0">›</span>
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search recent projects by name or path…"
          className="flex-1 bg-transparent border-none outline-none text-sm text-text-primary font-mono placeholder:text-text-secondary/40"
          autoFocus
        />
        {search && (
          <button
            onClick={() => {
              setSearch('');
              setActiveIndex(0);
            }}
            className="p-0.5 rounded text-text-secondary/40 hover:text-text-secondary"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <ModalBody className="!p-1.5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 text-text-secondary/40 gap-2">
            <span className="text-sm">Opening project…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-text-secondary/40 gap-2">
            <Search className="w-7 h-7 opacity-50" strokeWidth={1.3} />
            <span className="text-sm">
              {search ? 'No matching projects found' : 'No recent projects'}
            </span>
          </div>
        ) : (
          filtered.map((p, i) => {
            const meta = TYPE_META[p.type] || TYPE_META.empty;
            const isActive = i === safeActiveIndex;
            return (
              <div
                key={p.path}
                className={cn(
                  'flex items-center gap-3 px-2.5 py-2 rounded-lg cursor-pointer transition-colors group',
                  isActive ? 'bg-sidebar-item-hover' : 'hover:bg-sidebar-item-hover/50',
                )}
                onClick={() => handleOpen(p)}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: meta.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium text-text-primary truncate">
                      {p.name}
                    </span>
                    {p.running && (
                      <span className="flex items-center gap-1 text-[10px] text-success bg-success/10 px-1.5 py-0.5 rounded-full font-mono shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-success" />
                        Running
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-text-secondary/50 font-mono truncate mt-0.5">
                    {p.path}
                  </p>
                </div>
                <span className="text-[11px] text-text-secondary/40 shrink-0 hidden group-hover:hidden sm:block">
                  {p.running ? '' : timeAgo(p.openedAt)}
                </span>
              </div>
            );
          })
        )}
      </ModalBody>

      <ModalFooter className="px-4 py-3 border-t border-border flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="flex items-center justify-center bg-sidebar-item-hover/70 rounded p-1">
              <Kbd>
                <ArrowUp className="w-3 h-3" strokeWidth={1.5} />
                <ArrowDown className="w-3 h-3" strokeWidth={1.5} />
              </Kbd>
            </div>
            <span className="text-text-primary">Navigate</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex items-center justify-center bg-sidebar-item-hover/70 rounded p-1">
              <Kbd>
                <CornerDownLeft className="w-3 h-3" strokeWidth={1.5} />
              </Kbd>
            </div>
            <span className="text-text-primary">Open</span>
          </div>
          <div className="flex items-center gap-1">
            <Kbd>ESC</Kbd>
            <span className="text-text-primary">Close</span>
          </div>
        </div>
        <button
          onClick={handleBrowse}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-sidebar-item-hover border border-border text-sm font-medium text-text-secondary hover:bg-sidebar-item-hover/80 transition-colors disabled:opacity-40"
        >
          <FolderOpen className="w-4 h-4 text-accent" strokeWidth={1.3} />
          Browse…
        </button>
      </ModalFooter>
    </Modal>
  );
}

export default OpenProjectModal;
