import { NetworkRequest } from '../../../../types/inspector';
import { cn } from '../../../../shared/lib/utils';
import { Code, GitBranch, FileCode, User, Link } from 'lucide-react';
import { useAccentColors } from '../../../../shared/hooks/useAccentColors';
import { useTheme } from '../../../../theme/ThemeProvider';

interface InitiatorDetailsProps {
  request: NetworkRequest;
  searchTerm?: string;
}

interface InitiatorInfo {
  type: string;
  url?: string;
  lineNumber?: number;
  columnNumber?: number;
  functionName?: string;
  stack?: Array<{
    functionName: string;
    url: string;
    lineNumber: number;
    columnNumber: number;
  }>;
}

interface StackFrame {
  functionName: string;
  url: string;
  lineNumber: number;
  columnNumber: number;
}

function StackFrameLine({
  frame,
  index,
  accentColor,
  onNavigateToSource,
}: {
  frame: StackFrame;
  index: number;
  accentColor: string;
  onNavigateToSource?: (url: string, line: number, col: number, functionName: string) => void;
}) {
  const functionName = frame.functionName || '(anonymous)';
  const url = frame.url || '';
  const line = frame.lineNumber || 0;
  const col = frame.columnNumber || 0;

  // Parse URL to get filename
  const filename = url.split('/').pop() || url;

  const handleClick = () => {
    if (onNavigateToSource && url) {
      onNavigateToSource(url, line, col, functionName);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 py-1 font-mono text-[13px] leading-relaxed rounded px-2 transition-colors',
        url ? 'hover:bg-muted/10 cursor-pointer' : 'hover:bg-transparent',
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={url ? 0 : -1}
      title={url ? 'Ctrl+Click to open in Source panel' : ''}
    >
      <span className="text-text-secondary select-none opacity-30 w-7 text-right shrink-0 text-[12px]">
        {index + 1}
      </span>
      <span
        className={cn(
          'truncate max-w-[280px] shrink-0 font-medium',
          url ? 'text-primary hover:underline' : '',
        )}
        style={url ? {} : { color: accentColor }}
      >
        {functionName}
      </span>
      <span className="text-text-secondary opacity-40">@</span>
      <span className="text-text-primary truncate font-medium">{filename}</span>
      <span className="text-text-secondary opacity-60 shrink-0 text-[12px]">
        :{line}:{col}
      </span>
    </div>
  );
}

function InitiatorInfoDisplay({
  initiator,
  onNavigateToSource,
}: {
  initiator: InitiatorInfo | null;
  onNavigateToSource?: (url: string, line: number, col: number, functionName: string) => void;
}) {
  const { accentColors, UNIFIED_ACCENT } = useAccentColors();
  const { currentPreset } = useTheme();
  const accentColor = currentPreset?.tailwind?.primary || '#3b82f6';

  if (!initiator) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-secondary py-12">
        <GitBranch className="w-10 h-10 opacity-20 mb-3" />
        <p className="text-sm font-medium">No initiator information</p>
        <p className="text-xs opacity-70 mt-1">This request was initiated by the browser</p>
      </div>
    );
  }

  const getTypeColor = (type: string): string => {
    const colors = accentColors || [accentColor, '#8b5cf6', '#10b981', '#f59e0b'];
    switch (type) {
      case 'script':
        return `text-[${colors[0] || accentColor}] bg-[${colors[0] || accentColor}]/10 border-[${colors[0] || accentColor}]/20`;
      case 'parser':
        return `text-[${colors[1] || accentColor}] bg-[${colors[1] || accentColor}]/10 border-[${colors[1] || accentColor}]/20`;
      case 'navigation':
        return `text-[${colors[2] || '#10b981'}] bg-[${colors[2] || '#10b981'}]/10 border-[${colors[2] || '#10b981'}]/20`;
      case 'preload':
        return `text-[${colors[3] || '#f59e0b'}] bg-[${colors[3] || '#f59e0b'}]/10 border-[${colors[3] || '#f59e0b'}]/20`;
      default:
        return 'text-text-secondary bg-muted/10 border-border';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'script':
        return <Code className="w-3.5 h-3.5" />;
      case 'parser':
        return <FileCode className="w-3.5 h-3.5" />;
      case 'navigation':
        return <Link className="w-3.5 h-3.5" />;
      case 'preload':
        return <GitBranch className="w-3.5 h-3.5" />;
      default:
        return <User className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="flex flex-col h-full p-4 space-y-3">
      {/* Source location - compact */}
      {initiator.url &&
        (initiator.lineNumber !== undefined || initiator.columnNumber !== undefined) && (
          <div className="flex items-center gap-3 text-sm text-text-secondary mb-1 pb-2 border-b border-border/30">
            <FileCode className="w-4 h-4 text-text-secondary shrink-0" />
            <span className="font-mono text-text-primary truncate text-[13px]">
              {initiator.url}
              {initiator.lineNumber !== undefined && (
                <span className="text-text-secondary">
                  :{initiator.lineNumber}
                  {initiator.columnNumber !== undefined && `:${initiator.columnNumber}`}
                </span>
              )}
            </span>
            {initiator.functionName && (
              <span className="text-[11px] text-text-secondary shrink-0">
                <span className="opacity-50">in</span>{' '}
                <span className="font-mono font-medium" style={{ color: accentColor }}>
                  {initiator.functionName}
                </span>
              </span>
            )}
          </div>
        )}

      {/* Stack trace - direct, no wrapper box */}
      {initiator.stack && initiator.stack.length > 0 && (
        <div className="flex-1 min-h-0 overflow-auto">
          {initiator.stack.map((frame, index) => (
            <StackFrameLine
              key={index}
              frame={frame}
              index={index}
              accentColor={accentColor}
              onNavigateToSource={onNavigateToSource}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function InitiatorDetails({ request, searchTerm }: InitiatorDetailsProps) {
  // Parse initiator from request
  const initiator = request.initiator
    ? typeof request.initiator === 'string'
      ? { type: request.initiator }
      : request.initiator
    : null;

  // If initiator is a string, convert to object
  const initiatorInfo: InitiatorInfo | null = initiator
    ? typeof initiator === 'string'
      ? { type: initiator }
      : {
          type: initiator.type || 'other',
          url: initiator.url,
          lineNumber: initiator.lineNumber,
          columnNumber: initiator.columnNumber,
          functionName: initiator.functionName,
          stack: initiator.stack,
        }
    : null;

  const handleNavigateToSource = (url: string, line: number, col: number, functionName: string) => {
    // Emit event to navigate to source
    const event = new CustomEvent('navigate-to-source', {
      detail: { url, line, col, functionName },
    });
    window.dispatchEvent(event);
  };

  return (
    <div className="h-full overflow-auto bg-background">
      <InitiatorInfoDisplay initiator={initiatorInfo} onNavigateToSource={handleNavigateToSource} />
    </div>
  );
}

export default InitiatorDetails;
