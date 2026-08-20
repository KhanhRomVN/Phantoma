import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import ErrorBlock from './ErrorBlock';
import { getFileIconPath, getFolderIconPath } from '@renderer/shared/utils/fileIconMapper';
import { logger } from '@renderer/utils/logger';

export interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
  size?: number;
  lines?: number;
}

interface TreeBlockProps {
  files: FileNode[];
  onFileClick?: (path: string) => void;
  maxHeight?: string;
}

/**
 * Parse text output từ ListSourcesHandler thành FileNode[].
 * Format:
 *   [list_sources] Total: N, Filtered: M
 *   domain.com/
 *   ├─ folder1/
 *   │  ├─ stt=1 file1.js (12.3 KB)
 *   │  └─ stt=2 file2.css
 *   └─ stt=3 index.html (2.1 KB)
 */
export function parseSourceTree(text: string): FileNode[] {
  const lines = text.split('\n');
  const treeLines = lines.filter((l) => !l.startsWith('[list_sources]'));
  const roots: FileNode[] = [];
  const stack: { node: FileNode; level: number }[] = [];

  for (const rawLine of treeLines) {
    if (!rawLine.trim()) continue;

    const indent = rawLine.match(/^(\s*)/)?.[1].length ?? 0;
    const level = Math.floor(indent / 2);
    let content = rawLine.trim().replace(/^[├└]─\s+/, '');

    const isFolder = content.endsWith('/');
    let name = isFolder ? content.slice(0, -1) : content;
    let size: number | undefined;

    if (!isFolder) {
      const sttMatch = name.match(/^stt=(\d+)\s+(.+)$/);
      if (sttMatch) name = sttMatch[2];

      const sizeMatch = name.match(/^(.+?)\s+\(([^)]+)\)$/);
      if (sizeMatch) {
        name = sizeMatch[1];
        const sizeParts = sizeMatch[2].match(/^([\d.]+)\s*(B|KB|MB|GB)?$/);
        if (sizeParts) {
          const num = parseFloat(sizeParts[1]);
          const multipliers: Record<string, number> = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
          size = num * (multipliers[sizeParts[2] || 'B'] ?? 1);
        }
      }
    }

    const node: FileNode = {
      name,
      type: isFolder ? 'folder' : 'file',
      path: '',
      children: isFolder ? [] : undefined,
    };
    if (size !== undefined) node.size = size;

    while (stack.length > 0 && stack[stack.length - 1].level >= level) stack.pop();

    if (stack.length === 0) {
      node.path = name;
      roots.push(node);
    } else {
      const parent = stack[stack.length - 1].node;
      node.path = parent.path + '/' + name;
      parent.children!.push(node);
    }

    if (isFolder) stack.push({ node, level });
  }

  return roots;
}

const TreeNode: React.FC<{
  node: FileNode;
  level: number;
  onFileClick?: (path: string) => void;
}> = ({ node, level, onFileClick }) => {
  // Expand all folders by default
  const [isExpanded, setIsExpanded] = useState(true);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type === 'folder') setIsExpanded(!isExpanded);
  };

  const handleClick = () => {
    if (node.type === 'file' && onFileClick) onFileClick(node.path);
  };

  const hasChildren = node.children && node.children.length > 0;
  const iconPath =
    node.type === 'folder' ? getFolderIconPath(node.name, isExpanded) : getFileIconPath(node.path);
  const fallbackIcon = node.type === 'folder' ? '/images/icon/folder-base.svg' : '/images/icon/file.svg';

  return (
    <div>
      <div
        className={`flex items-center gap-1.5 w-full py-1 pr-2 rounded text-sm text-left transition-colors ${
          node.type === 'file'
            ? 'cursor-pointer text-text-secondary hover:bg-card-hover hover:text-text-primary'
            : ''
        }`}
        style={{ paddingLeft: `${8 + level * 12}px` }}
        onClick={handleClick}
      >
        {node.type === 'folder' ? (
          <ChevronRight
            className={`w-3.5 h-3.5 shrink-0 transition-transform text-text-secondary ${
              isExpanded ? 'rotate-90' : ''
            } ${!hasChildren ? 'invisible' : ''}`}
            strokeWidth={1.5}
            onClick={handleToggle}
          />
        ) : (
          <span className="w-3.5 h-3.5 shrink-0" />
        )}
        <img
          src={iconPath}
          alt=""
          className="w-4 h-4 shrink-0"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            if (img.src === fallbackIcon) {
              img.style.display = 'none';
            } else {
              img.src = fallbackIcon;
            }
          }}
        />
        <span className="truncate text-[13px]">{node.name}</span>
        {node.type === 'file' && node.size !== undefined && (
          <span className="text-[11px] text-text-secondary opacity-60 ml-auto mr-2 shrink-0">
            {formatFileSize(node.size)}
          </span>
        )}
      </div>
      {node.type === 'folder' && isExpanded && hasChildren && (
        <div>
          {node.children!.map((child, index) => (
            <TreeNode
              key={`${child.path}-${index}`}
              node={child}
              level={level + 1}
              onFileClick={onFileClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const TreeBlock: React.FC<TreeBlockProps> = ({ files, onFileClick, maxHeight }) => {
  if (!Array.isArray(files)) {
    logger.warn('[TreeBlock] Invalid files data - not an array:', files);
    return (
      <ErrorBlock content="Invalid tree data format (not array)" compact={true} maxHeight="300px" />
    );
  }

  if (files.length === 0) {
    return <div className="p-2 text-text-secondary opacity-60 text-sm">No files to display</div>;
  }

  return (
    <div className="mt-1 bg-background border rounded-[4px] overflow-hidden ml-[29px]">
      <div className="py-1" style={maxHeight ? { maxHeight, overflow: 'auto' } : undefined}>
        {files.map((file, index) => (
          <TreeNode
            key={`${file.path}-${index}`}
            node={file}
            level={0}
            onFileClick={onFileClick}
          />
        ))}
      </div>
    </div>
  );
};

export default TreeBlock;