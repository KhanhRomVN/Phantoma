import React from 'react';
import { cn } from '@renderer/shared/utils/cn';

// Constants
import { getToolLabel } from '../../../../../constants/constants';

// Services
import { extensionService } from '@renderer/components/RightPanel/Agent/services/ExtensionService';

// UtilsS
import { getNextUserMessage, buildTreeFromPaths } from '../../../../../utils/renderer-utils';

// Components
import { TagHeader } from '../../TagHeader';
import { BaseRendererProps } from '../../../../../types/renderer-types';
import FileIcon from '@renderer/components/common/FileIcon';
import ErrorBlock from '../../blocks/other/ErrorBlock';
import TreeBlock from '../../blocks/other/TreeBlock';

export const ListFilesRenderer: React.FC<BaseRendererProps> = ({
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
  const rawPath = action.params.folder_path || action.params.path || '';
  const displayName = rawPath ? rawPath.split('/').pop() || rawPath : '';

  const nextUserMessage = getNextUserMessage(allMessages || [], messageId);

  const isPartial = false;
  const isError = !!toolOutputs?.[actionId]?.isError;
  const errorMessage = isError ? toolOutputs?.[actionId]?.output || '' : '';

  const output = toolOutputs?.[actionId]?.output;

  let codeContent = '';
  let rawTreeData: any = null;

  if (Array.isArray(output)) {
    rawTreeData = output;
    codeContent = JSON.stringify(output, null, 2);
  } else {
    codeContent = typeof output === 'string' ? output : '';
  }

  const isCompleted = Boolean(
    !isPartial &&
    (!!isActionClicked ||
      isError ||
      (codeContent && codeContent.trim().length > 0) ||
      !!nextUserMessage),
  );

  let fileCount = 0;
  let folderCount = 0;
  let fileCountFromListFiles = 0;

  if (!isError) {
    if (rawTreeData && Array.isArray(rawTreeData)) {
      const countNodes = (nodes: any[]): { files: number; folders: number } => {
        let files = 0;
        let folders = 0;
        for (const node of nodes) {
          if (node.type === 'file') {
            files++;
          } else if (node.type === 'folder' || node.type === 'directory') {
            folders++;
            if (node.children && Array.isArray(node.children)) {
              const childCounts = countNodes(node.children);
              files += childCounts.files;
              folders += childCounts.folders;
            }
          }
        }
        return { files, folders };
      };

      const counts = countNodes(rawTreeData);
      fileCountFromListFiles = counts.files;
      folderCount = counts.folders;
      fileCount = fileCountFromListFiles + folderCount;
    } else if (codeContent) {
      const lines = codeContent.split('\n').filter((line) => line.trim());

      lines.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed.endsWith('/')) {
          folderCount++;
        } else if (trimmed && !trimmed.startsWith('//')) {
          fileCountFromListFiles++;
        }
      });
      fileCount = fileCountFromListFiles + folderCount;
    }
  }

  return (
    <div className={cn('flex flex-col gap-1.5 pb-1', isLastItemInList ? 'mb-0' : 'mb-0.5')}>
      <TagHeader
        title={
          <div className="flex items-center gap-2 text-xs text-text-primary">
            <span
              className="font-semibold opacity-80 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (rawPath) {
                  extensionService.postMessage({
                    command: 'openFile',
                    path: rawPath,
                  });
                }
              }}
            >
              {getToolLabel('list_files')}
            </span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                if (rawPath) {
                  extensionService.postMessage({
                    command: 'openFile',
                    path: rawPath,
                  });
                }
              }}
              className="flex items-center"
            >
              <FileIcon
                path={rawPath}
                isFolder={true}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
            </span>
            <span
              className="font-medium opacity-90 font-mono text-[11px] cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (rawPath) {
                  extensionService.postMessage({
                    command: 'openFile',
                    path: rawPath,
                  });
                }
              }}
            >
              {displayName || (isPartial && !rawPath ? '...' : '')}
            </span>
            {isCompleted &&
              !isError &&
              (() => {
                const depth = action.params.depth;

                if (fileCount === 0) return null;

                const parts = [];

                if (depth !== undefined && depth !== null) {
                  parts.push(`depth: ${depth}`);
                }

                parts.push(`${folderCount} ${folderCount === 1 ? 'folder' : 'folders'}`);

                parts.push(
                  `${fileCountFromListFiles} ${fileCountFromListFiles === 1 ? 'file' : 'files'}`,
                );

                return (
                  <span className="opacity-50 text-[10px] text-text-secondary">
                    {parts.join(' • ')}
                  </span>
                );
              })()}
            {isPartial && (
              <span className="text-[10px] opacity-60 italic ml-1 flex items-center gap-1">
                <span className="codicon codicon-loading codicon-modifier-spin text-[10px]" />
              </span>
            )}
          </div>
        }
        statusColor={
          isError ? 'rgb(255, 45, 85)' : isCompleted ? 'rgb(48, 209, 88)' : 'rgb(106, 122, 154)'
        }
        isError={isError}
        isWaitingApproval={!!isActiveGroup && !isCompleted}
        toolType="list_files"
        tooltipMeta={{
          fileCount: fileCount || undefined,
        }}
        isPartial={isPartial}
        onClick={() => setIsCollapsed((v) => !v)}
        path={rawPath}
        onPathClick={(clickedPath) => {
          extensionService.postMessage({
            command: 'openFile',
            path: clickedPath,
          });
        }}
      />

      {isError && errorMessage && (
        <ErrorBlock content={errorMessage} compact={true} maxHeight="300px" />
      )}

      {codeContent &&
        !isError &&
        !isCollapsed &&
        (() => {
          const isEmpty = codeContent.includes('is empty (no files or folders inside)');

          if (isEmpty) {
            return (
              <div className="mt-2 py-2 px-3 bg-card-background border border-border rounded text-[11px] text-text-secondary italic flex items-center gap-1.5">
                <span className="codicon codicon-info text-xs" />
                <span>
                  The folder{' '}
                  <code className="py-px px-1 bg-card-background rounded-sm font-mono">
                    {rawPath}
                  </code>{' '}
                  is empty (no files or folders inside).
                </span>
              </div>
            );
          }

          if (rawTreeData && Array.isArray(rawTreeData)) {
            return (
              <TreeBlock
                files={rawTreeData}
                onFileClick={(fullPath) =>
                  extensionService.postMessage({
                    command: 'openFile',
                    path: fullPath,
                  })
                }
              />
            );
          }

          const lines = codeContent.split('\n').filter(Boolean);
          const filePaths = lines
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith('//'));

          const treeData = buildTreeFromPaths(filePaths);

          return (
            <TreeBlock
              files={treeData}
              onFileClick={(fullPath) =>
                extensionService.postMessage({
                  command: 'openFile',
                  path: fullPath,
                })
              }
            />
          );
        })()}
    </div>
  );
};
