import React from 'react';
import { logger } from '@renderer/utils/logger';
import { cn } from '@renderer/shared/utils/cn';

// Constants
import { getToolLabel } from '../../../../../constants/constants';

// Services
import { extensionService } from '@renderer/components/RightPanel/Agent/services/ExtensionService';

// UtilsS
import {
  collectConvFilePaths,
  getDisplayPath,
  getNextUserMessage,
} from '../../../../../utils/renderer-utils';

// Components
import { TagHeader } from '../../TagHeader';
import { BaseRendererProps } from '../../../../../types/renderer-types';
import FileIcon from '@renderer/components/common/FileIcon';
import GrepBlock from '../../blocks/code/GrepBlock';

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
                  <FileIcon
                    path={targetPath}
                    isFolder={isFolder}
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
