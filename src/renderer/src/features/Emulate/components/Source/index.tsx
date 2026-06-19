import { NetworkRequest } from '../../../../types/inspector';
import { useState, useMemo, useCallback } from 'react';
import { FileCode, Search, Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '../../../../shared/lib/utils';
import { ResizableSplit } from '../common/ResizableSplit';
import { CodeBlock } from '../../../../components/common/CodeBlock';

interface SourceFile {
  id: string;
  name: string;
  path: string;
  type: 'js' | 'ts' | 'html' | 'css' | 'json' | 'xml' | 'jsx' | 'tsx';
  content: string;
  size: number;
  url: string;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'folder' | 'file';
  children?: TreeNode[];
  file?: SourceFile;
  isExpanded?: boolean;
}

interface SourcesPanelProps {
  requests?: NetworkRequest[];
  onClose?: () => void;
}

// Build tree structure from file paths
function buildTree(files: SourceFile[]): TreeNode[] {
  const root: TreeNode[] = [];
  const pathMap = new Map<string, TreeNode>();

  files.forEach((file) => {
    const parts = file.path.split('/').filter(Boolean);
    let currentPath = '';
    let currentLevel = root;

    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;
      const fullPath = currentPath ? `${currentPath}/${part}` : part;

      if (isLast) {
        // It's a file
        const existingFile = currentLevel.find(
          (node) => node.name === part && node.type === 'file',
        );
        if (!existingFile) {
          const fileNode: TreeNode = {
            name: part,
            path: fullPath,
            type: 'file',
            file: file,
          };
          currentLevel.push(fileNode);
        }
      } else {
        // It's a folder
        let folder = currentLevel.find((node) => node.name === part && node.type === 'folder') as
          | TreeNode
          | undefined;

        if (!folder) {
          folder = {
            name: part,
            path: fullPath,
            type: 'folder',
            children: [],
            isExpanded: false,
          };
          currentLevel.push(folder);
        }

        currentLevel = folder.children!;
        currentPath = fullPath;
      }
    });
  });

  return root;
}

// Recursive tree component
function TreeNodeItem({
  node,
  depth,
  selectedId,
  expandedPaths,
  onSelect,
  onToggle,
}: {
  node: TreeNode;
  depth: number;
  selectedId: string | null;
  expandedPaths: Set<string>;
  onSelect: (file: SourceFile) => void;
  onToggle: (path: string) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  if (node.type === 'folder') {
    const isExpanded = expandedPaths.has(node.path);
    return (
      <div>
        <div
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded cursor-pointer transition-colors hover:bg-muted/30',
            depth > 0 && 'ml-4',
          )}
          style={{ paddingLeft: depth > 0 ? `${depth * 12 + 8}px` : '8px' }}
          onClick={() => onToggle(node.path)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-text-secondary shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-text-secondary shrink-0" />
          )}
          {isExpanded ? (
            <FolderOpen className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
          )}
          <span className="text-xs text-text-primary truncate">{node.name}</span>
          <span className="text-[9px] text-text-secondary ml-auto">
            {node.children?.length || 0}
          </span>
        </div>
        {isExpanded && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeNodeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedId={selectedId}
                expandedPaths={expandedPaths}
                onSelect={onSelect}
                onToggle={onToggle}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // File node
  const isSelected = selectedId === node.file?.id;
  const getFileIconColor = (type: string) => {
    switch (type) {
      case 'ts':
      case 'tsx':
        return 'text-blue-400';
      case 'js':
      case 'jsx':
        return 'text-yellow-400';
      case 'html':
        return 'text-orange-400';
      case 'css':
        return 'text-purple-400';
      case 'json':
        return 'text-green-400';
      case 'xml':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors',
        isSelected ? 'bg-purple-500/20 text-purple-400' : 'hover:bg-muted/30 text-text-primary',
      )}
      style={{ paddingLeft: depth > 0 ? `${depth * 12 + 20}px` : '20px' }}
      onClick={() => node.file && onSelect(node.file)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <FileCode className={cn('w-3.5 h-3.5 shrink-0', getFileIconColor(node.file?.type || 'js'))} />
      <span className="text-xs truncate flex-1">{node.name}</span>
      <span className="text-[9px] text-text-secondary shrink-0">{node.file?.size || 0} B</span>
    </div>
  );
}

function FileTree({
  files,
  onSelectFile,
}: {
  files: SourceFile[];
  onSelectFile: (content: string, fileName: string, language: string) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const filteredFiles = useMemo(() => {
    if (!searchTerm) return files;
    const term = searchTerm.toLowerCase();
    return files.filter(
      (f) => f.name.toLowerCase().includes(term) || f.path.toLowerCase().includes(term),
    );
  }, [files, searchTerm]);

  const treeData = useMemo(() => {
    if (!searchTerm) {
      return buildTree(files);
    }
    // When searching, show flat list
    return filteredFiles.map((file) => ({
      name: file.name,
      path: file.path,
      type: 'file' as const,
      file: file,
    }));
  }, [files, filteredFiles, searchTerm]);

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

  const handleSelectFile = (file: SourceFile) => {
    setSelectedId(file.id);
    let language = 'javascript';
    if (file.type === 'ts' || file.type === 'tsx') language = 'typescript';
    else if (file.type === 'css') language = 'css';
    else if (file.type === 'html') language = 'html';
    else if (file.type === 'json') language = 'json';
    else if (file.type === 'xml') language = 'xml';
    else if (file.type === 'jsx') language = 'jsx';
    onSelectFile(file.content, file.name, language);
  };

  // Flat view for search
  if (searchTerm) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-3 py-2 border-b border-divider shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 bg-input-background border border-input-border-default rounded-lg pl-8 pr-3 text-sm text-text-primary focus:border-purple-500/50 outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredFiles.map((file) => {
            const isSelected = selectedId === file.id;
            const getFileIconColor = (type: string) => {
              switch (type) {
                case 'ts':
                case 'tsx':
                  return 'text-blue-400';
                case 'js':
                case 'jsx':
                  return 'text-yellow-400';
                case 'html':
                  return 'text-orange-400';
                case 'css':
                  return 'text-purple-400';
                case 'json':
                  return 'text-green-400';
                case 'xml':
                  return 'text-red-400';
                default:
                  return 'text-gray-400';
              }
            };
            return (
              <div
                key={file.id}
                onClick={() => handleSelectFile(file)}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
                  isSelected
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'hover:bg-muted/30 text-text-primary',
                )}
              >
                <FileCode className={cn('w-3.5 h-3.5', getFileIconColor(file.type))} />
                <span className="text-xs truncate flex-1">{file.name}</span>
                <span className="text-[9px] text-text-secondary">{file.size} B</span>
              </div>
            );
          })}
          {filteredFiles.length === 0 && (
            <div className="text-center text-text-secondary text-xs py-4">
              No source files found
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-divider shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 bg-input-background border border-input-border-default rounded-lg pl-8 pr-3 text-sm text-text-primary focus:border-purple-500/50 outline-none"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-1">
        {treeData.map((node) => (
          <TreeNodeItem
            key={node.path}
            node={node}
            depth={0}
            selectedId={selectedId}
            expandedPaths={expandedPaths}
            onSelect={handleSelectFile}
            onToggle={handleToggle}
          />
        ))}
        {treeData.length === 0 && (
          <div className="text-center text-text-secondary text-xs py-4">No source files found</div>
        )}
      </div>
    </div>
  );
}

function SourceView({
  content,
  fileName,
  language,
}: {
  content: string;
  fileName: string;
  language?: string;
}) {
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
    <div className="h-full w-full min-h-[200px]">
      <CodeBlock
        code={content}
        language={monacoLang}
        showLineNumbers
        wordWrap="on"
        editorOptions={{
          readOnly: true,
          fontSize: 13,
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          automaticLayout: true,
        }}
      />
    </div>
  );
}

export function SourcesPanel({ requests = [], onClose }: SourcesPanelProps) {
  const [selectedContent, setSelectedContent] = useState<{
    content: string;
    fileName: string;
    language: string;
  } | null>(null);

  const sourceFiles = useMemo(() => {
    const files: SourceFile[] = [];
    requests.forEach((req) => {
      const isSource =
        req.type?.toUpperCase() === 'JS' ||
        req.type?.toUpperCase() === 'CSS' ||
        req.type?.toUpperCase() === 'HTML' ||
        req.path?.match(/\.(js|ts|jsx|tsx|css|html|json|xml)$/i);
      if (isSource && req.responseBody) {
        const ext = req.path.split('.').pop()?.toLowerCase() || '';
        let type: SourceFile['type'] = 'js';
        if (ext === 'ts' || ext === 'tsx') type = ext as SourceFile['type'];
        else if (ext === 'jsx') type = 'jsx';
        else if (ext === 'css') type = 'css';
        else if (ext === 'html') type = 'html';
        else if (ext === 'json') type = 'json';
        else if (ext === 'xml') type = 'xml';
        else type = 'js';
        files.push({
          id: req.id,
          name: req.path.split('/').pop() || req.path,
          path: req.path,
          type,
          content: req.responseBody,
          size: req.responseBody?.length || 0,
          url: req.url,
        });
      }
    });
    return files.sort((a, b) => a.name.localeCompare(b.name));
  }, [requests]);

  const handleSelectFile = (content: string, fileName: string, language: string) => {
    setSelectedContent({ content, fileName, language });
  };

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
            <span className="text-[10px] text-text-secondary">{sourceFiles.length} files</span>
          </div>
          {sourceFiles.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="w-16 h-16 rounded-xl bg-purple-500/15 flex items-center justify-center mb-4 border border-purple-500/25">
                <FileCode className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-sm font-semibold text-text-primary mb-1">No Source Files</h3>
              <p className="text-xs text-text-secondary text-center max-w-[200px]">
                Navigate to a page with JS, CSS, or HTML assets
              </p>
            </div>
          ) : (
            <FileTree files={sourceFiles} onSelectFile={handleSelectFile} />
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
