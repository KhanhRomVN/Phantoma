import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ArrowUp, ArrowDown, CornerDownLeft } from 'lucide-react';
import { Modal, ModalBody, ModalFooter } from '../../../../components/ui/Modal';
import { useCodeStore, type FileNode } from '../../hooks/useCodeStore';
import { cn } from '@renderer/shared/utils/cn';
import { Kbd } from '@renderer/components/ui/Kbd';

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

// ─── Helpers ─────────────────────────────────────────────────────────────────
function flattenFiles(
  nodes: FileNode[],
  unsavedFiles: Set<string>,
  parentPath = '',
): FlatFileEntry[] {
  const result: FlatFileEntry[] = [];
  for (const node of nodes) {
    const fullPath = parentPath ? `${parentPath}/${node.name}` : node.name;
    if (node.type === 'file') {
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
    if (node.children) {
      result.push(...flattenFiles(node.children, unsavedFiles, fullPath));
    }
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

// ─── Badge color map ─────────────────────────────────────────────────────────
const extColorMap: Record<string, string> = {
  tsx: 'bg-gradient-to-br from-[#7ea6ff] to-[#5c8ef2]',
  ts: 'bg-gradient-to-br from-[#7ea6ff] to-[#5c8ef2]',
  js: 'bg-gradient-to-br from-[#f3e08a] to-[#d9c14a]',
  jsx: 'bg-gradient-to-br from-[#f3e08a] to-[#d9c14a]',
  css: 'bg-gradient-to-br from-[#d78bea] to-[#b25fd1]',
  scss: 'bg-gradient-to-br from-[#d78bea] to-[#b25fd1]',
  json: 'bg-gradient-to-br from-[#f0d27a] to-[#d9ac4a]',
  md: 'bg-gradient-to-br from-[#b7bfcf] to-[#8b93a6]',
  html: 'bg-gradient-to-br from-[#e88a6e] to-[#d96f4a]',
};

function getExtBadge(ext: string): { color: string; label: string } {
  if (ext === 'json') return { color: extColorMap.json, label: '{}' };
  if (ext === 'md') return { color: extColorMap.md, label: 'MD' };
  return {
    color: extColorMap[ext] || 'bg-gradient-to-br from-[#b7bfcf] to-[#8b93a6]',
    label: ext.toUpperCase(),
  };
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
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const keyboardTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const project = useCodeStore((s) => {
    const p = s.projects.find((pr) => pr.id === s.currentProjectId);
    return p ?? null;
  });
  const openFile = useCodeStore((s) => s.openFile);
  const setActiveFileTab = useCodeStore((s) => s.setActiveFileTab);

  const allFiles = useMemo<FlatFileEntry[]>(() => {
    if (!project) return [];
    return flattenFiles(project.files, project.unsavedFiles);
  }, [project]);

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
    return allFiles
      .map((file) => ({ file, result: fuzzyMatch(search, file.name + ' ' + file.path) }))
      .filter((x) => x.result.matched)
      .sort((a, b) => b.result.score - a.result.score)
      .map((x) => ({
        file: x.file,
        indices: x.result.indices.filter((i) => i < x.file.name.length),
      }));
  }, [allFiles, search, recentSet]);

  // Reset selected index khi kết quả thay đổi
  useEffect(() => {
    if (selectedIndex >= filteredFiles.length) {
      setSelectedIndex(Math.max(0, filteredFiles.length - 1));
    }
  }, [filteredFiles, selectedIndex]);

  // Focus input khi modal mở
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 80);
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

  // Scroll item được chọn vào view
  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Vị trí bắt đầu group "Recently opened" (chỉ khi không có search)
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
          placeholder="Nhập tên file để tìm..."
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
          {filteredFiles.length === 0 ? (
            <div className="text-center py-8 text-text-secondary/50 text-xs">
              {search.trim()
                ? `Không tìm thấy file khớp với "${search}"`
                : 'Chưa có file nào trong project'}
            </div>
          ) : (
            <>
              {filteredFiles.map((item, index) => {
                const badge = getExtBadge(item.file.ext);
                const dirPath = item.file.path.includes('/')
                  ? item.file.path.substring(0, item.file.path.lastIndexOf('/') + 1)
                  : '';

                // Group label "Recently opened" trước item đầu tiên (khi chưa search)
                const showRecentLabel = !search.trim() && index === 0 && recentCount > 0;

                // Group label "Other files" sau recently opened
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
                      {/* Extension badge */}
                      <div
                        className={cn(
                          'w-[21px] h-[21px] rounded-md font-mono text-[8px] font-bold text-[#0b0c10] flex items-center justify-center shrink-0',
                          badge.color,
                        )}
                      >
                        {badge.label}
                      </div>

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
                          title="Có thay đổi chưa lưu"
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
            <span className="text-text-primary">Mở file</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex items-center justify-center bg-sidebar-item-hover/70 rounded p-1">
              <Kbd>
                <ArrowUp className="w-3 h-3" strokeWidth={1.5} />
                <ArrowDown className="w-3 h-3" strokeWidth={1.5} />
              </Kbd>
            </div>
            <span className="text-text-primary">Di chuyển</span>
          </div>
          <div className="flex items-center gap-1">
            <Kbd>ESC</Kbd>
            <span className="text-text-primary">Đóng</span>
          </div>
        </div>
        <span className="text-text-secondary/50">{filteredFiles.length} kết quả</span>
      </ModalFooter>
    </Modal>
  );
}

export default QuickOpenModal;
