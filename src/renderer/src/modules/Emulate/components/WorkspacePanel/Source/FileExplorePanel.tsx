import { useState, useMemo, useCallback } from 'react';
/**
 * ------------------------------------------------------------------
 * FileExplorePanel
 * ------------------------------------------------------------------
 * Panel explorer cây thư mục source — hiển thị domain/folder/file
 * với expand/collapse và stats (tổng files, obfuscated files).
 *
 * Các chức năng chính:
 * - Hiển thị cây thư mục source dạng tree view
 * - Expand/collapse nodes
 * - Hiển thị icon theo loại file
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── UI ──
import {
  ChevronRight,
  FileCode,
  Globe,
  ChevronsDown,
  ChevronsDownUp,
} from 'lucide-react';

// ── Types ──
import type { SourceNode, SourceTreeData } from '../../../utils/source-tree.util';

// ── Utils ──
import { formatSize } from '../../../utils/source-tree.util';
import { cn } from '@renderer/shared/utils/cn';
import { getFileIconPath, getFolderIconPath } from '@renderer/shared/utils/fileIconMapper';
import { Favicon } from '@renderer/shared/utils/faviconUtils';

// ─── Types ──────────────────────────────────────────────────────────────
interface FileExplorePanelProps {
  tree: SourceTreeData;
  stats: { totalFiles: number; obfuscatedFiles: number };
  onSelectNode: (node: SourceNode) => void;
}

// ─── Components ─────────────────────────────────────────────────────────
function TreeNodeItem({
  node,
  depth,
  selectedNode,
  expandedPaths,
  onSelect,
  onToggle,
}: {
  node: SourceNode;
  depth: number;
  selectedNode: SourceNode | null;
  expandedPaths: Set<string>;
  onSelect: (node: SourceNode) => void;
  onToggle: (path: string) => void;
}) {
  const isExpanded = expandedPaths.has(node.id);
  const isSelected = selectedNode?.id === node.id;
  const hasChildren = node.children && node.children.length > 0;

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-1.5 w-full py-1 pr-2 rounded text-sm text-left transition-colors',
          isSelected
            ? 'bg-card-hover text-text-primary'
            : 'text-text-secondary hover:bg-card-hover hover:text-text-primary',
        )}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        onClick={(e) => {
          e.stopPropagation();
          if (node.type === 'file') onSelect(node);
          else onToggle(node.id);
        }}
      >
        {hasChildren ? (
          <ChevronRight
            className={cn(
              'w-3.5 h-3.5 shrink-0 transition-transform text-text-secondary',
              isExpanded && 'rotate-90',
            )}
            strokeWidth={1.5}
          />
        ) : (
          <span className="w-3.5 h-3.5 shrink-0" />
        )}
        {node.type === 'domain' ? (
          <Favicon
            url={`https://${node.name}`}
            size={16}
            className="shrink-0"
            fallbackIcon={<Globe className="w-4 h-4 text-blue-400" />}
          />
        ) : node.type === 'folder' ? (
          <img
            src={getFolderIconPath(node.name, isExpanded)}
            className="w-4 h-4 shrink-0"
            alt=""
          />
        ) : node.type === 'file' ? (
          <img src={getFileIconPath(node.name)} className="w-4 h-4 shrink-0" alt="" />
        ) : null}
        <span className="truncate text-[13px] flex-1">{node.name}</span>
        {node.type === 'file' && (
          <div className="flex items-center gap-2 text-xs">
            {node.isDifferent && (
              <span className="px-1 py-0.5 bg-orange-500/20 text-orange-300 rounded text-[9px]">
                obf
              </span>
            )}
            {node.size && (
              <span className="text-text-secondary text-[11px] opacity-60 shrink-0">
                {formatSize(node.size)}
              </span>
            )}
          </div>
        )}
      </div>
      {isExpanded &&
        hasChildren &&
        node.children!.map((child) => (
          <TreeNodeItem
            key={child.id}
            node={child}
            depth={depth + 1}
            selectedNode={selectedNode}
            expandedPaths={expandedPaths}
            onSelect={onSelect}
            onToggle={onToggle}
          />
        ))}
    </>
  );
}

export function FileExplorePanel({ tree, stats, onSelectNode }: FileExplorePanelProps) {
  const [selectedNode, setSelectedNode] = useState<SourceNode | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  useMemo(() => {
    const domainIds = tree.roots.filter((n) => n.type === 'domain').map((n) => n.id);
    setExpandedPaths(new Set(domainIds));
  }, [tree]);

  const getAllExpandableIds = useCallback(() => {
    const ids: string[] = [];
    function traverse(node: SourceNode) {
      if (node.type === 'domain' || node.type === 'folder') ids.push(node.id);
      if (node.children) node.children.forEach(traverse);
    }
    tree.roots.forEach(traverse);
    return ids;
  }, [tree]);

  const handleExpandAll = () => setExpandedPaths(new Set(getAllExpandableIds()));
  const handleCollapseAll = () => setExpandedPaths(new Set());

  return (
    <div className="h-full bg-background border-r border-border/50 flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between h-9 px-2 border-b border-divider flex-shrink-0 bg-sidebar-background">
        <div className="flex items-center gap-2">
          <img src={getFolderIconPath()} className="w-4 h-4 shrink-0" alt="" />
          <span className="text-[13px] text-text-secondary truncate max-w-[50%]">Explorer</span>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {stats.obfuscatedFiles > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 bg-orange-500/20 text-orange-300 rounded">
              {stats.obfuscatedFiles} obf
            </span>
          )}
          <span className="text-[10px] text-text-secondary mr-1">{stats.totalFiles} files</span>
          <button
            onClick={handleExpandAll}
            className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors"
            title="Expand All"
          >
            <ChevronsDown className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
          <button
            onClick={handleCollapseAll}
            className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors"
            title="Collapse All"
          >
            <ChevronsDownUp className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {stats.totalFiles === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-16 h-16 rounded-xl bg-purple-500/15 flex items-center justify-center mb-2">
            <FileCode className="w-8 h-8 text-text-secondary" />
          </div>
          <h3 className="text-sm font-semibold text-text-secondary mb-1">No Source Files</h3>
          <p className="text-xs text-text-secondary text-center max-w-[200px]">
            Navigate to a page to capture JavaScript sources
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto py-1">
          {tree.roots.map((node) => (
            <TreeNodeItem
              key={node.id}
              node={node}
              depth={0}
              selectedNode={selectedNode}
              expandedPaths={expandedPaths}
              onSelect={(n) => {
                setSelectedNode(n);
                onSelectNode(n);
              }}
              onToggle={(path) =>
                setExpandedPaths((prev) => {
                  const next = new Set(prev);
                  if (next.has(path)) next.delete(path);
                  else next.add(path);
                  return next;
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default FileExplorePanel;