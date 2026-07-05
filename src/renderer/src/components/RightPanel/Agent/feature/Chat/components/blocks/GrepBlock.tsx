import React, { useState } from 'react';
import { ToolAction } from '..';
import { extensionService } from '@renderer/components/RightPanel/Agent/services/ExtensionService';
import { getFileIconPath } from '@renderer/utils/fileIconMapper';
import { $ } from '@renderer/utils/color';

interface GrepBlockProps {
  action: ToolAction;
  actionId: string;
  toolOutputs?: Record<string, { output: string; isError: boolean }>;
  isPartial: boolean;
  isCompleted: boolean;
  isError: boolean;
  errorMessage: string;
  conversationId?: string;
  allMessages?: any[];
  /** If true, results are collapsed; parent controls this */
  isCollapsed?: boolean;
  /** Callback when parent wants to toggle collapse */
  onToggleCollapse?: () => void;
}

interface MatchResult {
  lineNumber: number;
  lineContent: string;
}

interface GrepResultData {
  searchTerm: string;
  pattern: string;
  results: Record<string, MatchResult[]>;
  totalFilesSearched: number;
  totalMatches: number;
}

function parseCompactGrepOutput(output: string): GrepResultData | null {
  if (!output) return null;
  try {
    const headerMatch = output.match(
      /<grep_results\s+search="([^"]*)"\s+total_matches="(\d+)"\s+files="(\d*)"\s+files_searched="(\d+)"/,
    );
    if (!headerMatch) {
      const emptyMatch = output.match(
        /<grep_results\s+search="([^"]*)"\s+total_matches="0"\s+files_searched="(\d+)"\s*\/>/,
      );
      if (emptyMatch) {
        return {
          searchTerm: emptyMatch[1],
          pattern: emptyMatch[1],
          results: {},
          totalFilesSearched: parseInt(emptyMatch[2], 10),
          totalMatches: 0,
        };
      }
      return null;
    }
    const searchTerm = headerMatch[1];
    const totalMatches = parseInt(headerMatch[2], 10);
    const totalFilesSearched = parseInt(headerMatch[4], 10);
    const results: Record<string, MatchResult[]> = {};
    const fileRegex = /<file\s+path="([^"]*)"\s+matches="\d+">([\s\S]*?)<\/file>/g;
    let fileMatch: RegExpExecArray | null;
    while ((fileMatch = fileRegex.exec(output)) !== null) {
      const filePath = fileMatch[1];
      const fileContent = fileMatch[2];
      const matches: MatchResult[] = [];
      const lineRegex = /^\s*(\d+):\s(.*)$/gm;
      let lineMatch: RegExpExecArray | null;
      while ((lineMatch = lineRegex.exec(fileContent)) !== null) {
        matches.push({
          lineNumber: parseInt(lineMatch[1], 10),
          lineContent: lineMatch[2],
        });
      }
      if (matches.length > 0) results[filePath] = matches;
    }
    return {
      searchTerm,
      pattern: searchTerm,
      results,
      totalFilesSearched,
      totalMatches,
    };
  } catch {
    return null;
  }
}

const getDisplayPath = (fullPath: string): string => {
  if (!fullPath) return '';
  const parts = fullPath.split('/');
  return parts.length > 4 ? '.../' + parts.slice(-3).join('/') : fullPath;
};

// Track which actionIds have been logged to avoid spam
const _loggedOutputs = new Set<string>();

// Highlight matching text within a line
const highlightMatch = (text: string, searchTerm: string): React.ReactNode => {
  if (!searchTerm || !text) return text;

  try {
    // Escape regex special characters
    const escaped = searchTerm.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) => {
      // Check if this part matches the search term
      if (part.toLowerCase() === searchTerm.toLowerCase()) {
        return (
          <span
            key={index}
            className="bg-[rgba(255,255,0,0.21)] text-primary font-semibold rounded-[2px] px-0.5"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  } catch (e) {
    console.warn('[GrepBlock] Failed to highlight:', e);
    return text;
  }
};

const GrepBlock: React.FC<GrepBlockProps> = ({
  action,
  actionId,
  toolOutputs,
  isPartial,
  isCompleted,
  isError,
  errorMessage,
  isCollapsed = false,
}) => {
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());

  const searchTerm = action.params.search_term || action.params.searchTerm || '';
  const folderPath = action.params.folder_path || action.params.folderPath || '';
  const filePath = action.params.file_path || action.params.filePath || '';
  const targetPath = folderPath || filePath || '';

  const parseGrepResult = (): GrepResultData | null => {
    const output = toolOutputs?.[actionId]?.output;
    if (!output) return null;

    if (!_loggedOutputs.has(actionId)) {
      _loggedOutputs.add(actionId);
    }

    if (output.includes('<grep_results')) {
      const result = parseCompactGrepOutput(output);
      return result;
    }
    try {
      const parsed = JSON.parse(output);
      if (parsed.searchTerm !== undefined) return parsed as GrepResultData;
      if (parsed.success && parsed.data) return parsed.data as GrepResultData;
      return null;
    } catch (e) {
      console.warn('[GrepBlock] Failed to parse output:', e);
      return null;
    }
  };

  const grepResult = parseGrepResult();
  const hasResults = grepResult && grepResult.totalMatches > 0;
  const filePaths = Object.keys(grepResult?.results || {});

  const toggleFileCollapse = (filePathKey: string) => {
    setCollapsedFiles((prev) => {
      const newSet = new Set(prev);
      newSet.has(filePathKey) ? newSet.delete(filePathKey) : newSet.add(filePathKey);
      return newSet;
    });
  };

  const openFileAtLine = (filePathLine: string, lineNumber: number) => {
    const fullPath = filePathLine;
    extensionService.postMessage({
      command: 'openFileAtLine',
      path: fullPath,
      line: lineNumber,
      selection: { startLine: lineNumber, endLine: lineNumber },
    });
    setTimeout(() => {
      extensionService.postMessage({ command: 'openFile', path: fullPath });
    }, 200);
  };

  // Loading state: show spinner placeholder
  if (isPartial && !isCompleted) {
    return (
      <div className="flex items-center justify-center gap-1.5 py-2 text-secondary text-xs opacity-60">
        <span className="codicon codicon-loading codicon-modifier-spin text-xs" />
        <span>Searching...</span>
      </div>
    );
  }

  // Error state: show error message
  if (isError && errorMessage) {
    return (
      <div className="flex items-start gap-1.5 px-2 py-[5px] bg-error/4 border border-error/20 rounded-[4px]">
        <span className="codicon codicon-error text-[11px] text-error opacity-70 mt-px shrink-0" />
        <span className="text-[11px] text-error opacity-85 font-mono break-words">
          {errorMessage}
        </span>
      </div>
    );
  }

  if (!grepResult || !isCompleted) return null;

  // If collapsed, render nothing (parent handles header)
  if (isCollapsed) {
    return null;
  }

  const { results } = grepResult;

  if (!hasResults) {
    return (
      <div className="mt-1 px-3 py-2 pl-[29px] bg-background/50 rounded-[4px] text-[11px] text-secondary text-left">
        <span className="codicon codicon-search-stop mr-1.5" />
        No results for "{grepResult.searchTerm}" in {grepResult.totalFilesSearched} files
      </div>
    );
  }

  return (
    <div
      className="max-h-[320px] overflow-y-auto mt-0.5 ml-[29px] pl-3 pr-2.5 py-1.5 bg-background border rounded-[4px]"
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(128,128,128,0.4) transparent',
      }}
    >
      {filePaths.map((filePathKey) => {
        const matches = results[filePathKey];
        const isFileCollapsed = collapsedFiles.has(filePathKey);
        const displayFilePath = filePathKey.split(/[/\\]/).pop() || filePathKey;
        const fileIconPath = getFileIconPath(filePathKey);
        const searchTermLocal = grepResult.searchTerm;

        return (
          <div key={filePathKey} className="mb-3">
            <div
              onClick={() => toggleFileCollapse(filePathKey)}
              className="flex items-center gap-1.5 cursor-pointer py-0.5 select-none"
              style={{ marginBottom: isFileCollapsed ? '0' : '6px' }}
            >
              <span
                className={`codicon codicon-chevron-${isFileCollapsed ? 'right' : 'down'} text-xs opacity-60 text-secondary`}
              />
              <img
                src={fileIconPath}
                alt="file icon"
                className="w-3.5 h-3.5 shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const fallback = document.createElement('span');
                    fallback.className = 'codicon codicon-file';
                    fallback.style.cssText =
                      'font-size: 12px; color: ' + $('--secondary-text') + '; opacity: 0.7; flex-shrink: 0;';
                    parent.insertBefore(fallback, e.currentTarget);
                  }
                }}
              />
              <span className="font-mono text-[11px] font-medium text-primary">
                {displayFilePath}
              </span>
              <span className="text-[10px] text-secondary opacity-50 ml-auto">
                {matches.length} {matches.length === 1 ? 'line' : 'lines'}
              </span>
            </div>

            {!isFileCollapsed && (
              <div className="ml-[18px] flex flex-col gap-0.5">
                {matches.map((match, idx) => (
                  <div
                    key={`${filePathKey}-${match.lineNumber}-${idx}`}
                    onClick={() => {
                      openFileAtLine(filePathKey, match.lineNumber);
                    }}
                    className="flex items-start gap-2 px-1 py-0.5 rounded-[3px] cursor-pointer font-mono text-[11px] leading-[1.4] transition-colors duration-[0.1s]"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = $('--sidebar-item-hover') || 'rgba(255,255,255,0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <span className="min-w-[32px] text-secondary opacity-65 text-right shrink-0">
                      {match.lineNumber}
                    </span>
                    <span className="flex-1 whitespace-pre-wrap break-all text-primary opacity-90">
                      {highlightMatch(match.lineContent, searchTermLocal)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default GrepBlock;
