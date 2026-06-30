import React, { useState } from 'react';
import { FileIcon } from 'lucide-react';
import { ToolHeader } from './ToolHeader';

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
  statusColor = 'var(--vscode-gitDecoration-addedResourceForeground, #3fb950)',
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
      let color = 'var(--vscode-editor-foreground)';
      let backgroundColor = 'transparent';

      if (type === 'added') {
        color = 'var(--vscode-gitDecoration-addedResourceForeground, #3fb950)';
        backgroundColor =
          'color-mix(in srgb, var(--vscode-gitDecoration-addedResourceForeground, #3fb950) 12%, transparent)';
      } else if (type === 'removed') {
        color = 'var(--vscode-gitDecoration-deletedResourceForeground, #f14c4c)';
        backgroundColor =
          'color-mix(in srgb, var(--vscode-gitDecoration-deletedResourceForeground, #f14c4c) 12%, transparent)';
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
              fontFamily: 'var(--vscode-editor-font-family, monospace)',
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
            fontFamily: 'var(--vscode-editor-font-family, monospace)',
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

  // Header style - collapse icon + label + file icon + filename + stats + action icon
  const headerTitle = (
    <div className="terminal-name contents">
      <div className="flex items-center gap-2 text-xs text-[var(--vscode-editor-foreground)]">
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
            <span className="text-[var(--vscode-gitDecoration-addedResourceForeground,#3fb950)] font-semibold text-[11px]">
              +{added}
            </span>
            <span className="text-[var(--vscode-gitDecoration-deletedResourceForeground,#f14c4c)] font-semibold text-[11px]">
              -{deleted}
            </span>
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
      <ToolHeader
        title={headerTitle}
        statusColor={statusColor}
        isPartial={isPartial}
        isCollapsed={isCollapsed}
        onClick={handleHeaderClick}
        path={filePath}
        onPathClick={() => {
          if (onFileClick) onFileClick(filePath);
        }}
      />

      {!isCollapsed && diffContent && (
        <div className="pt-1 px-3 pb-3 pl-[29px]">
          <div className="bg-[var(--vscode-editor-background,var(--vscode-textCodeBlock-background))] rounded-[4px] border border-[var(--vscode-widget-border,rgba(255,255,255,0.08))] overflow-auto max-h-[400px] font-mono text-xs leading-[1.5] py-1 break-words">
            {renderDiffLines(diffContent)}
          </div>
        </div>
      )}
    </div>
  );
};

export default GitDiffBlock;
