import { ResizableSplit } from '../../../../../../core/components/common/ResizableSplit';
import { NetworkRequest } from '../../../../../../types/inspector';
import { useState, useMemo } from 'react';
import { FileCode, Search, X } from 'lucide-react';
import { cn } from '../../../../../../shared/lib/utils';

interface SourceFile {
  id: string;
  name: string;
  path: string;
  type: 'js' | 'ts' | 'html' | 'css' | 'json' | 'xml';
  content: string;
  size: number;
  url: string;
}

interface SourcesPanelProps {
  requests?: NetworkRequest[];
  onClose?: () => void;
}

function SourceCodeView({
  content,
  fileName,
  language,
  onClose,
}: {
  content: string;
  fileName: string;
  language?: string;
  onClose?: () => void;
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

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-divider flex items-center justify-between shrink-0 bg-muted/20">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-text-primary">{fileName}</span>
          {language && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">
              {language.toUpperCase()}
            </span>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded hover:bg-muted">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-auto p-4">
        <pre className="text-xs font-mono text-text-primary whitespace-pre-wrap break-all">
          {content}
        </pre>
      </div>
    </div>
  );
}

function FileTree({
  requests,
  onSelectFile,
}: {
  requests: NetworkRequest[];
  onSelectFile: (content: string, fileName: string, language: string) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sourceFiles = useMemo(() => {
    const files: SourceFile[] = [];
    requests.forEach((req) => {
      const isSource =
        req.type === 'JS' ||
        req.type === 'CSS' ||
        req.type === 'HTML' ||
        req.path?.match(/\.(js|ts|jsx|tsx|css|html|json|xml)$/i);
      if (isSource && req.responseBody) {
        const ext = req.path.split('.').pop()?.toLowerCase() || '';
        let type: SourceFile['type'] = 'js';
        if (ext === 'ts' || ext === 'tsx') type = 'ts';
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

  const filteredFiles = useMemo(() => {
    if (!searchTerm) return sourceFiles;
    const term = searchTerm.toLowerCase();
    return sourceFiles.filter(
      (f) => f.name.toLowerCase().includes(term) || f.path.toLowerCase().includes(term),
    );
  }, [sourceFiles, searchTerm]);

  const getFileIconColor = (type: string) => {
    switch (type) {
      case 'ts':
        return 'text-blue-400';
      case 'js':
        return 'text-yellow-400';
      case 'html':
        return 'text-orange-400';
      case 'css':
        return 'text-purple-400';
      case 'json':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  const handleSelectFile = (file: SourceFile) => {
    setSelectedId(file.id);
    let language = 'javascript';
    if (file.type === 'ts') language = 'typescript';
    else if (file.type === 'css') language = 'css';
    else if (file.type === 'html') language = 'html';
    else if (file.type === 'json') language = 'json';
    else if (file.type === 'xml') language = 'xml';
    onSelectFile(file.content, file.name, language);
  };

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
        {filteredFiles.map((file) => (
          <div
            key={file.id}
            onClick={() => handleSelectFile(file)}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
              selectedId === file.id
                ? 'bg-purple-500/20 text-purple-400'
                : 'hover:bg-muted/30 text-text-primary',
            )}
          >
            <FileCode className={cn('w-3.5 h-3.5', getFileIconColor(file.type))} />
            <span className="text-xs truncate flex-1">{file.name}</span>
            <span className="text-[9px] text-text-secondary">{file.size} B</span>
          </div>
        ))}
        {filteredFiles.length === 0 && (
          <div className="text-center text-text-secondary text-xs py-4">No source files found</div>
        )}
      </div>
    </div>
  );
}

export function SourcesPanel({ requests = [], onClose }: SourcesPanelProps) {
  const [selectedContent, setSelectedContent] = useState<{
    content: string;
    fileName: string;
    language: string;
  } | null>(null);

  const sourceRequests = requests.filter(
    (r) =>
      r.type === 'JS' ||
      r.type === 'CSS' ||
      r.type === 'HTML' ||
      r.path?.match(/\.(js|ts|jsx|tsx|css|html|json|xml)$/i),
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-divider shrink-0 flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-10 rounded-lg bg-purple-500/15 border border-purple-500/25 shrink-0">
          <FileCode className="w-4 h-4 text-purple-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-bold text-text-primary">Sources</h2>
          <p className="text-xs text-text-secondary mt-0.5">JS, CSS, HTML and other source files</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded text-text-secondary hover:text-red-400 hover:bg-red-500/10"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Horizontal split: File tree left, Code view right */}
      <div className="flex-1 overflow-hidden">
        <ResizableSplit direction="vertical" initialSize={35} minSize={20} maxSize={60}>
          <div className="h-full bg-background border-r border-border/50 flex flex-col">
            {sourceRequests.length === 0 ? (
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
              <FileTree
                requests={sourceRequests}
                onSelectFile={(content, fileName, language) =>
                  setSelectedContent({ content, fileName, language })
                }
              />
            )}
          </div>
          <div className="h-full overflow-hidden">
            <SourceCodeView
              content={selectedContent?.content || ''}
              fileName={selectedContent?.fileName || ''}
              language={selectedContent?.language}
            />
          </div>
        </ResizableSplit>
      </div>
    </div>
  );
}

export default SourcesPanel;
