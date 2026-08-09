import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ArrowUp, ArrowDown, CornerDownLeft, Loader } from 'lucide-react';
import { Modal, ModalBody, ModalFooter } from '../../../../components/ui/Modal';
import { Kbd } from '../../../../components/ui/Kbd';
import { useCodeStore, type FileNode } from '../../hooks/useCodeStore';
import { cn } from '@renderer/shared/utils/cn';
import { getFileIconPath } from '@renderer/shared/utils/fileIconMapper';

// ─── Types ───────────────────────────────────────────────────────────────────
interface FlatFileEntry {
  name: string;
  path: string;
  ext: string;
  modified: boolean;
  node: FileNode;
}

interface SearchResult {
  file: FlatFileEntry;
  indices: number[];
}

// ─── Ignore Patterns (VSCode-style Ctrl+P filter) ────────────────────────────

/** Directories to always exclude from Quick Open */
const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  '.output',
  'coverage',
  '__pycache__',
  '.cache',
  '.parcel-cache',
  '.turbo',
  'vendor',
  'bower_components',
  '.idea',
  '.vscode',
  '.vs',
  '.DS_Store',
  'Thumbs.db',
]);

/** File extensions considered binary / non-text — excluded from Quick Open */
const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'icns', 'webp', 'avif',
  'woff', 'woff2', 'ttf', 'eot', 'otf',
  'mp3', 'mp4', 'avi', 'mov', 'mkv', 'webm', 'ogg', 'wav', 'flac',
  'zip', 'tar', 'gz', 'bz2', 'xz', '7z', 'rar',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'wasm', 'bin', 'exe', 'dll', 'so', 'dylib',
  'class', 'jar', 'war', 'ear',
  'o', 'obj', 'a', 'lib',
  'pyc', 'pyo', 'pyd',
  'tsbuildinfo',
]);

/** File name patterns to exclude (checked against full filename) */
const IGNORE_FILE_PATTERNS: RegExp[] = [
  /\.min\.(js|css)$/i,
  /\.(js|css|ts|mjs)\.map$/i,
  /package-lock\.json$/i,
  /yarn\.lock$/i,
  /pnpm-lock\.yaml$/i,
  /bun\.lockb?$/i,
  /Cargo\.lock$/i,
  /Gemfile\.lock$/i,
  /composer\.lock$/i,
  /poetry\.lock$/i,
  /\.eslintcache$/i,
  /tsconfig\.tsbuildinfo$/i,
];

function shouldIgnoreFile(name: string, isDirectory: boolean): boolean {
  if (isDirectory) return IGNORE_DIRS.has(name);
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
  if (ext && BINARY_EXTENSIONS.has(ext)) return true;
  return IGNORE_FILE_PATTERNS.some((re) => re.test(name));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function flattenFiles(
  nodes: FileNode[],
  unsavedFiles: Set<string>,
  parentPath = '',
  depth = 0,
): FlatFileEntry[] {
  const result: FlatFileEntry[] = [];
  for (const node of nodes) {
    // Skip ignored directories and files
    if (shouldIgnoreFile(node.name, node.type !== 'file' || !!node.children?.length)) {
      continue;
    }

    const fullPath = parentPath ? `${parentPath}/${node.name}` : node.name;

    if (node.type === 'file' && !shouldIgnoreFile(node.name, false)) {
      const parts = node.name.split('.');
      const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : '';
      result.push({
        name: node.name,
        path: fullPath,
        ext,
        modified: unsavedFiles.has(node.id),
        node,
      });
    }

    if (node.children && node.children.length > 0) {
      result.push(...flattenFiles(node.children, unsavedFiles, fullPath, depth + 1));
    }
  }

  // Log depth info for debugging
  if (depth === 0) {
    // Count nodes by depth
    const depthCounts: Record<number, number> = {};
    const countDepth = (n: FileNode[], d: number) => {
      depthCounts[d] = (depthCounts[d] || 0) + n.length;
      n.forEach((node) => {
        if (node.children) countDepth(node.children, d + 1);
      });
    };
    countDepth(nodes, 0);
  }

  return result;
}

interface FuzzyResult {
  matched: boolean;
  score: number;
  indices: number[];
}

function fuzzyMatch(query: string, target: string): FuzzyResult {
  if (!query) return { matched: true, score: 0, indices: [] };
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  let score = 0;
  const indices: number[] = [];
  let consecutive = 0;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      indices.push(ti);
      consecutive++;
      score += 10 + consecutive * 4;
      if (ti === 0 || t[ti - 1] === '/') score += 15;
      qi++;
    } else {
      consecutive = 0;
    }
  }

  if (qi < q.length) return { matched: false, score: 0, indices: [] };
  return { matched: true, score, indices };
}

function highlightText(text: string, indices: number[]): React.ReactNode {
  if (!indices.length) return text;
  const result: React.ReactNode[] = [];
  let last = 0;
  indices.forEach((i, idx) => {
    if (i > last) result.push(text.slice(last, i));
    result.push(
      <mark key={idx} className="bg-transparent text-[#7ea6ff] font-bold">
        {text[i]}
      </mark>,
    );
    last = i + 1;
  });
  if (last < text.length) result.push(text.slice(last));
  return result;
}

// ─── Component ───────────────────────────────────────────────────────────────
interface QuickOpenModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickOpenModal({ isOpen, onClose }: QuickOpenModalProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isKeyboardNav, setIsKeyboardNav] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedFiles, setScannedFiles] = useState<FlatFileEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const keyboardTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const project = useCodeStore((s) => {
    const p = s.projects.find((pr) => pr.id === s.currentProjectId);
    return p ?? null;
  });
  const openFile = useCodeStore((s) => s.openFile);
  const setActiveFileTab = useCodeStore((s) => s.setActiveFileTab);

  // Scan all files when modal opens
  useEffect(() => {
    if (isOpen && project?.path) {
      setIsScanning(true);

      import('../ProjectTabBar/OpenProjectModal').then(({ scanDirectory }) => {
        scanDirectory(project.path).then((fileNodes) => {
          const files = flattenFiles(fileNodes, project.unsavedFiles);
          setScannedFiles(files);
          setIsScanning(false);
        });
      });
    }
  }, [isOpen, project?.path, project?.unsavedFiles]);

  const allFiles = useMemo<FlatFileEntry[]>(() => {
    if (!project) {
      return [];
    }

    // Combine files from:
    // 1. Scanned files (if available)
    // 2. project.files (initial scan)
    // 3. project.fileNodeMap (all opened files, including lazy-loaded ones)
    let files: FlatFileEntry[] = [];

    if (scannedFiles.length > 0) {
      files = scannedFiles;
    } else {
      // Start with project.files
      files = flattenFiles(project.files, project.unsavedFiles);

      // Add opened files that might not be in project.files (lazy-loaded)
      const fileNodeMapEntries = Object.entries(project.fileNodeMap);

      let addedCount = 0;
      for (const [fileId, node] of fileNodeMapEntries) {
        if (node.type === 'file') {
          const exists = files.some((f) => f.node.id === fileId);
          if (!exists) {
            const parts = node.name.split('.');
            const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : '';
            files.push({
              name: node.name,
              path: node.path || node.name,
              ext,
              modified: project.unsavedFiles.has(fileId),
              node,
            });
            addedCount++;
          }
        }
      }
    }

    return files;
  }, [project, scannedFiles]);

  // Build lookup for recently opened files
  const openFileIds = project?.openFiles ?? [];
  const recentSet = useMemo(() => new Set(openFileIds), [openFileIds]);

  const filteredFiles = useMemo<SearchResult[]>(() => {
    if (!search.trim()) {
      // No query: recently opened first, then the rest alphabetically
      const recent: SearchResult[] = [];
      const rest: SearchResult[] = [];
      for (const file of allFiles) {
        const item: SearchResult = { file, indices: [] };
        if (recentSet.has(file.node.id)) {
          recent.push(item);
        } else {
          rest.push(item);
        }
      }
      rest.sort((a, b) => a.file.name.localeCompare(b.file.name));
      return [...recent, ...rest];
    }

    const results = allFiles
      .map((file) => {
        const searchTarget = file.name + ' ' + file.path;
        const result = fuzzyMatch(search, searchTarget);
        return { file, result };
      })
      .filter((x) => x.result.matched)
      .sort((a, b) => b.result.score - a.result.score)
      .map((x) => ({
        file: x.file,
        indices: x.result.indices.filter((i) => i < x.file.name.length),
      }));
    return results;
  }, [allFiles, search, recentSet]);

  // Reset selected index when results change
  useEffect(() => {
    if (selectedIndex >= filteredFiles.length) {
      setSelectedIndex(Math.max(0, filteredFiles.length - 1));
    }
  }, [filteredFiles, selectedIndex]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      // Reset scanned files when modal closes
      setScannedFiles([]);
      setIsScanning(false);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      setIsKeyboardNav(true);
      if (keyboardTimeoutRef.current) clearTimeout(keyboardTimeoutRef.current);
      keyboardTimeoutRef.current = setTimeout(() => setIsKeyboardNav(false), 300);
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredFiles.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      openSelectedFile();
    }
  };

  const openSelectedFile = () => {
    const item = filteredFiles[selectedIndex];
    if (!item || !project) return;
    openFile(project.id, item.file.node.id, item.file.name, item.file.node);
    setActiveFileTab(item.file.node.id);
    onClose();
  };

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Start position of "Recently opened" group (only when no search)
  const recentCount = search.trim()
    ? 0
    : filteredFiles.filter((item) => recentSet.has(item.file.node.id)).length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-[560px]">
      {/* Search input */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
        <Search className="w-4 h-4 text-text-secondary/60 shrink-0" strokeWidth={1.5} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Type filename to search..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelectedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-0 bg-transparent outline-none text-sm text-text-primary placeholder:text-text-secondary/50 caret-[#7ea6ff]"
          autoFocus
          spellCheck={false}
        />
        <span className="text-[10px] font-mono font-semibold text-text-secondary/50 border border-border rounded-md px-1.5 py-0.5 shrink-0">
          ESC
        </span>
      </div>

      {/* Results */}
      <ModalBody className="p-0 max-h-[336px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/50">
        <div ref={listRef} className="py-1.5">
          {isScanning ? (
            <div className="text-center py-8 text-text-secondary/50 text-xs flex flex-col items-center gap-2">
              <Loader className="w-5 h-5 animate-spin" />
              <span>Scanning directory...</span>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-8 text-text-secondary/50 text-xs">
              {search.trim() ? `No files matching "${search}"` : 'No files in project'}
            </div>
          ) : (
            <>
              {filteredFiles.map((item, index) => {
                const iconPath = getFileIconPath(item.file.name);
                const dirPath = item.file.path.includes('/')
                  ? item.file.path.substring(0, item.file.path.lastIndexOf('/') + 1)
                  : '';

                // Group label "Recently opened" before first item (when no search)
                const showRecentLabel = !search.trim() && index === 0 && recentCount > 0;

                // Group label "Other files" after recently opened
                const showOtherLabel =
                  !search.trim() &&
                  index === recentCount &&
                  recentCount > 0 &&
                  recentCount < filteredFiles.length;

                return (
                  <div key={item.file.path}>
                    {showRecentLabel && (
                      <div className="px-2.5 py-1.5 text-[9.5px] font-semibold uppercase tracking-wider text-text-secondary/50 font-mono">
                        Recently opened
                      </div>
                    )}
                    {showOtherLabel && (
                      <div className="px-2.5 py-1.5 text-[9.5px] font-semibold uppercase tracking-wider text-text-secondary/50 font-mono">
                        Other files
                      </div>
                    )}
                    <div
                      data-index={index}
                      className={cn(
                        'flex items-center gap-2.5 h-[42px] px-2 mx-1.5 rounded-lg cursor-pointer transition-colors',
                        index === selectedIndex
                          ? 'bg-[rgba(92,142,242,0.15)] border border-[rgba(92,142,242,0.35)]'
                          : 'border border-transparent hover:bg-sidebar-item-hover/50',
                      )}
                      onClick={openSelectedFile}
                      onMouseEnter={() => {
                        if (!isKeyboardNav) setSelectedIndex(index);
                      }}
                    >
                      {/* File icon */}
                      <img src={iconPath} alt="" className="w-[21px] h-[21px] shrink-0" />

                      {/* File name + path */}
                      <div className="flex-1 min-w-0 flex items-center gap-0">
                        <span className="font-mono text-[12.5px] font-medium text-text-primary whitespace-nowrap shrink-0">
                          {highlightText(item.file.name, item.indices)}
                        </span>
                        {dirPath && (
                          <span className="font-mono text-[11px] text-text-secondary/40 truncate ml-1">
                            {dirPath}
                          </span>
                        )}
                      </div>

                      {/* Modified indicator */}
                      {item.file.modified && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-[#5fd9a4] shrink-0"
                          title="Unsaved changes"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </ModalBody>

      {/* Footer hints */}
      <ModalFooter className="px-4 py-2.5 border-t border-border flex items-center justify-between text-[10px] bg-[rgba(16,18,23,0.5)]">
        <div className="flex items-center gap-3.5">
          <div className="flex items-center gap-1">
            <div className="flex items-center justify-center bg-sidebar-item-hover/70 rounded p-1">
              <Kbd>
                <CornerDownLeft className="w-3 h-3" strokeWidth={1.5} />
              </Kbd>
            </div>
            <span className="text-text-primary">Open file</span>
          </div>
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
            <Kbd>ESC</Kbd>
            <span className="text-text-primary">Close</span>
          </div>
        </div>
        <span className="text-text-secondary/50">{filteredFiles.length} results</span>
      </ModalFooter>
    </Modal>
  );
}

export default QuickOpenModal;
