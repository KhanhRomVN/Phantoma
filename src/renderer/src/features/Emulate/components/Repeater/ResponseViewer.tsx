import { useState, useRef } from 'react';
import { cn } from '../../../../shared/lib/utils';
import { CodeBlock, CodeBlockRef } from '../../../../components/common/CodeBlock';
import { useAccentColors } from '../../../../shared/hooks/useAccentColors';

interface ResponseViewerProps {
  headers?: Record<string, string>;
  body?: string;
  status?: number;
  contentType?: string;
  className?: string;
  onHeightChange?: (newHeight: number) => void;
}

export function ResponseViewer({
  headers,
  body,
  status,
  contentType,
  className,
  onHeightChange,
}: ResponseViewerProps) {
  // [DEBUG] ResponseViewer render
  console.log('[DEBUG] ResponseViewer rendered', {
    hasHeaders: !!headers && Object.keys(headers).length > 0,
    hasBody: !!body,
    status,
    contentType,
  });

  const [activeTab, setActiveTab] = useState<'headers' | 'body'>('headers');
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [height, setHeight] = useState<number | null>(null);
  const codeBlockRef = useRef<CodeBlockRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number>(0);
  const dragStartHeight = useRef<number>(0);
  const { PRIMARY_RGB } = useAccentColors();

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartY.current = e.clientY;
    
    // Get actual computed height
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      dragStartHeight.current = rect.height;
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      // When dragging UP (negative clientY change), deltaY is positive -> increase height
      const deltaY = dragStartY.current - moveEvent.clientY;
      const newHeight = Math.max(180, dragStartHeight.current + deltaY);
      setHeight(newHeight);
      onHeightChange?.(newHeight);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
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

  const formatBody = (content: string): string => {
    if (!content) return content;
    const trimmed = content.trim();
    try {
      const parsed = JSON.parse(trimmed);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return content;
    }
  };

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
      if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
      ) {
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

  // Apply height override if dragging has set a custom height
  const containerStyle: React.CSSProperties = height !== null 
    ? { height: `${height}px`, flexGrow: 0, flexShrink: 0 }
    : {};

  return (
    <div 
      ref={containerRef} 
      className={cn('flex flex-col overflow-hidden bg-background flex-1 relative', className)}
      style={containerStyle}
    >
      {/* Resize handle */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 cursor-ns-resize z-10',
          isHovering || isDragging ? 'h-[3px]' : 'h-[2px]',
        )}
        style={{
          backgroundColor: isHovering || isDragging ? `rgb(${PRIMARY_RGB})` : 'transparent',
        }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => !isDragging && setIsHovering(false)}
        onMouseDown={handleMouseDown}
      />
      
      {/* Header bar with tabs and status */}
      <div className="flex items-center justify-between border-b border-border shrink-0 bg-table-headerBg/50 overflow-x-auto">
        {/* Left: Tabs */}
        <div className="flex items-center">
          {headers && Object.keys(headers).length > 0 && (
            <button
              onClick={() => setActiveTab('headers')}
              className={cn(
                'flex items-center gap-1.5 px-3 h-8 text-xs font-medium whitespace-nowrap transition-all border-b-2',
                activeTab === 'headers'
                  ? 'border-primary text-text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-dropdown-item-hover/30',
              )}
            >
              Header
              <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded text-[10px] font-bold">
                {Object.keys(headers).length}
              </span>
            </button>
          )}
          {body && (
            <button
              onClick={() => setActiveTab('body')}
              className={cn(
                'flex items-center gap-1.5 px-3 h-8 text-xs font-medium whitespace-nowrap transition-all border-b-2',
                activeTab === 'body'
                  ? 'border-primary text-text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-dropdown-item-hover/30',
              )}
            >
              Body
            </button>
          )}
        </div>

        {/* Right: Status info */}
        <div className="flex items-center gap-3 px-3 h-8 shrink-0">
          {status && (
            <>
              <span className="text-xs font-medium text-text-secondary">Status:</span>
              <span className={cn('text-xs font-bold', getStatusColor(status))}>{status}</span>
              <span className="text-xs text-text-secondary">
                {status >= 200 && status < 300 ? 'OK' : status >= 400 ? 'Error' : 'Redirect'}
              </span>
            </>
          )}
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
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {activeTab === 'headers' && headers && Object.keys(headers).length > 0 && (
          <div className="flex-1 overflow-auto p-3">
            {Object.entries(headers).map(([key, value], index) => (
              <div
                key={key}
                className={cn(
                  'flex items-start gap-2 px-2 py-1 text-xs font-mono',
                  index !== Object.keys(headers).length - 1 && 'border-b border-border/30',
                )}
              >
                <span className="font-bold text-text-secondary shrink-0">{key}:</span>
                <span className="text-text-primary break-all">{value}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'body' && body && (
          <div className="flex-1 min-h-0 overflow-hidden">
            <CodeBlock
              ref={codeBlockRef}
              code={formatBody(body)}
              language={language}
              className="h-full"
              showLineNumbers
              wordWrap="on"
            />
          </div>
        )}
      </div>
    </div>
  );
}
