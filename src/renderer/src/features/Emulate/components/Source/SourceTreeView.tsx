import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Globe } from 'lucide-react';
import type { SourceNode } from '../../utils/sourceTree';
import { formatSize } from '../../utils/sourceTree';

interface SourceTreeViewProps {
  nodes: SourceNode[];
  selectedNode?: SourceNode | null;
  onNodeSelect?: (node: SourceNode) => void;
  onNodeExpand?: (node: SourceNode, expanded: boolean) => void;
}

interface TreeNodeProps {
  node: SourceNode;
  level: number;
  selectedNode?: SourceNode | null;
  expandedNodes: Set<string>;
  onNodeSelect?: (node: SourceNode) => void;
  onToggleExpand: (nodeId: string) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  level,
  selectedNode,
  expandedNodes,
  onNodeSelect,
  onToggleExpand,
}) => {
  const isExpanded = expandedNodes.has(node.id);
  const isSelected = selectedNode?.id === node.id;
  const hasChildren = node.children && node.children.length > 0;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (node.type === 'file') {
      onNodeSelect?.(node);
    } else {
      onToggleExpand(node.id);
    }
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand(node.id);
  };

  // Icon based on type
  const getIcon = () => {
    if (node.type === 'domain') return <Globe className="w-4 h-4 text-blue-400" />;
    if (node.type === 'folder') {
      return isExpanded ? (
        <FolderOpen className="w-4 h-4 text-yellow-400" />
      ) : (
        <Folder className="w-4 h-4 text-yellow-400" />
      );
    }
    return <File className="w-4 h-4 text-gray-400" />;
  };

  const indentStyle = {
    paddingLeft: `${level * 16}px`,
  };

  return (
    <>
      <div
        className={`flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-gray-700/50 ${
          isSelected ? 'bg-blue-600/30 text-blue-300' : 'text-gray-300'
        }`}
        style={indentStyle}
        onClick={handleClick}
      >
        {/* Expand/Collapse chevron */}
        {hasChildren && (
          <button
            className="flex items-center justify-center w-4 h-4 hover:bg-gray-600 rounded"
            onClick={handleToggleClick}
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        )}

        {/* Placeholder if no children */}
        {!hasChildren && <div className="w-4" />}

        {/* Icon */}
        {getIcon()}

        {/* Name */}
        <span className="text-sm truncate flex-1">{node.name}</span>

        {/* File size & badges */}
        {node.type === 'file' && (
          <div className="flex items-center gap-2 text-xs">
            {node.isDifferent && (
              <span className="px-1 py-0.5 bg-orange-500/20 text-orange-300 rounded">
                obf
              </span>
            )}
            {node.size && (
              <span className="text-gray-500">{formatSize(node.size)}</span>
            )}
          </div>
        )}
      </div>

      {/* Render children if expanded */}
      {isExpanded && hasChildren && (
        <>
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              selectedNode={selectedNode}
              expandedNodes={expandedNodes}
              onNodeSelect={onNodeSelect}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </>
      )}
    </>
  );
};

export const SourceTreeView: React.FC<SourceTreeViewProps> = ({
  nodes,
  selectedNode,
  onNodeSelect,
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Auto-expand domains by default
  useMemo(() => {
    const domainIds = nodes.filter((n) => n.type === 'domain').map((n) => n.id);
    setExpandedNodes(new Set(domainIds));
  }, [nodes]);

  const handleToggleExpand = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        No sources captured yet
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-800 text-white">
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          level={0}
          selectedNode={selectedNode}
          expandedNodes={expandedNodes}
          onNodeSelect={onNodeSelect}
          onToggleExpand={handleToggleExpand}
        />
      ))}
    </div>
  );
};

export default SourceTreeView;
