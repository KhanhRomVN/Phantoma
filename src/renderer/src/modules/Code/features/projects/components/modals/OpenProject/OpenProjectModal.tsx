// ─── Imports ─────────────────────────────────────────────────────────────────
// ── React ──
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// ── UI ──
import {
  FolderOpen,
  GitBranch,
  Trash2,
  Loader2,
  Search,
  X,
  AlertCircle,
  Sparkles,
  FolderGit2,
} from 'lucide-react';
import { Button } from '@renderer/components/ui/Button';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalHeader } from '@renderer/components/ui/Modal/ModalHeader';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';

// ── Components ──
import { ProjectLogoImage } from '../../ProjectLogo';
import { DuplicateRepoModal, type DuplicateRepoKind } from '../DuplicateRepoModal';
import { NewRepositoryForm } from './NewRepositoryForm';
import { LanguageBadgeIcon } from './LanguageBadgeIcon';
import { SectionTitle, EmptyState, ProjectDetailPanel } from './ProjectDetailPanel';

// ── Services ──
import { dialogIpc } from '../../../../../shared/ipc/dialog.ipc';
import { codeApi } from '../../../../../shared/api/code.api';

// ── Stores ──
import { useCodeStore } from '../../../../../shared/stores/code.store';

// ── Utils ──
import { cn } from '@renderer/utils/cn';
import {
  detectProjectStack,
  detectRemoteLogos,
  detectRemoteStack,
  type StackInfo,
} from '../../../utils/detect-stack.util';
import { TONE_SOFT, TONE_BAR } from '../../../constants/open-project.constants';
import { hashTone, GIT_URL_REGEX, deriveFolderName } from '../../../utils/open-project.util';

// ── Types ──
import {
  LogoCandidate,
  Mode,
  Selection,
  OpenProjectModalProps,
} from '../../../types/open-project.types';

// ─── Constants ───────────────────────────────────────────────────────────────
const DEFAULT_CLONE_DEST = '';

// ─── Component ───────────────────────────────────────────────────────────────
export function OpenProjectModal({ isOpen, onClose, onProjectAdded }: OpenProjectModalProps) {
  // ── Store ──
  const addProject = useCodeStore((s) => s.addProject);
  const setCurrentProject = useCodeStore((s) => s.setCurrentProject);
  const projects = useCodeStore((s) => s.projects);
  const removeProject = useCodeStore((s) => s.removeProject);
  const currentProjectId = useCodeStore((s) => s.currentProjectId);

  // ── State ──
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

  // ── Refs ──
  const fetchingPathsRef = useRef<Set<string>>(new Set());
  const scanningLogoRef = useRef<Set<string>>(new Set());

  // ── Store ──
  const updateProject = useCodeStore((s) => s.updateProject);

  // ── State ──
  const [logoScan, setLogoScan] = useState<Record<string, LogoCandidate[]>>({});
  const [logoChoice, setLogoChoice] = useState<Record<string, string | null>>({});
  const [remoteStack, setRemoteStack] = useState<Record<string, StackInfo>>({});
  const [cloneBranch, setCloneBranch] = useState('');

  // ── Derived ──
  const remoteBranches = remoteStack[cloneUrl.trim()]?.branches ?? [];
  const effectiveBranch =
    cloneBranch || (remoteBranches.find((b) => b.isCurrent)?.name ?? remoteBranches[0]?.name ?? '');

  // ── State ──
  const [remoteLogos, setRemoteLogos] = useState<Record<string, LogoCandidate[]>>({});
  const [cloneLogo, setCloneLogo] = useState<string | null>(null);
  const [destEntries, setDestEntries] = useState<string[] | null>(null);

  // ── Effects ──
  useEffect(() => {
    const url = cloneUrl.trim();
    if (mode !== 'clone' || !GIT_URL_REGEX.test(url) || remoteLogos[url]) return;
    const timer = setTimeout(() => {
      detectRemoteLogos(url)
        .then((list) => setRemoteLogos((prev) => ({ ...prev, [url]: list })))
        .catch(() => setRemoteLogos((prev) => ({ ...prev, [url]: [] })));
    }, 500);
    return () => clearTimeout(timer);
  }, [mode, cloneUrl, remoteLogos]);

  useEffect(() => {
    const dir = cloneDest.trim();
    if (mode !== 'clone' || !dir) {
      setDestEntries(null);
      return;
    }
    let cancelled = false;
    codeApi.fs
      .listDir(dir)
      .then((res) => {
        if (!cancelled) setDestEntries(Array.isArray(res) ? res.map((f: any) => f.name || f) : null);
      })
      .catch(() => {
        if (!cancelled) setDestEntries(null);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, cloneDest]);

  // ── Derived ──
  const cloneLogoCandidates = remoteLogos[cloneUrl.trim()] ?? [];
  const effectiveCloneLogo = cloneLogoCandidates.some((c) => c.path === cloneLogo) ? cloneLogo : null;
  const finalCloneDest = `${cloneDest.trim().replace(/\/+$/, '')}/${cloneFolderName.trim()}`;
  const folderConflict: 'exists' | 'added' | null =
    cloneFolderName.trim() && destEntries?.includes(cloneFolderName.trim())
      ? 'exists'
      : cloneFolderName.trim() && cloneDest.trim() && projects.some((p) => p.path === finalCloneDest)
        ? 'added'
        : null;
  const suggestedFolderName = (() => {
    if (!folderConflict) return '';
    const base = cloneFolderName.trim();
    let i = 2;
    while (destEntries?.includes(`${base}-${i}`)) i++;
    return `${base}-${i}`;
  })();

  // ── Effects ──
  useEffect(() => {
    const url = cloneUrl.trim();
    if (mode !== 'clone' || !GIT_URL_REGEX.test(url) || remoteStack[url]) return;
    const timer = setTimeout(() => {
      detectRemoteStack(url)
        .then((info) => setRemoteStack((prev) => ({ ...prev, [url]: info })))
        .catch(() =>
          setRemoteStack((prev) => ({
            ...prev,
            [url]: { frameworks: [], languages: [], contributors: [], branches: [] },
          })),
        );
    }, 500);
    return () => clearTimeout(timer);
  }, [mode, cloneUrl, remoteStack]);

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
    setLogoScan({});
    setLogoChoice({});
  }, [isOpen]);

  // ── Derived ──
  const recentProjects = useMemo(() => {
    // ASSUMED: project đang hiển thị trên ProjectPanel (không hidden) thì ẩn khỏi danh sách recent
    let list = projects.filter((p) => !!(p as any).hidden && p.id !== currentProjectId);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.path.toLowerCase().includes(q),
      );
    }
    return [...list].reverse();
  }, [projects, searchQuery, currentProjectId]);

  // ASSUMED: project đã link vào project khác bị xóa khỏi store, nên gợi ý lại từ path của branch đã link
  const linkedRecent = useMemo(() => {
    const known = new Set(projects.map((p) => p.path));
    const q = searchQuery.trim().toLowerCase();
    const out: { key: string; name: string; path: string }[] = [];
    for (const p of projects) {
      for (const b of p.branches ?? []) {
        if (!b.path || known.has(b.path) || out.some((o) => o.path === b.path)) continue;
        const name = b.path.split('/').pop() || b.name;
        if (q && !name.toLowerCase().includes(q) && !b.path.toLowerCase().includes(q)) continue;
        out.push({ key: `${p.id}::${b.name}`, name, path: b.path });
      }
    }
    return out.reverse();
  }, [projects, searchQuery]);

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

  // ── Effects ──
  useEffect(() => {
    const paths = [target?.path, browsePath, ...recentProjects.map((p) => p.path)].filter(
      (p): p is string => !!p,
    );
    paths.forEach((path) => {
      if (stackCache.has(path) || fetchingPathsRef.current.has(path)) return;

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
    });
  }, [target?.path, browsePath, recentProjects, stackCache]);

  useEffect(() => {
    const p = target?.path;
    if (!p || logoScan[p] || scanningLogoRef.current.has(p)) return;
    scanningLogoRef.current.add(p);
    codeApi.fs
      .scanSquareImages(p)
      .then((res) => setLogoScan((prev) => ({ ...prev, [p]: Array.isArray(res) ? res : [] })))
      .catch(() => setLogoScan((prev) => ({ ...prev, [p]: [] })))
      .finally(() => scanningLogoRef.current.delete(p));
  }, [target?.path, logoScan]);

  // ── Derived ──
  const cloneUrlValid = GIT_URL_REGEX.test(cloneUrl.trim());
  const cloneFolderValid = cloneFolderName.trim().length > 0 && !/[\\/]/.test(cloneFolderName);
  const canSubmit =
    mode === 'clone'
      ? cloneUrlValid && cloneFolderValid && cloneDest.trim().length > 0 && !folderConflict
      : selection !== null && target !== null;

  // ── Handlers ──
  const handleSearchChange = (value: string) => {
    if (GIT_URL_REGEX.test(value.trim())) {
      setMode('clone');
      setCloneUrl(value.trim());
      setCloneBranch('');
      setCloneFolderName(deriveFolderName(value));
      setFolderNameEdited(false);
      setSearchQuery('');
      return;
    }
    setSearchQuery(value);
  };

  const handleCloneUrlChange = (value: string) => {
    setCloneUrl(value);
    setCloneBranch('');
    if (!folderNameEdited) setCloneFolderName(deriveFolderName(value));
  };

  const handleCloneFolderChange = (value: string) => {
    setCloneFolderName(value);
    setFolderNameEdited(true);
  };

  // ── Derived ──
  const pickDirectory = async (_title: string): Promise<string | null> => {
    try {
      const result = await dialogIpc.selectPaths({ kind: 'folder' });
      return result?.success && result.paths?.[0] ? result.paths[0] : null;
    } catch (err) {
      console.error('[OpenProjectModal] Browse failed:', err);
      return null;
    }
  };

  // ── Handlers ──
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


  // ── State ──
  const [pendingDup, setPendingDup] = useState<{
    kind: DuplicateRepoKind;
    existingId: string;
    existingName: string;
    existingBranch: string;
    newBranch: string;
    defaultLinkName: string;
    repositoryUrl: string;
  } | null>(null);

  // ── Derived ──
  const repoNameFromUrl = (url: string) =>
    url
      .replace(/\/+$/, '')
      .replace(/\.git$/, '')
      .split(/[/:]/)
      .pop() || '';

  const findSameRepoProject = async (path: string, name: string) => {
    const self = await codeApi.git.repoIdentity(path);
    if (!self) return null;
    for (const p of projects) {
      if (p.path === path || p.name.toLowerCase() !== name.toLowerCase()) continue;
      const other = await codeApi.git.repoIdentity(p.path);
      if (!other) continue;
      const same =
        other.commonDir === self.commonDir ||
        (!!self.remoteUrl && other.remoteUrl === self.remoteUrl);
      if (same) return { project: p, self, other };
    }
    return null;
  };

  const addFolderProject = (
    path: string,
    linkName?: string,
    existingId?: string,
    repositoryUrl?: string,
  ) => {
    const name = path.split('/').pop() || 'Untitled';
    const newId = addProject({
      name,
      path,
      color: '#4fa8e0',
      template: 'blank',
      logoPath: logoChoice[path] ?? null,
      repositoryUrl: repositoryUrl || null,
    });
    if (linkName && existingId) {
      updateProject(newId, { repoLinkName: linkName } as any);
      updateProject(existingId, { repoLinkName: linkName } as any);
    }
    onProjectAdded?.(newId);
  };

  // ── Handlers ──
  const handleDupConfirm = (linkName: string) => {
    if (!pendingDup || !browsePath) return;
    const isLink = pendingDup.kind === 'different-branch';
    addFolderProject(
      browsePath,
      isLink ? linkName : undefined,
      pendingDup.existingId,
      pendingDup.repositoryUrl,
    );
    setPendingDup(null);
    onClose();
  };

  // ── Callbacks ──
  const handleSubmit = useCallback(async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError('');
    try {
      if (mode === 'clone') {
        const url = cloneUrl.trim();
        const folderName = cloneFolderName.trim();
        const dest = `${cloneDest.trim().replace(/\/+$/, '')}/${folderName}`;
        await codeApi.git.clone(url, dest, effectiveBranch || undefined);

        const newId = addProject({
          name: folderName,
          path: dest,
          color: '#4fa8e0',
          template: 'blank',
          logoPath: effectiveCloneLogo ? `${dest}/${effectiveCloneLogo}` : null,
          repositoryUrl: url,
        });
        onProjectAdded?.(newId);
      } else if (selection?.type === 'folder' && browsePath) {
        // ASSUMED: chỉ xét trùng repo khi tên project (basename folder) trùng với project đã thêm
        const name = browsePath.split('/').pop() || 'Untitled';
        const dup = await findSameRepoProject(browsePath, name);
        if (dup) {
          setPendingDup({
            kind: dup.self.branch === dup.other.branch ? 'same-branch' : 'different-branch',
            existingId: dup.project.id,
            existingName: dup.project.name,
            existingBranch: dup.other.branch,
            newBranch: dup.self.branch,
            defaultLinkName: repoNameFromUrl(dup.self.remoteUrl) || dup.project.name,
            repositoryUrl: dup.self.remoteUrl || '',
          });
          return;
        }
        const identity = await codeApi.git.repoIdentity(browsePath);
        addFolderProject(browsePath, undefined, undefined, identity?.remoteUrl || '');
      } else if (selection?.type === 'project') {
        setCurrentProject(selection.id);
        onProjectAdded?.(selection.id);
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
    effectiveBranch,
    effectiveCloneLogo,
    logoChoice,
    projects,
    addProject,
    updateProject,
    setCurrentProject,
    onClose,
  ]);

  // ── Handlers ──
  const handleOpenProjectDirect = (id: string) => {
    setCurrentProject(id);
    onClose();
  };

  const handleRemoveProject = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeProject(id);
    if (selection?.type === 'project' && selection.id === id) setSelection(null);
  };

  // ── Derived ──
  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
  };

  // ── Handlers ──
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && mode === 'clone' && !(e.target instanceof HTMLButtonElement)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // ── Derived ──
  const actionLabel = mode === 'clone' ? 'Clone Project' : 'Open Select Project';

  const headerTitle = mode === 'clone' ? 'Clone Repository' : 'Open Project';
  const headerDesc =
    mode === 'clone'
      ? 'Import a project from a remote Git URL'
      : 'Pick a recent project or browse your filesystem';

  const renderTabs = () => (
    <div
      role="tablist"
      className="relative grid grid-cols-2 items-center h-9 p-0.5 rounded-lg bg-input-background shrink-0 w-[184px]"
    >
      <span
        aria-hidden
        className={cn(
          'absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%-2px)] rounded-md bg-gradient-to-br from-primary/20 to-purple/15 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
          mode === 'clone' && 'translate-x-full',
        )}
      />
      {(
        [
          { id: 'local', label: 'Local', icon: FolderOpen },
          { id: 'clone', label: 'Clone', icon: GitBranch },
        ] as const
      ).map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          role="tab"
          aria-selected={mode === id}
          onClick={() => switchMode(id)}
          className={cn(
            'relative z-10 h-8 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 outline-none focus:outline-none transition-colors',
            mode === id ? 'text-primary' : 'text-text-secondary hover:text-text-primary',
          )}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
    </div>
  );

  const renderToolbar = () => (
    <div className="flex items-center gap-2 mb-4">
      {renderTabs()}
      {mode === 'local' && (
        <>
          <div className="flex-1 min-w-0 flex items-center gap-2.5 h-9 bg-input-background rounded-lg px-3 border border-transparent focus-within:border-primary/40 transition-colors">
            <Search className="w-4 h-4 text-text-secondary shrink-0" strokeWidth={1.5} />
            <input
              type="text"
              autoFocus
              spellCheck={false}
              placeholder="Search projects, or paste a Git URL..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="flex-1 min-w-0 bg-transparent outline-none text-text-primary placeholder:text-text-secondary text-sm"
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
            className="h-9 w-9 rounded-lg bg-teal/10 text-teal hover:bg-teal/20 active:bg-teal/30 flex items-center justify-center transition-colors outline-none focus:outline-none shrink-0"
            title="Browse"
            aria-label="Browse folder"
          >
            <FolderOpen className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );

  const logoCandidates = target ? (logoScan[target.path] ?? []) : [];
  const targetProject = target ? projects.find((p) => p.path === target.path) : undefined;
  const logoCurrent = target
    ? targetProject
      ? (targetProject.logoPath ?? null)
      : (logoChoice[target.path] ?? null)
    : null;

  // ── Handlers ──
  const handleLogoPick = (filePath: string | null) => {
    if (!target) return;
    if (targetProject) updateProject(targetProject.id, { logoPath: filePath });
    else setLogoChoice((prev) => ({ ...prev, [target.path]: filePath }));
  };

  // ── Derived ──
  const getLogoPath = (path: string): string | null => {
    const proj = projects.find((p) => p.path === path);
    return proj ? (proj.logoPath ?? null) : (logoChoice[path] ?? null);
  };

  const renderRow = (opts: {
    key: string;
    name: string;
    path: string;
    selected: boolean;
    stack?: StackInfo;
    logoPath?: string | null;
    logoSrc?: string;
    onSelect: () => void;
    onOpen?: () => void;
    onRemove?: (e: React.MouseEvent) => void;
  }) => {
    const tone = hashTone(opts.name);
    return (
      <div
        key={opts.key}
        role="button"
        tabIndex={0}
        style={{ outline: 'none', boxShadow: 'none' }}
        onClick={opts.onSelect}
        onDoubleClick={opts.onOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            opts.onSelect();
          }
        }}
        className={cn(
          'group flex items-center gap-3 px-2.5 py-2 cursor-pointer transition-colors border-l-2 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:shadow-none',
          opts.selected
            ? cn('rounded-l-none rounded-r-lg bg-white/[0.06]', TONE_BAR[tone])
            : 'rounded-lg border-l-transparent hover:bg-white/[0.04]',
        )}
      >
        <div
          className={cn(
            'w-9 h-9 rounded-lg grid place-items-center shrink-0 overflow-hidden transition-colors',
            opts.selected ? TONE_SOFT[tone] : 'bg-white/[0.05] text-text-secondary',
          )}
        >
          {opts.logoSrc ? (
            <img src={opts.logoSrc} alt="" className="w-full h-full object-contain" draggable={false} />
          ) : opts.logoPath ? (
            <ProjectLogoImage path={opts.logoPath} side={64} className="w-full h-full object-contain" />
          ) : (
            <LanguageBadgeIcon stack={opts.stack} />
          )}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="font-medium text-[13px] text-text-primary truncate">{opts.name}</div>
          <small className="block text-[11px] font-mono text-text-secondary truncate" title={opts.path}>
            {opts.path}
          </small>
        </div>
        {opts.onRemove && (
          <button
            onClick={opts.onRemove}
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 w-7 h-7 rounded-md grid place-items-center text-text-secondary hover:text-error hover:bg-error/10 transition-all shrink-0"
            title="Remove from recent"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  };

  const renderLocalList = () => {
    if (recentProjects.length === 0 && linkedRecent.length === 0 && !browsePath) {
      return (
        <EmptyState
          icon={<FolderGit2 className="w-6 h-6" strokeWidth={1.5} />}
          title={searchQuery ? 'No matching projects' : 'No recent projects yet'}
          description={
            searchQuery
              ? 'Try a different keyword, or browse for a folder.'
              : 'Browse a folder or clone a repository to get started.'
          }
          tone="blue"
        />
      );
    }

    return (
      <div className="space-y-5">
        {browsePath && (
          <div>
            <SectionTitle tone="teal">Selected folder</SectionTitle>
            {renderRow({
              key: 'browse',
              name: browsePath.split('/').pop() || 'Untitled',
              path: browsePath,
              selected: selection?.type === 'folder',
              stack: stackCache.get(browsePath),
              logoPath: getLogoPath(browsePath),
              onSelect: () => setSelection({ type: 'folder' }),
            })}
          </div>
        )}
        {recentProjects.length > 0 && (
          <div>
            <SectionTitle tone="blue" count={recentProjects.length}>
              Recent projects
            </SectionTitle>
            <div className="space-y-0.5">
              {recentProjects.map((proj) =>
                renderRow({
                  key: proj.id,
                  name: proj.name,
                  path: proj.path,
                  selected: selection?.type === 'project' && selection.id === proj.id,
                  stack: stackCache.get(proj.path),
                  logoPath: getLogoPath(proj.path),
                  onSelect: () => setSelection({ type: 'project', id: proj.id }),
                  onOpen: () => handleOpenProjectDirect(proj.id),
                  onRemove: (e) => handleRemoveProject(e, proj.id),
                }),
              )}
            </div>
          </div>
        )}
        {linkedRecent.length > 0 && (
          <div>
            <SectionTitle tone="purple" count={linkedRecent.length}>
              Linked folders
            </SectionTitle>
            <div className="space-y-0.5">
              {linkedRecent.map((l) =>
                renderRow({
                  key: l.key,
                  name: l.name,
                  path: l.path,
                  selected: selection?.type === 'folder' && browsePath === l.path,
                  stack: stackCache.get(l.path),
                  logoPath: getLogoPath(l.path),
                  onSelect: () => {
                    setBrowsePath(l.path);
                    setSelection({ type: 'folder' });
                  },
                }),
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Render ──
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[980px] h-[680px] p-0 overflow-hidden rounded-2xl border border-border shadow-2xl flex flex-col bg-background"
    >
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-purple/5 to-transparent pointer-events-none" />
        <ModalHeader
          title={headerTitle}
          description={headerDesc}
          onClose={onClose}
          className="relative [&_h3]:text-left [&_p]:text-left px-5 py-3.5 border-b border-border bg-transparent"
        />
      </div>
      <ModalBody className="p-0 flex-1 min-h-0 overflow-hidden bg-background">
        <div
          className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] h-full w-full overflow-hidden"
          onKeyDown={handleKeyDown}
        >
          <div className="flex flex-col min-w-0 h-full overflow-hidden p-4 pb-0">
            {renderToolbar()}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 pb-4">
              {mode === 'local' ? (
                renderLocalList()
              ) : (
                <>
                  <NewRepositoryForm
                    url={cloneUrl}
                    folderName={cloneFolderName}
                    dest={cloneDest}
                    onUrlChange={handleCloneUrlChange}
                    onFolderNameChange={handleCloneFolderChange}
                    onDestChange={setCloneDest}
                    onBrowseDest={handleBrowseDest}
                    folderConflict={folderConflict}
                    suggestedName={suggestedFolderName}
                  />
                  {cloneUrlValid && cloneFolderName.trim() && (
                    <div className="mt-5">
                      <SectionTitle tone="teal">Repository</SectionTitle>
                      {renderRow({
                        key: 'clone-preview',
                        name: cloneFolderName.trim(),
                        path: `${cloneDest.trim().replace(/\/+$/, '')}/${cloneFolderName.trim()}`,
                        selected: true,
                        stack: remoteStack[cloneUrl.trim()],
                        logoPath: null,
                        logoSrc: cloneLogoCandidates.find((c) => c.path === effectiveCloneLogo)?.src,
                        onSelect: () => {},
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="h-full border-l border-border bg-card-background/30 overflow-y-auto custom-scrollbar hidden lg:block">
            {mode === 'clone' ? (
              cloneUrlValid && cloneFolderName.trim() ? (
                <ProjectDetailPanel
                  target={{ name: cloneFolderName.trim(), path: cloneUrl.trim() }}
                  stackInfo={remoteStack[cloneUrl.trim()]}
                  selectedBranch={effectiveBranch}
                  onBranchSelect={setCloneBranch}
                  logoCandidates={cloneLogoCandidates}
                  logoCurrent={effectiveCloneLogo}
                  onLogoPick={setCloneLogo}
                />
              ) : null
            ) : (
              <ProjectDetailPanel
                target={target}
                stackInfo={target ? stackCache.get(target.path) : undefined}
                logoCandidates={logoCandidates}
                logoCurrent={logoCurrent}
                onLogoPick={handleLogoPick}
              />
            )}
          </div>
        </div>
      </ModalBody>
      <ModalFooter className="items-center px-5 py-3 bg-panel-background/50 border-t border-border">
        <div className="flex-1 mr-auto min-w-0 text-[11.5px]">
          {error && (
            <span className="flex items-center gap-1.5 text-error truncate" title={error}>
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{error}</span>
            </span>
          )}
        </div>
        <div className="flex gap-2.5">
          <Button
            onClick={onClose}
            className="h-8 px-4 text-xs font-medium rounded-lg bg-primary/10 text-text-secondary hover:bg-primary/20 hover:text-text-primary active:bg-primary/30"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className={cn(
              'h-8 px-4 text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors',
              canSubmit && !loading
                ? 'bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30'
                : 'bg-primary/10 text-primary/40 cursor-not-allowed hover:bg-primary/10',
            )}
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {actionLabel}
          </Button>
        </div>
      </ModalFooter>
      <DuplicateRepoModal
        isOpen={!!pendingDup}
        onClose={() => setPendingDup(null)}
        onConfirm={handleDupConfirm}
        kind={pendingDup?.kind ?? 'different-branch'}
        existingName={pendingDup?.existingName ?? ''}
        existingBranch={pendingDup?.existingBranch ?? ''}
        newBranch={pendingDup?.newBranch ?? ''}
        defaultLinkName={pendingDup?.defaultLinkName ?? ''}
      />
    </Modal>
  );
}

export default OpenProjectModal;