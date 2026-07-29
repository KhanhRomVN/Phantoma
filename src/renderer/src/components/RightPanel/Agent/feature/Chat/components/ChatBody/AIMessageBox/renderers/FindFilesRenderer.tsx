import React from 'react';
import { $ } from '@renderer/utils/color';

// CONSTANTS
import { getToolLabel } from '../../../../constants/constants';

// SERVICES
import { extensionService } from '@renderer/components/RightPanel/Agent/services/ExtensionService';

// TYPES
import { BaseRendererProps } from '../../../../types/renderer-types';

// UTILS
import { getNextUserMessage, buildTreeFromPaths } from '../../../../utils/renderer-utils';

// ICONS
import FileIcon from '@renderer/components/common/FileIcon';

// COMPONENTS
import { TagHeader } from '../TagHeader';
import { TreeBlock } from '../blocks/TreeBlock';
import ErrorBlock from '../blocks/ErrorBlock';

export const FindFilesRenderer: React.FC<BaseRendererProps> = ({
  action,
  actionIndex,
  messageId,
  isActionClicked,
  isActiveGroup,
  isLastMessage,
  isLastItemInList,
  toolOutputs,
  allMessages,
  onToolClick,
  conversationId,
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

  // Calculate file count
  let fileCount = 0;
  if (codeContent && !isError) {
    try {
      const match = codeContent.match(/Found (\d+) file\(s\)/);
      if (match) {
        fileCount = parseInt(match[1], 10);
      }
    } catch (err) {}
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        paddingBottom: '4px',
        marginBottom: isLastItemInList ? '0' : '2px',
      }}
    >
      <TagHeader
        title={
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              fontSize: '12px',
              color: $('--text-primary'),
              cursor: isCompleted ? 'pointer' : 'default',
            }}
            onClick={isCompleted ? () => setIsCollapsed((v) => !v) : undefined}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 600, opacity: 0.8 }}>{getToolLabel("find_files")}</span>
              {isPartial && !isCompleted && (
                <span
                  style={{
                    fontSize: '10px',
                    opacity: 0.55,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span
                    className="codicon codicon-loading codicon-modifier-spin"
                    style={{ fontSize: '10px' }}
                  />
                  Searching...
                </span>
              )}
              {isCompleted && (
                <>
                  <span
                    className={`codicon codicon-chevron-${isCollapsed ? 'right' : 'down'}`}
                    style={{ fontSize: '10px', opacity: 0.5 }}
                  />
                  <span
                    style={{
                      opacity: 0.5,
                      fontSize: '10px',
                      color: $('--text-secondary'),
                    }}
                  >
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
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                      alignItems: 'center',
                      marginLeft: '2px',
                    }}
                  >
                    {fileNamesArray.map((fileName, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {idx > 0 && <span style={{ opacity: 0.3, fontSize: '11px' }}>|</span>}
                        <FileIcon
                          path={fileName}
                          isFolder={false}
                          style={{ width: '14px', height: '14px' }}
                        />
                        <span
                          style={{
                            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                            fontSize: '11px',
                            fontWeight: 500,
                            opacity: 0.9,
                          }}
                        >
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
          isError
            ? $('--error')
            : isCompleted
              ? $('--success')
              : isActiveGroup
                ? $('--text-secondary')
                : $('--text-secondary')
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
        <div style={{ marginTop: '8px' }}>
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
                <div
                  style={{
                    padding: '10px 12px',
                    backgroundColor: $('--card-background'),
                    border: `1px solid ${$('--border')}`,
                    borderRadius: '4px',
                    color: $('--text-secondary'),
                    opacity: 0.7,
                    fontStyle: 'italic',
                    fontSize: '11px',
                  }}
                >
                  No files found matching the search criteria.
                </div>
              );
            }

            const treeData = buildTreeFromPaths(filePaths);

            return (
              <div
                style={{
                  padding: '10px 12px',
                  backgroundColor: $('--card-background'),
                  border: `1px solid ${$('--border')}`,
                  borderRadius: '4px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                }}
              >
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