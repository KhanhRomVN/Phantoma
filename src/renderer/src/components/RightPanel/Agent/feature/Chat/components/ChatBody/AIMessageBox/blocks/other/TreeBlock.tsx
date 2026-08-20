import React, { useState } from 'react';
/**
 * ------------------------------------------------------------------
 * TreeBlock
 * ------------------------------------------------------------------
 * Block hiển thị cây thư mục dạng collapsible.
 * Dùng cho list_resources và list_files tools.
 *
 * Main features:
 * - Collapsible folders với ChevronRight icon
 * - File/folder icons theo extension
 * - Click để mở file
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── UI ──
import { ChevronRight } from 'lucide-react';

// ── Utils ──
import { getFileIconPath, getFolderIconPath } from '@renderer/shared/utils/fileIconMapper';
import { logger } from '@renderer/utils/logger';

// ── Components ──
import ErrorBlock from './ErrorBlock';

// ─── Types ──────────────────────────────────────────────────────────────
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
 * Parse text output từ ListResourcesHandler thành FileNode[].
 * Format:
 *   [list_resources] Total: N, Filtered: M
 *   
 *   - filename (type, size, content-type)
 */
export function parseResourceTable(text: string): FileNode[] {
  const lines = text.split('\n');
  const nodes: FileNode[] = [];

  for (const line of lines) {
    if (!line.startsWith('-')) continue;
    
    // Parse: - filename (type, size, content-type)
    const match = line.match(/^-\s+(.+?)\s+\((.+?),\s*(.+?),\s*(.+?)\)$/);
    if (!match) continue;

    const filename = match[1].trim();
    const type = match[2].trim();
    const sizeStr = match[3].trim();

    const node: FileNode = {
      name: filename,
      type: 'file',
      path: filename,
    };

    // Parse size
    const sizeMatch = sizeStr.match(/^([\d.]+)\s*(B|KB|MB|GB)?$/);
    if (sizeMatch) {
      const num = parseFloat(sizeMatch[1]);
      const multipliers: Record<string, number> = {
        B: 1,
        KB: 1024,
        MB: 1024 * 1024,
        GB: 1024 * 1024 * 1024,
      };
      node.size = num * (multipliers[sizeMatch[2] || 'B'] ?? 1);
    }

    nodes.push(node);
  }

  return nodes;
}

/**
 * Parse text output từ ListSourcesHandler thành FileNode[].
 * Format:
 *   [list_sources] Total: N, Filtered: M
 *   
 *   - domain.com/folder/file.js (12.3 KB)
 */
export function parseSourceTree(text: string): FileNode[] {
  const lines = text.split('\n');
  const nodes: FileNode[] = [];
  
  for (const line of lines) {
    if (!line.startsWith('-')) continue;
    
    // Parse: - path/to/file.js (size)
    const match = line.match(/^-\s+(.+?)(?:\s+\((.+?)\))?$/);
    if (!match) continue;

    const fullPath = match[1].trim();
    const sizeStr = match[2]?.trim();

    // Split path into parts
    const parts = fullPath.split('/');
    if (parts.length === 0) continue;

    // Build tree structure
    let currentLevel = nodes;
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (isLast) {
        // This is a file
        const fileNode: FileNode = {
          name: part,
          type: 'file',
          path: currentPath,
        };

        // Parse size
        if (sizeStr) {
          const sizeMatch = sizeStr.match(/^([\d.]+)\s*(B|KB|MB|GB)?$/);
          if (sizeMatch) {
            const num = parseFloat(sizeMatch[1]);
            const multipliers: Record<string, number> = {
              B: 1,
              KB: 1024,
              MB: 1024 * 1024,
              GB: 1024 * 1024 * 1024,
            };
            fileNode.size = num * (multipliers[sizeMatch[2] || 'B'] ?? 1);
          }
        }

        currentLevel.push(fileNode);
      } else {
        // This is a folder
        let folderNode = currentLevel.find((n) => n.name === part && n.type === 'folder');
        if (!folderNode) {
          folderNode = {
            name: part,
            type: 'folder',
            path: currentPath,
            children: [],
          };
          currentLevel.push(folderNode);
        }
        currentLevel = folderNode.children!;
      }
    }
  }

  return nodes;
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
    <div className="mt-1 bg-background border rounded-[4px] overflow-hidden">
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