import { useState, useRef, useEffect } from 'react';
import { Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../../../../shared/lib/utils';
import { CodeBlock } from '../../../../components/common/CodeBlock';

interface ResponseViewerProps {
  headers?: Record<string, string>;
  body?: string;
  status?: number;
  contentType?: string;
  className?: string;
}

export function ResponseViewer({ headers, body, status, contentType, className }: ResponseViewerProps) {
  const [copied, setCopied] = useState(false);
  const [showHeaders, setShowHeaders] = useState(true);
  const [showBody, setShowBody] = useState(true);
  const [height, setHeight] = useState(40); // percentage
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Resize handle logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const parentHeight = containerRef.current.parentElement?.clientHeight || 400;
      const newHeight = ((e.clientY - rect.top) / parentHeight) * 100;
      setHeight(Math.min(Math.max(newHeight, 15), 40));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = (code?: number) => {
    if (!code) return 'text-text-secondary';
    if (code >= 200 && code < 300) return 'text-success';
    if (code >= 300 && code < 400) return 'text-warning';
    if (code >= 400) return 'text-error';
    return 'text-text-secondary';
  };

  const hasContent = headers || body;

  if (!hasContent) {
    return (
      <div className={cn('flex items-center justify-center h-full text-text-secondary', className)}>
        <span className="text-xs">No response data available</span>
      </div>
    );
  }

  const detectLanguage = (contentType?: string, body?: string): string => {
    if (contentType) {
      if (contentType.includes('json')) return 'json';
      if (contentType.includes('html')) return 'html';
      if (contentType.includes('xml')) return 'xml';
      if (contentType.includes('javascript') || contentType.includes('js')) return 'javascript';
      if (contentType.includes('css')) return 'css';
      if (contentType.includes('text/plain')) return 'text';
    }
    if (body) {
      const trimmed = body.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
          (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          JSON.parse(trimmed);
          return 'json';
        } catch {
          return 'text';
        }
      }
      if (trimmed.startsWith('<') && trimmed.includes('>')) return 'html';
    }
    return 'text';
  };

  const language = detectLanguage(contentType, body);

  return (
    <div ref={containerRef} className={cn('flex flex-col overflow-hidden bg-background', className)} style={{ height: `${height}%` }}>
      {/* Resize handle */}
      <div
        className="h-1.5 cursor-row-resize hover:bg-primary/30 transition-colors shrink-0 relative group"
        onMouseDown={() => setIsDragging(true)}
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-0.5 bg-primary/50 rounded-full"></div>
        </div>
      </div>
      {/* Status bar */}
      {status && (
        <div className="flex items-center gap-3 px-3 py-1.5 border-b border-border shrink-0 bg-table-headerBg">
          <span className="text-xs font-medium text-text-secondary">Status:</span>
          <span className={cn('text-xs font-bold', getStatusColor(status))}>{status}</span>
          <span className="text-xs text-text-secondary">
            {status >= 200 && status < 300 ? 'OK' : status >= 400 ? 'Error' : 'Redirect'}
          </span>
          {contentType && (
            <>
              <span className="w-px h-4 bg-border" />
              <span className="text-xs text-text-secondary">{contentType}</span>
            </>
          )}
          {body && (
            <>
              <span className="w-px h-4 bg-border" />
              <span className="text-xs text-text-secondary">{new Blob([body]).size} bytes</span>
            </>
          )}
        </div>
      )}

      {/* Headers section */}
      {headers && Object.keys(headers).length > 0 && (
        <div className="border-b border-border shrink-0">
          <button
            onClick={() => setShowHeaders(!showHeaders)}
            className="flex items-center gap-1.5 px-3 py-1 w-full hover:bg-dropdown-item-hover/30 transition-colors text-left"
          >
            {showHeaders ? <ChevronDown className="w-3.5 h-3.5 text-text-secondary" /> : <ChevronRight className="w-3.5 h-3.5 text-text-secondary" />}
            <span className="text-[10px] font-bold text-text-secondary uppercase">Response Headers</span>
            <span className="text-[10px] text-text-secondary ml-auto">{Object.keys(headers).length} headers</span>
          </button>
          {showHeaders && (
            <div className="px-3 pb-2 max-h-40 overflow-auto">
              <div className="bg-input-background/50 rounded border border-border/50">
                {Object.entries(headers).map(([key, value], index) => (
                  <div
                    key={key}
                    className={cn(
                      'flex items-start gap-2 px-2 py-1 text-xs font-mono',
                      index !== Object.keys(headers).length - 1 && 'border-b border-border/30'
                    )}
                  >
                    <span className="font-bold text-text-secondary shrink-0">{key}:</span>
                    <span className="text-text-primary break-all">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Body section */}
      {body && (
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between px-3 py-1 border-b border-border shrink-0 bg-table-headerBg">
            <button
              onClick={() => setShowBody(!showBody)}
              className="flex items-center gap-1.5 hover:text-text-primary transition-colors"
            >
              {showBody ? <ChevronDown className="w-3.5 h-3.5 text-text-secondary" /> : <ChevronRight className="w-3.5 h-3.5 text-text-secondary" />}
              <span className="text-[10px] font-bold text-text-secondary uppercase">Response Body</span>
            </button>
            {body && (
              <button
                onClick={() => handleCopy(body)}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-text-secondary hover:text-text-primary hover:bg-dropdown-item-hover/50 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>
          {showBody && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <CodeBlock
                code={body}
                language={language}
                className="h-full"
                showLineNumbers
                wordWrap="on"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}