import React, { useState } from 'react';
import { logger } from '@renderer/utils/logger';
import { cn } from '@renderer/shared/utils/cn';

// ── Constants ──
import { getToolLabel } from '../../../../../constants/constants';

// Services
import { extensionService } from '@renderer/components/RightPanel/Agent/services/ExtensionService';

// ── Utils ──
import {
  collectConvFilePaths,
  getDisplayPath,
  getNextUserMessage,
} from '../../../../../utils/renderer-utils';
import { $ } from '@renderer/utils/color';
import { getFileIconPath, getFolderIconPath } from '@renderer/shared/utils/fileIconMapper';

// ── Components ──
import { TagHeader } from '../../TagHeader';
import { BaseRendererProps } from '../../../../../types/renderer-types';
import ErrorBlock from '../../blocks/other/ErrorBlock';

interface GrepBlockProps {
  action: any;
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

  // Check for validation error from parser
  const validationError = action.params._validationError;

  const grepResult = React.useMemo((): GrepResultData | null => {
    const output = toolOutputs?.[actionId]?.output;
    if (!output) return null;

    if (!_loggedOutputs.has(actionId)) {
      _loggedOutputs.add(actionId);
    }

    // Check for error messages first (before attempting JSON parse)
    if (
      output.startsWith('Error - ') ||
      output.startsWith('Error:') ||
      output.includes('not found')
    ) {
      return null;
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
      logger.warn('[GrepBlock] Failed to parse output:', e);
      return null;
    }
  }, [actionId, toolOutputs]);

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

  // Validation error state: show error message immediately
  if (validationError && !toolOutputs?.[actionId]) {
    return (
      <ErrorBlock
        content={`Invalid Search Pattern: ${validationError}\nPattern: ${searchTerm}`}
        compact={true}
        maxHeight="300px"
      />
    );
  }

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
    return <ErrorBlock content={errorMessage} compact={true} maxHeight="300px" />;
  }

  // Check if output is an error message (not grep results)
  const output = toolOutputs?.[actionId]?.output;
  const isOutputError =
    output &&
    (output.startsWith('Error - ') || output.startsWith('Error:') || output.includes('not found'));

  if (isOutputError && !grepResult) {
    return <ErrorBlock content={output || 'Search failed'} compact={true} maxHeight="300px" />;
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
      className="max-h-[320px] overflow-y-auto mt-0.5 pl-3 pr-2.5 py-1.5 bg-background border rounded-[4px]"
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
              className={`flex items-center gap-1.5 cursor-pointer py-0.5 select-none ${isFileCollapsed ? 'mb-0' : 'mb-1.5'}`}
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
                      'font-size: 12px; color: ' +
                      $('--secondary-text') +
                      '; opacity: 0.7; flex-shrink: 0;';
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
                      e.currentTarget.style.backgroundColor =
                        $('--sidebar-item-hover') || 'rgba(255,255,255,0.05)';
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

export const GrepRenderer: React.FC<BaseRendererProps> = ({
  action,
  actionIndex,
  messageId,
  isActionClicked,
  isActiveGroup,
  isLastItemInList,
  toolOutputs,
  allMessages,
  conversationId,
}) => {
  const [isGrepCollapsed, setIsGrepCollapsed] = React.useState(true);

  const actionId = `${messageId}-action-${actionIndex}`;

  const allPaths = React.useMemo(() => collectConvFilePaths(allMessages || []), [allMessages]);

  const nextUserMessage = getNextUserMessage(allMessages || [], messageId);

  const isPartial = false;
  const isError = !!toolOutputs?.[actionId]?.isError;
  const errorMessage = isError ? toolOutputs?.[actionId]?.output || '' : '';

  const grepValidationError = action.params._validationError;
  const grepCompleted =
    (!isPartial || !!grepValidationError) &&
    (isActionClicked ||
      isError ||
      !!grepValidationError ||
      !!toolOutputs?.[actionId] ||
      !!nextUserMessage);

  return (
    <div className={cn('flex flex-col gap-1.5 pb-1', isLastItemInList ? 'mb-0' : 'mb-0.5')}>
      <TagHeader
        title={
          <div
            className={cn(
              'flex items-center gap-2 text-xs text-text-primary',
              grepCompleted ? 'cursor-pointer' : 'cursor-default',
            )}
            onClick={grepCompleted ? () => setIsGrepCollapsed((v) => !v) : undefined}
          >
            <span className="font-semibold opacity-80 shrink-0">{getToolLabel('grep')}</span>
            <span
              className="font-mono text-[11px] font-semibold text-primary px-[5px] bg-primary/12 rounded-[3px] max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap shrink"
              title={action.params.search_term || action.params.searchTerm || ''}
            >
              {action.params.search_term || action.params.searchTerm || ''}
            </span>
            {(() => {
              const folderPath = action.params.folder_path || action.params.folderPath || '';
              const filePath = action.params.file_path || action.params.filePath || '';
              const targetPath = folderPath || filePath || '';
              const isFolder = !!folderPath;
              if (!targetPath) return null;
              const segments = targetPath.split('/').filter(Boolean);
              if (segments.length === 0) return null;
              return (
                <>
                  <span className="opacity-40 text-[11px] shrink-0">in</span>
                  <img
                    src={isFolder ? getFolderIconPath(targetPath) : getFileIconPath(targetPath)}
                    alt=""
                    style={{ width: '14px', height: '14px', flexShrink: 0 }}
                  />
                  <span
                    className="font-medium opacity-80 font-mono text-[11px] max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap shrink"
                    title={targetPath}
                  >
                    {getDisplayPath(targetPath, allPaths) || '...'}
                  </span>
                </>
              );
            })()}
            {isPartial && !grepCompleted && (
              <span className="text-[10px] opacity-55 flex items-center gap-1 shrink-0 ml-auto">
                <span className="codicon codicon-loading codicon-modifier-spin text-[10px]" />
                Searching...
              </span>
            )}
            {grepCompleted &&
              (() => {
                const output = toolOutputs?.[actionId]?.output || '';
                let totalMatches = 0;
                let fileCount = 0;
                try {
                  const match = output.match(/total_matches="(\d+)"/);
                  if (match) totalMatches = parseInt(match[1], 10);
                  const fileMatch = output.match(/files="(\d+)"/);
                  if (fileMatch) fileCount = parseInt(fileMatch[1], 10);
                } catch {
                  logger.warn('[GrepRenderer] Failed to parse match counts');
                }
                if (totalMatches === 0 && fileCount === 0) {
                  return (
                    <span className="opacity-50 text-[10px] text-text-secondary italic shrink-0 ml-auto">
                      no matches
                    </span>
                  );
                }
                return (
                  <span className="opacity-50 text-[10px] text-text-secondary shrink-0 ml-auto whitespace-nowrap">
                    {totalMatches} {totalMatches === 1 ? 'match' : 'matches'} in {fileCount}{' '}
                    {fileCount === 1 ? 'file' : 'files'}
                  </span>
                );
              })()}
            {grepCompleted && (
              <span
                className={`codicon codicon-chevron-${isGrepCollapsed ? 'right' : 'down'} text-[10px] opacity-50 ml-0.5 shrink-0`}
              />
            )}
          </div>
        }
        statusColor={
          isError ? 'rgb(255, 45, 85)' : grepCompleted ? 'rgb(48, 209, 88)' : 'rgb(106, 122, 154)'
        }
        isError={isError}
        isWaitingApproval={!!isActiveGroup && !grepCompleted}
        toolType="grep"
        path={(() => {
          const folderPath = action.params.folder_path || action.params.folderPath || '';
          const filePath = action.params.file_path || action.params.filePath || '';
          return folderPath || filePath || '';
        })()}
        onPathClick={(clickedPath) => {
          extensionService.postMessage({
            command: 'openFile',
            path: clickedPath,
          });
        }}
        tooltipMeta={(() => {
          const meta: {
            matchCount?: number;
            fileCount?: number;
          } = {};

          if (grepCompleted) {
            const output = toolOutputs?.[actionId]?.output || '';
            try {
              const matchResult = output.match(/total_matches="(\d+)"/);
              if (matchResult) meta.matchCount = parseInt(matchResult[1], 10);
              const fileResult = output.match(/files="(\d+)"/);
              if (fileResult) meta.fileCount = parseInt(fileResult[1], 10);
            } catch {
              logger.warn('[GrepRenderer] Failed to parse tooltip meta');
            }
          }

          return meta;
        })()}
        isPartial={isPartial}
      />

      <GrepBlock
        action={action}
        actionId={actionId}
        toolOutputs={toolOutputs}
        isPartial={!!isPartial}
        isCompleted={grepCompleted}
        isError={isError}
        errorMessage={errorMessage}
        conversationId={conversationId}
        allMessages={allMessages}
        isCollapsed={isGrepCollapsed}
        onToggleCollapse={() => setIsGrepCollapsed((v) => !v)}
      />
    </div>
  );
};