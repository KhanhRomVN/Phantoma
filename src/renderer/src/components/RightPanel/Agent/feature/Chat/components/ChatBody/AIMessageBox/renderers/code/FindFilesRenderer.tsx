import React from 'react';
import { logger } from '@renderer/utils/logger';
import { cn } from '@renderer/shared/utils/cn';

// ── Constants ──
import { getToolLabel } from '../../../../../constants/constants';

// Services
import { extensionService } from '@renderer/components/RightPanel/Agent/services/ExtensionService';

// ── Types ──
import { BaseRendererProps } from '../../../../../types/renderer-types';

// ── Utils ──
import { getNextUserMessage, buildTreeFromPaths } from '../../../../../utils/renderer-utils';

// ICONS
import FileIcon from '@renderer/components/common/FileIcon';

// ── Components ──
import { TagHeader } from '../../TagHeader';
import { TreeBlock } from '../../blocks/other/TreeBlock';
import ErrorBlock from '../../blocks/other/ErrorBlock';

export const FindFilesRenderer: React.FC<BaseRendererProps> = ({
  action,
  actionIndex,
  messageId,
  isActionClicked,
  isActiveGroup,
  isLastItemInList,
  toolOutputs,
  allMessages,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(true);

  const actionId = `${messageId}-action-${actionIndex}`;

  const nextUserMessage = getNextUserMessage(allMessages || [], messageId);

  const isPartial = false;
  const isError = !!toolOutputs?.[actionId]?.isError;
  const errorMessage = isError ? toolOutputs?.[actionId]?.output || '' : '';

  const output = toolOutputs?.[actionId]?.output;
  const codeContent = typeof output === 'string' ? output : '';

  const isCompleted = Boolean(
    !isPartial && (!!isActionClicked || isError || !!toolOutputs?.[actionId] || !!nextUserMessage),
  );

  let fileCount = 0;
  if (codeContent && !isError) {
    try {
      const match = codeContent.match(/Found (\d+) file\(s\)/);
      if (match) {
        fileCount = parseInt(match[1], 10);
      }
    } catch (err) {
      logger.warn('[FindFilesRenderer] Failed to parse file count:', err);
    }
  }

  return (
    <div className={cn('flex flex-col gap-1.5 pb-1', isLastItemInList ? 'mb-0' : 'mb-0.5')}>
      <TagHeader
        title={
          <div
            className={cn(
              'flex flex-col gap-1 text-xs text-text-primary',
              isCompleted ? 'cursor-pointer' : 'cursor-default',
            )}
            onClick={isCompleted ? () => setIsCollapsed((v) => !v) : undefined}
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold opacity-80">{getToolLabel('find_files')}</span>
              {isPartial && !isCompleted && (
                <span className="text-[10px] opacity-55 flex items-center gap-1">
                  <span className="codicon codicon-loading codicon-modifier-spin text-[10px]" />
                  Searching...
                </span>
              )}
              {isCompleted && (
                <>
                  <span
                    className={`codicon codicon-chevron-${isCollapsed ? 'right' : 'down'} text-[10px] opacity-50`}
                  />
                  <span className="opacity-50 text-[10px] text-text-secondary">
                    {fileCount} {fileCount === 1 ? 'file' : 'files'}
                  </span>
                </>
              )}
            </div>

            {(() => {
              const searchFileNames = action.params.file_names || action.params.file_name;
              const fileNamesArray = Array.isArray(searchFileNames)
                ? searchFileNames
                : searchFileNames
                  ? [searchFileNames]
                  : [];

              if (fileNamesArray.length > 0) {
                return (
                  <div className="flex flex-wrap gap-1.5 items-center ml-0.5">
                    {fileNamesArray.map((fileName, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                        {idx > 0 && <span className="opacity-30 text-[11px]">|</span>}
                        <FileIcon
                          path={fileName}
                          isFolder={false}
                          style={{ width: '14px', height: '14px' }}
                        />
                        <span className="font-mono text-[11px] font-medium opacity-90">
                          {fileName}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              }
              return null;
            })()}
          </div>
        }
        statusColor={
          isError ? 'rgb(255, 45, 85)' : isCompleted ? 'rgb(48, 209, 88)' : 'rgb(106, 122, 154)'
        }
        isError={isError}
        isWaitingApproval={!!isActiveGroup && !isCompleted}
        toolType="find_files"
        isPartial={isPartial}
      />

      {isError && errorMessage && (
        <ErrorBlock content={errorMessage} compact={true} maxHeight="300px" />
      )}

      {codeContent && !isError && !isCollapsed && (
        <div className="mt-2">
          {(() => {
            const lines = codeContent.split('\n');
            const filePaths: string[] = [];

            for (const line of lines) {
              if (line.startsWith('- ')) {
                const filePath = line.substring(2).trim();
                if (filePath) {
                  filePaths.push(filePath);
                }
              }
            }

            if (filePaths.length === 0) {
              return (
                <div className="py-2.5 px-3 bg-card-background border border-border rounded text-text-secondary opacity-70 italic text-[11px]">
                  No files found matching the search criteria.
                </div>
              );
            }

            const treeData = buildTreeFromPaths(filePaths);

            return (
              <div className="py-2.5 px-3 bg-card-background border border-border rounded max-h-[400px] overflow-y-auto">
                <TreeBlock
                  files={treeData}
                  onFileClick={(path) => {
                    extensionService.postMessage({
                      command: 'openFile',
                      path,
                    });
                  }}
                />
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
