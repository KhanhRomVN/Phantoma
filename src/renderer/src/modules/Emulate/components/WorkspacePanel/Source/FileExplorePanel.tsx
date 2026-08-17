import { useState, useMemo, useCallback } from 'react';
import {
  Search,
  ChevronRight,
  ChevronDown,
  FileCode,
  Globe,
  ChevronsRight,
  ChevronsDown,
} from 'lucide-react';

import type { SourceNode, SourceTreeData } from '../../../utils/source-tree.util';
import { formatSize } from '../../../utils/source-tree.util';
import { cn } from '@renderer/shared/utils/cn';
import { getFileIconPath, getFolderIconPath } from '@renderer/shared/utils/fileIconMapper';
import { Favicon } from '@renderer/shared/utils/faviconUtils';

interface FileExplorePanelProps {
  tree: SourceTreeData;
  stats: { totalFiles: number; obfuscatedFiles: number };
  onSelectNode: (node: SourceNode) => void;
}

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
  const [, setIsHovered] = useState(false);
  const isExpanded = expandedPaths.has(node.id);
  const isSelected = selectedNode?.id === node.id;
  const hasChildren = node.children && node.children.length > 0;

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-1 rounded cursor-pointer transition-colors',
          isSelected ? 'bg-purple-500/20 text-purple-400' : 'hover:bg-muted/30 text-text-primary',
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={(e) => {
          e.stopPropagation();
          if (node.type === 'file') onSelect(node);
          else onToggle(node.id);
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {hasChildren ? (
          <button
            className="flex items-center justify-center w-4 h-4 hover:bg-gray-600 rounded"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        ) : (
          <div className="w-4" />
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
        <span className="text-xs truncate flex-1">{node.name}</span>
        {node.type === 'file' && (
          <div className="flex items-center gap-2 text-xs">
            {node.isDifferent && (
              <span className="px-1 py-0.5 bg-orange-500/20 text-orange-300 rounded text-[9px]">
                obf
              </span>
            )}
            {node.size && (
              <span className="text-text-secondary text-[9px]">{formatSize(node.size)}</span>
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

function FileTree({
  tree,
  onSelectNode,
}: {
  tree: SourceTreeData;
  onSelectNode: (node: SourceNode) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
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

  if (tree.roots.length === 0)
    return (
      <div className="flex-1 flex items-center justify-center text-text-secondary text-xs py-4">
        No source files found
      </div>
    );

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-divider shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 bg-input-background border border-input-border-default rounded-lg pl-8 pr-3 text-sm text-text-primary focus:border-purple-500/50 outline-none"
            />
          </div>
          <button
            onClick={() => setExpandedPaths(new Set(getAllExpandableIds()))}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-dropdown-item-hover transition-all"
            title="Expand All"
          >
            <ChevronsDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setExpandedPaths(new Set())}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-dropdown-item-hover transition-all"
            title="Collapse All"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-1">
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
    </div>
  );
}

export function FileExplorePanel({ tree, stats, onSelectNode }: FileExplorePanelProps) {
  return (
    <div className="h-full bg-background border-r border-border/50 flex flex-col">
      <div className="h-10 px-3 border-b border-divider flex items-center justify-between shrink-0 bg-muted/10">
        <div className="flex items-center gap-2">
          <img src={getFolderIconPath()} className="w-4 h-4 shrink-0" alt="" />
          <span className="text-xs font-medium text-text-primary">Explorer</span>
        </div>
        <div className="flex items-center gap-2">
          {stats.obfuscatedFiles > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 bg-orange-500/20 text-orange-300 rounded">
              {stats.obfuscatedFiles} obf
            </span>
          )}
          <span className="text-[10px] text-text-secondary">{stats.totalFiles} files</span>
        </div>
      </div>
      {stats.totalFiles === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-16 h-16 rounded-xl bg-purple-500/15 flex items-center justify-center mb-4 border border-purple-500/25">
            <FileCode className="w-8 h-8 text-purple-400" />
          </div>
          <h3 className="text-sm font-semibold text-text-secondary mb-1">No Source Files</h3>
          <p className="text-xs text-text-secondary text-center max-w-[200px]">
            Navigate to a page to capture JavaScript sources
          </p>
        </div>
      ) : (
        <FileTree tree={tree} onSelectNode={onSelectNode} />
      )}
    </div>
  );
}

export default FileExplorePanel;