import React from 'react';
import { $ } from '@renderer/utils/color';

// CONSTANTS
import { getToolLabel } from '../../../../constants/constants';

// TYPES
import {
  getDisplayPath,
  collectConvFilePaths,
  getNextUserMessage,
} from '../../../../utils/renderer-utils';
import { BaseRendererProps } from '../../../../types/renderer-types';

// UTILS
import { getFilename } from '../../../../utils/toolUtils';

// ICONS
import FileIcon from '@renderer/components/common/FileIcon';

// COMPONENTS
import { TagHeader } from '../TagHeader';
import ActionBar from '../ActionBar';
import ErrorBlock from '../blocks/ErrorBlock';

/**
 * Renderer for delete_file tool type
 */
export const DeleteFileRenderer: React.FC<BaseRendererProps> = ({
  action,
  actionIndex,
  messageId,
  isActionClicked,
  isActiveGroup,
  isLastMessage,
  isLastItemInList,
  toolOutputs,
  allMessages,
  fileStatsMap,
  onToolClick,
  conversationId,
}) => {
  const toolType = action.type;
  const actionId = `${messageId}-action-${actionIndex}`;

  const rawPath =
    action.params.file_path ||
    action.params.folder_path ||
    action.params.path ||
    getFilename(action);

  const allPaths = React.useMemo(() => collectConvFilePaths(allMessages || []), [allMessages]);

  const displayName = rawPath ? rawPath.split('/').pop() || rawPath : '';

  const nextUserMessage = getNextUserMessage(allMessages || [], messageId);

  const isCompleted: boolean = Boolean(
    !!isActionClicked || !!toolOutputs?.[actionId] || !!nextUserMessage,
  );

  const isError = !!toolOutputs?.[actionId]?.isError;
  const errorMessage = isError ? toolOutputs?.[actionId]?.output || '' : '';

  // Check if action has validation error
  const hasValidationError = !!action.isError;

  const statusColor = isError ? $('--error') : isCompleted ? $('--error') : $('--primary');

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
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              color: $('--text-primary'),
            }}
          >
            <span style={{ fontWeight: 600, opacity: 0.8 }}>{getToolLabel('delete_file')}</span>
            <FileIcon path={rawPath} isFolder={false} style={{ width: '14px', height: '14px' }} />
            <span
              style={{
                fontWeight: 500,
                opacity: 0.8,
                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                fontSize: '11px',
              }}
            >
              {getDisplayPath(rawPath, allPaths) || '...'}
            </span>
            {isCompleted && !isError && (
              <span
                style={{
                  fontSize: '10px',
                  opacity: 0.5,
                  color: $('--text-secondary'),
                }}
              >
                deleted
              </span>
            )}
          </div>
        }
        path={rawPath}
        statusColor={statusColor}
        isPartial={false}
        isError={isError}
        toolType={toolType}
      />

      {isError && <ErrorBlock content={errorMessage} showHeader={false} maxHeight="300px" />}

      {!isCompleted && (
        <div style={{ padding: '0 12px 8px 0' }}>
          <ActionBar
            action={action}
            messageId={messageId}
            actionIndex={actionIndex}
            hasError={hasValidationError || isError}
            isCompleted={isCompleted}
            onAction={(e, type) =>
              onToolClick(action, messageId, actionIndex, type)
            }
          />
        </div>
      )}
      {hasValidationError && action.errorMessage && (
        <ErrorBlock
          content={`Validation Error: ${action.errorMessage}`}
          compact={true}
          maxHeight="300px"
        />
      )}
    </div>
  );
};
