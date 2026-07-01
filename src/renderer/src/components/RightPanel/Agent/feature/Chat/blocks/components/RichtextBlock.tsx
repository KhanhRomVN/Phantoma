import React, { useState } from 'react';
import FileIcon from '@renderer/components/common/FileIcon';
import { cn } from '@renderer/shared/lib/utils';

interface RichtextBlockProps {
  content: string;
  title?: string;
  prefix?: string;
  statusColor?: string;
  defaultCollapsed?: boolean;
  headerActions?: React.ReactNode;
  maxHeight?: string | number;
  showHeader?: boolean;
  isFilePathList?: boolean; // New prop for list_files output
  onFileClick?: (fullPath: string) => void; // Callback when a file is clicked
  basePath?: string; // Base folder path for reconstructing full paths
}

export const RichtextBlock: React.FC<RichtextBlockProps> = ({
  content,
  title,
  prefix,
  statusColor,
  defaultCollapsed = true,
  headerActions,
  maxHeight,
  showHeader = true,
  isFilePathList = false,
  onFileClick,
  basePath = '',
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const contentStyle: React.CSSProperties = {
    maxHeight: maxHeight || undefined,
    overflowY: maxHeight ? 'auto' : undefined,
  };

  const renderFileTree = () => {
    if (!content) return null;

    const lines = content.split('\n').filter((l) => l.trim().length > 0);

    // Track folder stack per indent level to reconstruct full paths
    const folderStack: string[] = [];

    return (
      <div className="flex flex-col gap-0.5 py-2">
        {lines.map((line, idx) => {
          // Detect indentation (starts with spaces)
          const indentMatch = line.match(/^(\s*)/);
          const indentLevel = indentMatch ? indentMatch[1].length / 2 : 0;
          const cleanLine = line.trim();

          // Determine if it's a folder (ends with /)
          const isFolder = cleanLine.endsWith('/');
          const namePart = isFolder ? cleanLine.slice(0, -1) : cleanLine;

          // Split name and line count (e.g. "filename (10 lines)")
          const lineCountMatch = namePart.match(/^(.*)\s+\((\d+)\s+lines\)$/);
          const name = lineCountMatch ? lineCountMatch[1] : namePart;
          const lineCount = lineCountMatch ? lineCountMatch[2] : null;

          // Update folder stack based on current indent level
          folderStack.splice(indentLevel);
          if (isFolder) {
            folderStack[indentLevel] = name;
          }

          // Reconstruct full path
          const parentPath = folderStack.slice(0, indentLevel).join('/');
          const relativePath = parentPath ? `${parentPath}/${name}` : name;
          const fullPath = basePath ? `${basePath}/${relativePath}` : relativePath;

          const isClickable = !isFolder && !!onFileClick;

          return (
            <div
              key={idx}
              onClick={isClickable ? () => onFileClick!(fullPath) : undefined}
              className={cn(
                'flex items-center gap-1.5 text-[13px] h-6 rounded transition-colors duration-[0.15s]',
                isClickable ? 'cursor-pointer' : 'cursor-default'
              )}
              style={{ paddingLeft: `${indentLevel * 16 + 8}px` }}
              onMouseEnter={
                isClickable
                  ? (e) => {
                      e.currentTarget.style.background =
                        'var(--sidebar-item-hover, rgba(255,255,255,0.06))';
                    }
                  : undefined
              }
              onMouseLeave={
                isClickable
                  ? (e) => {
                      e.currentTarget.style.background = 'transparent';
                    }
                  : undefined
              }
            >
              <FileIcon
                path={name}
                isFolder={isFolder}
                style={{ width: '16px', height: '16px', opacity: 0.9 }}
              />
              <span className="text-primary opacity-90 whitespace-nowrap overflow-hidden text-ellipsis">
                {name}
                {isFolder && '/'}
              </span>
              {lineCount && (
                <span className="text-secondary text-[11px] opacity-60 ml-1">
                  {lineCount} lines
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const SummaryView = () => (
    <div
      className="!bg-transparent transition-opacity duration-200 hover:opacity-90 cursor-pointer flex items-center gap-2 py-2 text-[13px]"
      onClick={() => setIsCollapsed(!isCollapsed)}
    >
      <span className="codicon codicon-chevron-right text-xs opacity-70" />
      {statusColor && (
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{ backgroundColor: statusColor }}
        />
      )}
      {prefix && (
        <span className="font-medium text-primary">
          {prefix}
        </span>
      )}
      <span className="text-primary">
        {title || 'Output'}
      </span>
      {headerActions && (
        <div className="flex items-center gap-2 ml-auto">
          {headerActions}
        </div>
      )}
    </div>
  );

  const ExpandedView = () => (
    <div className="bg-background border">
      <div
        className="flex justify-between items-center py-1.5 px-0 bg-[var(--sidebar-background,rgba(0,0,0,0.1))] border-b text-primary text-[13px] select-none cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <span className="codicon codicon-chevron-down text-xs opacity-70" />
          {statusColor && (
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: statusColor }}
            />
          )}
          {prefix && <span className="font-semibold opacity-80 text-xs">{prefix}</span>}
          <span className="font-medium text-xs text-primary">
            {title || 'Output'}
          </span>
        </div>
        <div className="flex items-center gap-2">{headerActions}</div>
      </div>
      <div className="px-3 py-2 max-h-[300px] overflow-y-auto" style={contentStyle}>
        {isFilePathList ? (
          renderFileTree()
        ) : (
          <pre className="m-0 font-mono text-xs whitespace-pre-wrap break-all text-primary bg-none">
            <code className="bg-none p-0">{content}</code>
          </pre>
        )}
      </div>
    </div>
  );

  return (
    <div className={cn('mb-3 overflow-hidden rounded-md', isCollapsed && '!bg-transparent mb-2')}>
      {!showHeader ? (
        <div className="bg-background border">
          <div className="px-3 py-2 max-h-[300px] overflow-y-auto" style={contentStyle}>
            {isFilePathList ? (
              renderFileTree()
            ) : (
              <pre className="m-0 font-mono text-xs whitespace-pre-wrap break-all text-primary bg-none">
                <code className="bg-none p-0">{content}</code>
              </pre>
            )}
          </div>
        </div>
      ) : isCollapsed ? (
        <SummaryView />
      ) : (
        <ExpandedView />
      )}
    </div>
  );
};