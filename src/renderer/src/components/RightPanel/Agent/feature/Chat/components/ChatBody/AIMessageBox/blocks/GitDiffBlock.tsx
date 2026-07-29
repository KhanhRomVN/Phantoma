import React, { useState } from 'react';
import FileIcon from '@renderer/components/common/FileIcon';
import { $ } from '@renderer/utils/color';
import { TagHeader } from '../TagHeader';

export interface GitDiffBlockProps {
  filePath: string;
  diffContent: string;
  added?: number;
  deleted?: number;
  isPartial?: boolean;
  statusColor?: string;
  onFileClick?: (filePath: string) => void;
  branch?: string;
}

const GitDiffBlock: React.FC<GitDiffBlockProps> = ({
  filePath,
  diffContent,
  added = 0,
  deleted = 0,
  isPartial = false,
  statusColor = $('--success') || '#3fb950',
  onFileClick,
  branch,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Parse and filter diff content to remove metadata lines and markers
  const parseDiffContent = (content: string): { lines: string[]; types: string[] } => {
    const rawLines = content.split('\n');
    const lines: string[] = [];
    const types: string[] = [];
    let inHunk = false;

    for (const line of rawLines) {
      // Skip diff lines (metadata) - includes "diff", "diff --git", etc.
      if (line.startsWith('diff')) continue;

      // Skip index lines (metadata)
      if (line.startsWith('index ')) continue;

      // Skip --- and +++ file headers (not file content)
      if (line.startsWith('--- ') || line.startsWith('+++ ')) continue;

      // Skip @@ hunk headers (not file content)
      if (line.startsWith('@@')) {
        inHunk = true;
        continue;
      }

      // Skip git metadata lines (new file mode, etc.)
      if (line.startsWith('new file mode')) continue;
      if (line.startsWith('deleted file mode')) continue;

      // Skip trailing git metadata (no newline at end of file)
      if (line.includes('No newline at end of file')) continue;

      // Process lines within hunks
      if (inHunk) {
        let content = line;
        let type = 'context';

        // Strip leading +, -, or space and track the type
        if (line.startsWith('+') && !line.startsWith('+++')) {
          content = line.substring(1);
          type = 'added';
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          content = line.substring(1);
          type = 'removed';
        } else if (line.startsWith(' ')) {
          content = line.substring(1);
          type = 'context';
        } else if (line === '') {
          content = '';
          type = 'empty';
        } else {
          // If we're in a hunk and hit something unexpected, treat as context
          content = line;
          type = 'context';
        }

        // Only keep non-empty lines or show empty as a blank line
        if (content !== '' || line === '') {
          lines.push(content);
          types.push(type);
        }
      } else {
        // Before first hunk, if there's any meaningful content, keep it as context
        if (line.trim() !== '') {
          lines.push(line);
          types.push('context');
        }
      }
    }

    return { lines, types };
  };

  // Render diff lines with colors based on type
  const renderDiffLines = (content: string) => {
    const { lines, types } = parseDiffContent(content);
    return lines.map((line, index) => {
      const type = types[index] || 'context';
      let color = $('--text-primary');
      let backgroundColor = 'transparent';

      if (type === 'added') {
        color = $('--success') || '#3fb950';
        backgroundColor =
          `color-mix(in srgb, ${$('--success')} 12%, transparent)`;
      } else if (type === 'removed') {
        color = $('--error') || '#f14c4c';
        backgroundColor =
          `color-mix(in srgb, ${$('--error')} 12%, transparent)`;
      } else if (type === 'empty') {
        color = 'transparent';
        backgroundColor = 'transparent';
        // Render empty line with height
        return (
          <div
            key={index}
            style={{
              padding: '0 8px',
              height: '20px',
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
              fontSize: '12px',
              lineHeight: '1.5',
            }}
          />
        );
      }

      return (
        <div
          key={index}
          style={{
            padding: '0 8px',
            color,
            backgroundColor,
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            fontSize: '12px',
            lineHeight: '1.5',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            minHeight: '20px',
          }}
        >
          {line}
        </div>
      );
    });
  };

  const fileName = filePath.split('/').pop() || filePath;

  // Header title — matching Zen's header structure
  const headerTitle = (
    <div className="terminal-name contents">
      <div className="flex items-center gap-2 text-xs text-primary">
        <span className="font-semibold opacity-80">DIFF{branch ? `(${branch})` : ''}</span>
        <FileIcon path={filePath} style={{ width: '14px', height: '14px', flexShrink: 0 }} />
        <span
          className="font-medium opacity-90 font-mono text-[11px]"
          style={{ cursor: onFileClick ? 'pointer' : 'default' }}
          onClick={(e) => {
            e.stopPropagation();
            if (onFileClick) onFileClick(filePath);
          }}
          title={onFileClick ? 'Click để mở file' : ''}
        >
          {fileName}
        </span>
        {(added > 0 || deleted > 0) && (
          <>
            <span className="text-success font-semibold text-[11px]">+{added}</span>
            <span className="text-error font-semibold text-[11px]">-{deleted}</span>
          </>
        )}
        {isPartial && (
          <span className="codicon codicon-loading codicon-modifier-spin text-xs opacity-60" />
        )}
        <span className="codicon codicon-git-pull-request text-sm ml-0.5" />
      </div>
    </div>
  );

  const handleHeaderClick = () => {
    // Only toggle if there's diff content
    if (diffContent) {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <div className="terminal-block git-diff-block mb-2 bg-transparent rounded-none overflow-visible [&_.terminal-block-header]:border-b-0 [&_.terminal-block-header]:bg-transparent [&_.terminal-block-header:hover]:bg-transparent">
      <TagHeader
        title={headerTitle}
        statusColor={statusColor}
        isPartial={isPartial}
        onClick={handleHeaderClick}
        path={filePath}
        onPathClick={() => {
          if (onFileClick) onFileClick(filePath);
        }}
      />

      {/* File path connector — matching Zen's decorative element */}
      {filePath && (
        <div
          className="flex justify-end items-center pr-1 pt-1 mt-0.5 relative w-full max-w-full overflow-hidden"
          style={{ paddingLeft: '36px' }}
        >
          <div
            style={{
              position: 'absolute',
              left: '20px',
              top: '0',
              width: '16px',
              height: '12px',
              borderLeft: `1px solid color-mix(in srgb, ${$('--text-secondary')} 20%, transparent)`,
              borderBottom: `1px solid color-mix(in srgb, ${$('--text-secondary')} 20%, transparent)`,
            }}
          />
          <span
            className="text-[10px] opacity-60 text-secondary font-mono whitespace-nowrap overflow-hidden text-ellipsis w-full px-1 pl-5 rounded-[2px] transition-[text-decoration] duration-[0.15s]"
            style={{
              cursor: onFileClick ? 'pointer' : 'default',
              textDecoration: 'none',
            }}
            title={filePath}
            onClick={(e) => {
              e.stopPropagation();
              if (onFileClick) {
                onFileClick(filePath);
              }
            }}
            onMouseEnter={(e) => {
              if (onFileClick) {
                e.currentTarget.style.textDecoration = 'underline';
                e.currentTarget.style.textDecorationColor =
                  $('--primary') || 'rgba(0, 122, 204, 0.6)';
                e.currentTarget.style.textUnderlineOffset = '2px';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = 'none';
            }}
          >
            {filePath}
          </span>
        </div>
      )}

      {!isCollapsed && diffContent && (
        <div
          className="pt-1 pr-3 pb-3 pl-0"
          style={{ paddingLeft: '0', paddingRight: '12px', paddingBottom: '12px' }}
        >
          <div className="bg-background rounded-[4px] border overflow-auto max-h-[400px] font-mono text-xs leading-[1.5] py-1 break-words">
            {renderDiffLines(diffContent)}
          </div>
        </div>
      )}
    </div>
  );
};

export { GitDiffBlock };
export default GitDiffBlock;
