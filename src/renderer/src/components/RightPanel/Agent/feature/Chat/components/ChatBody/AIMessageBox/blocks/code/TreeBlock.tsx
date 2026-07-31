import React, { useState } from 'react';
import { getFileIconPath, getFolderIconPath } from '@renderer/utils/fileIconMapper';
import ErrorBlock from '../other/ErrorBlock';

interface FileNode {
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
}

const TreeNode: React.FC<{
  node: FileNode;
  level: number;
  onFileClick?: (path: string) => void;
}> = ({ node, level, onFileClick }) => {
  // Expand all folders by default for find_files to show all results
  const [isExpanded, setIsExpanded] = useState(true);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type === 'folder') {
      setIsExpanded(!isExpanded);
    }
  };

  const handleClick = () => {
    if (node.type === 'file' && onFileClick) {
      onFileClick(node.path);
    }
  };

  const hasChildren = node.children && node.children.length > 0;
  const iconPath =
    node.type === 'folder' ? getFolderIconPath(node.name, isExpanded) : getFileIconPath(node.path);

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-0.5 text-[13px] ${node.type === 'file' ? 'cursor-pointer hover:bg-sidebar-item-hover rounded-sm' : ''}`}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        onClick={handleClick}
      >
        {node.type === 'folder' && hasChildren && (
          <span
            className={`codicon codicon-chevron-${isExpanded ? 'down' : 'right'} text-xs text-secondary cursor-pointer w-4 h-4 flex items-center justify-center`}
            onClick={handleToggle}
          />
        )}
        {node.type === 'folder' && !hasChildren && <span className="w-4 h-4 inline-block" />}
        {node.type === 'file' && <span className="w-4 h-4 inline-block" />}
        <img
          src={iconPath}
          alt={`${node.type} icon`}
          className="w-3.5 h-3.5 mr-1.5 shrink-0"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const parent = e.currentTarget.parentElement;
            if (parent) {
              const fallback = document.createElement('span');
              fallback.className = `codicon codicon-${node.type === 'folder' ? 'folder' : 'file'}`;
              fallback.className =
                'codicon codicon-' +
                (node.type === 'folder' ? 'folder' : 'file') +
                ' text-xs text-text-secondary opacity-70 mr-1.5 shrink-0';
              fallback.style.cssText = '';
              parent.insertBefore(fallback, e.currentTarget);
            }
          }}
        />
        <span className="text-text-primary">{node.name}</span>
        {node.type === 'file' && node.lines !== undefined && (
          <span className="text-[11px] text-secondary opacity-60 ml-auto mr-2">
            {node.lines} lines
          </span>
        )}
      </div>
      {node.type === 'folder' && isExpanded && hasChildren && (
        <div>
          {node.children!.map((child, index) => {
            return (
              <TreeNode
                key={`${child.path}-${index}`}
                node={child}
                level={level + 1}
                onFileClick={onFileClick}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export const TreeBlock: React.FC<TreeBlockProps> = ({ files, onFileClick }) => {
  // Validate data structure
  if (!Array.isArray(files)) {
    console.error('[TreeBlock] Invalid files data - not an array:', files);
    return (
      <ErrorBlock content="Invalid tree data format (not array)" compact={true} maxHeight="300px" />
    );
  }

  if (files.length === 0) {
    return <div className="p-2 text-secondary opacity-60 text-sm">No files to display</div>;
  }

  return (
    <div className="mt-1 bg-background border rounded-[4px] overflow-hidden ml-[29px]">
      <div className="py-1">
        {files.map((file, index) => {
          return (
            <TreeNode
              key={`${file.path}-${index}`}
              node={file}
              level={0}
              onFileClick={onFileClick}
            />
          );
        })}
      </div>
    </div>
  );
};

export default TreeBlock;
