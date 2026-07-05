import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  FileCode,
  Search,
  Folder,
  ChevronRight,
  ChevronDown,
  AlignLeft,
  Globe,
  ChevronsRight,
  ChevronsDown,
  Loader2,
} from 'lucide-react';
import { cn } from '../../../../shared/lib/utils';
import { ResizableSplit } from '../../../../components/ui/ResizableSplit/ResizableSplit';
import { CodeBlock, CodeBlockRef } from '../../../../components/common/CodeBlock';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { NetworkRequest } from '../Home/Filter';
import {
  buildSourceTree,
  type SourceNode,
  formatSize,
  type SourceTreeData,
} from '../../utils/sourceTree';
import type { CdpScriptUnpackedData } from '../../hooks/useNetworkEvents';
import { prettifyCode, isMinified } from '../../utils/prettify';

interface SourcesPanelProps {
  requests?: NetworkRequest[];
  unpackedScripts?: Map<string, CdpScriptUnpackedData>;
  onClose?: () => void;
}

// Recursive tree component
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

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (node.type === 'file') {
      onSelect(node);
    } else {
      onToggle(node.id);
    }
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(node.id);
  };

  // Icon based on type
  const getIcon = () => {
    if (node.type === 'domain') return <Globe className="w-4 h-4 text-blue-400" />;
    if (node.type === 'file') return <FileCode className="w-4 h-4 text-gray-400" />;
    return null; // No icon for folders
  };

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-1 rounded cursor-pointer transition-colors',
          isSelected ? 'bg-purple-500/20 text-purple-400' : 'hover:bg-muted/30 text-text-primary',
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
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
        <span className="text-xs truncate flex-1">{node.name}</span>

        {/* File size & badges */}
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

      {/* Render children if expanded */}
      {isExpanded && hasChildren && (
        <>
          {node.children!.map((child) => (
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
      )}
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

  // Auto-expand domains on mount
  useMemo(() => {
    const domainIds = tree.roots.filter((n) => n.type === 'domain').map((n) => n.id);
    setExpandedPaths(new Set(domainIds));
  }, [tree]);

  // Collect all expandable node IDs (domains + folders)
  const getAllExpandableIds = useCallback(() => {
    const ids: string[] = [];

    function traverse(node: SourceNode) {
      if (node.type === 'domain' || node.type === 'folder') {
        ids.push(node.id);
      }
      if (node.children) {
        node.children.forEach(traverse);
      }
    }

    tree.roots.forEach(traverse);
    return ids;
  }, [tree]);

  // Expand all
  const handleExpandAll = useCallback(() => {
    const allIds = getAllExpandableIds();
    setExpandedPaths(new Set(allIds));
  }, [getAllExpandableIds]);

  // Collapse all
  const handleCollapseAll = useCallback(() => {
    setExpandedPaths(new Set());
  }, []);

  const handleToggle = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleSelectNode = (node: SourceNode) => {
    setSelectedNode(node);
    onSelectNode(node);
  };

  if (tree.roots.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-secondary text-xs py-4">
        No source files found
      </div>
    );
  }

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
            onClick={handleExpandAll}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-dropdown-item-hover transition-all"
            title="Expand All"
          >
            <ChevronsDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCollapseAll}
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
            onSelect={handleSelectNode}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </div>
  );
}

function SourceView({
  content,
  language,
}: {
  content: string;
  fileName: string;
  language?: string;
}) {
  const codeBlockRef = useRef<CodeBlockRef>(null);
  const [displayContent, setDisplayContent] = useState(content);
  const [isFormatting, setIsFormatting] = useState(false);
  const [isPrettified, setIsPrettified] = useState(false);

  // Auto-prettify when content changes if it's minified
  useEffect(() => {
    const autoPrettify = async () => {
      if (!content || content.length === 0) {
        setDisplayContent('');
        setIsPrettified(false);
        return;
      }

      // Check if code is minified
      const needsFormatting = isMinified(content);

      if (needsFormatting) {
        setIsFormatting(true);

        try {
          const result = await prettifyCode(content, language || 'javascript');

          if (result.error) {
            setDisplayContent(content);
            setIsPrettified(false);
          } else {
            setDisplayContent(result.formatted);
            setIsPrettified(true);
          }
        } catch {
          setDisplayContent(content);
          setIsPrettified(false);
        }

        setIsFormatting(false);
      } else {
        setDisplayContent(content);
        setIsPrettified(true);
      }
    };

    autoPrettify();
  }, [content, language]);

  const handleFormatClick = useCallback(() => {
    if (codeBlockRef.current) {
      try {
        codeBlockRef.current.format();
      } catch {
        // Format failed silently
      }
    }
  }, []);

  if (!content) {
    return (
      <div className="h-full flex items-center justify-center text-text-secondary">
        <div className="text-center">
          <FileCode className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Select a file to view source</p>
        </div>
      </div>
    );
  }

  // Show loading state while formatting
  if (isFormatting) {
    return (
      <div className="h-full flex items-center justify-center text-text-secondary">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-purple-400" />
          <p className="text-sm">Formatting code...</p>
        </div>
      </div>
    );
  }

  // Map language for CodeBlock
  const langMap: Record<string, string> = {
    javascript: 'javascript',
    typescript: 'typescript',
    html: 'html',
    css: 'css',
    json: 'json',
    xml: 'xml',
    jsx: 'jsx',
    tsx: 'tsx',
    js: 'javascript',
    ts: 'typescript',
  };

  const monacoLang = language ? langMap[language.toLowerCase()] || 'javascript' : 'javascript';

  return (
    <div className="h-full w-full min-h-[200px] flex flex-col">
      {/* Format toolbar */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-divider/50 shrink-0 bg-muted/5">
        <div className="flex items-center gap-2">
          {isPrettified && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
              ✓ Formatted
            </span>
          )}
        </div>
        <button
          onClick={handleFormatClick}
          className="p-1 hover:bg-secondary rounded text-text-secondary hover:text-text-primary transition-colors"
          title="Format Document (Ctrl+Shift+F)"
        >
          <AlignLeft className="w-3 h-3" />
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <CodeBlock
          ref={codeBlockRef}
          code={displayContent}
          language={monacoLang}
          showLineNumbers
          wordWrap="on"
          editorOptions={{
            readOnly: true,
            fontSize: 13,
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
            automaticLayout: true,
            formatOnType: true,
            formatOnPaste: true,
          }}
        />
      </div>
    </div>
  );
}

const STORAGE_KEY = 'phantoma-source-state';

export function SourcesPanel({ requests = [], unpackedScripts }: SourcesPanelProps) {
  const [selectedContent, setSelectedContent] = useLocalStorage<{
    content: string;
    fileName: string;
    language: string;
    isDifferent?: boolean;
    compressionRatio?: string;
  } | null>(STORAGE_KEY, null);

  // Build source tree from unpacked scripts
  const sourceTree = useMemo(() => {
    const sources: Array<{
      url: string;
      size?: number;
      scriptId?: string;
      staticSource?: string;
      unpackedSource?: string;
      isDifferent?: boolean;
      compressionRatio?: string;
    }> = [];

    // Add from unpacked scripts (preferred)
    if (unpackedScripts) {
      for (const [, script] of unpackedScripts) {
        sources.push({
          url: script.url,
          size: script.unpackedSource.length,
          scriptId: script.scriptId,
          staticSource: script.staticSource || undefined,
          unpackedSource: script.unpackedSource,
          isDifferent: script.isDifferent,
          compressionRatio: script.compressionRatio,
        });
      }
    }

    // Fallback: add from requests if not in unpacked
    requests.forEach((req) => {
      const isSource =
        req.type?.toUpperCase() === 'JS' ||
        req.type?.toUpperCase() === 'CSS' ||
        req.type?.toUpperCase() === 'HTML';

      if (isSource && req.responseBody) {
        // Check if already added from unpacked
        const alreadyExists = sources.some((s) => s.url === req.url);
        if (!alreadyExists) {
          const bodyContent =
            typeof req.responseBody === 'string'
              ? req.responseBody
              : JSON.stringify(req.responseBody);

          sources.push({
            url: req.url,
            size: bodyContent.length,
            unpackedSource: bodyContent,
          });
        }
      }
    });

    return buildSourceTree(sources);
  }, [requests, unpackedScripts]);

  const handleSelectNode = (node: SourceNode) => {
    if (node.type !== 'file') return;

    // Prefer unpacked source
    const content = node.unpackedSource || node.staticSource || '';

    setSelectedContent({
      content,
      fileName: node.name,
      language: 'javascript',
      isDifferent: node.isDifferent,
      compressionRatio: node.compressionRatio,
    });
  };

  const stats = useMemo(() => {
    let totalFiles = 0;
    let obfuscatedFiles = 0;

    function count(nodes: SourceNode[]) {
      for (const node of nodes) {
        if (node.type === 'file') {
          totalFiles++;
          if (node.isDifferent) obfuscatedFiles++;
        }
        if (node.children) count(node.children);
      }
    }

    count(sourceTree.roots);
    return { totalFiles, obfuscatedFiles };
  }, [sourceTree]);

  return (
    <div className="flex h-full w-full flex-col">
      <ResizableSplit direction="horizontal" initialSize={30} minSize={15} maxSize={50}>
        <div className="h-full bg-background border-r border-border/50 flex flex-col">
          {/* Left Panel Headbar */}
          <div className="h-10 px-3 border-b border-divider flex items-center justify-between shrink-0 bg-muted/10">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-yellow-400" />
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
              <h3 className="text-sm font-semibold text-text-primary mb-1">No Source Files</h3>
              <p className="text-xs text-text-secondary text-center max-w-[200px]">
                Navigate to a page to capture JavaScript sources
              </p>
            </div>
          ) : (
            <FileTree tree={sourceTree} onSelectNode={handleSelectNode} />
          )}
        </div>
        <div className="h-full overflow-hidden flex flex-col">
          {/* Right Panel Headbar */}
          <div className="h-10 px-3 border-b border-divider flex items-center justify-between shrink-0 bg-muted/10">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-medium text-text-primary truncate">
                {selectedContent?.fileName || 'No file selected'}
              </span>
              {selectedContent?.language && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 shrink-0">
                  {selectedContent.language.toUpperCase()}
                </span>
              )}
              {selectedContent?.isDifferent && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 shrink-0">
                  Obfuscated ({selectedContent.compressionRatio})
                </span>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <SourceView
              content={selectedContent?.content || ''}
              fileName={selectedContent?.fileName || ''}
              language={selectedContent?.language}
            />
          </div>
        </div>
      </ResizableSplit>
    </div>
  );
}

export default SourcesPanel;
