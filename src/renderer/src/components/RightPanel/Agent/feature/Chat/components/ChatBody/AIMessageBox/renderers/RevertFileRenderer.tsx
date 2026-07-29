import React from 'react';
import { $ } from '@renderer/utils/color';

// CONSTANTS
import { getToolLabel } from '../../../../constants/constants';

// TYPES
import { BaseRendererProps, DiffStats } from '../../../../types/renderer-types';
import {
  getDisplayPath,
  collectConvFilePaths,
  getNextUserMessage,
} from '../../../../utils/renderer-utils';

// UTILS

// ICONS
import FileIcon from '@renderer/components/common/FileIcon';

// COMPONENTS
import { TagHeader } from '../TagHeader';
import ActionBar from '../ActionBar';
import ErrorBlock from '../blocks/ErrorBlock';

// SERVICES
import { extensionService } from '@renderer/components/RightPanel/Agent/services/ExtensionService';

/**
 * Renderer for revert_file tool type
 * Shows diff stats similar to ReplaceInFileRenderer
 */
export const RevertFileRenderer: React.FC<BaseRendererProps> = ({
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
  const actionId = `${messageId}-action-${actionIndex}`;

  const rawPath = action.params.file_path || action.params.path || '';

  const allPaths = React.useMemo(() => collectConvFilePaths(allMessages || []), [allMessages]);

  const displayName = rawPath ? rawPath.split('/').pop() || rawPath : '';

  const nextUserMessage = getNextUserMessage(allMessages || [], messageId);

  // Calculate diff stats using ACCURATE diff algorithm
  let diffStats: DiffStats | null = null;
  if (action.params.old_str && action.params.new_str) {
    const { additions, deletions } = calculateLineDiff(
      action.params.old_str || '',
      action.params.new_str || '',
    );
    diffStats = {
      added: additions,
      removed: deletions,
    };
  } else if (action.params.old_content && action.params.new_content) {
    const { additions, deletions } = calculateLineDiff(
      action.params.old_content || '',
      action.params.new_content || '',
    );
    diffStats = {
      added: additions,
      removed: deletions,
    };
  }

  const isCompleted: boolean = Boolean(
    !!isActionClicked || !!toolOutputs?.[actionId] || !!nextUserMessage,
  );

  const isError = !!toolOutputs?.[actionId]?.isError;
  const errorMessage = isError ? toolOutputs?.[actionId]?.output || '' : '';

  // Check if action has validation error
  const hasValidationError = !!action.isError;

  const statusColor = isError
    ? $('--error')
    : isCompleted
      ? $('--warn')
      : $('--primary');

  // Debug logging for validation errors
  React.useEffect(() => {
    if (hasValidationError) {
      console.log('[RevertFileRenderer] Validation error detected:', {
        actionId,
        filePath: rawPath,
        errorCode: action.errorCode,
        errorMessage: action.errorMessage,
        actionParams: action.params,
      });
    }
  }, [hasValidationError, actionId, rawPath, action.errorCode, action.errorMessage]);

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
            <span
              style={{
                fontWeight: 600,
                opacity: 0.8,
                cursor: 'pointer',
                transition: 'text-decoration 0.15s ease',
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (rawPath) {
                  const oldContent = action.params.old_content || action.params.old_str || '';
                  const newContent = action.params.new_content || action.params.new_str || '';
                  extensionService.postMessage({
                    command: 'openFileDiff',
                    filePath: rawPath,
                    oldContent,
                    newContent,
                  });
                }
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.textDecoration = 'none';
              }}
            >
              {getToolLabel('revert_file')}
            </span>
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
            {diffStats && (
              <>
                <span
                  style={{
                    color: $('--success'),
                    fontWeight: 600,
                    fontSize: '11px',
                  }}
                >
                  +{diffStats.added}
                </span>
                <span
                  style={{
                    color: $('--error'),
                    fontWeight: 600,
                    fontSize: '11px',
                  }}
                >
                  -{diffStats.removed}
                </span>
              </>
            )}
            {isCompleted && !isError && (
              <span
                style={{
                  fontSize: '10px',
                  opacity: 0.5,
                  color: $('--text-secondary'),
                }}
              >
                reverted
              </span>
            )}
          </div>
        }
        path={rawPath}
        statusColor={statusColor}
        isPartial={false}
        isError={isError}
        toolType="revert_file"
        diffStats={diffStats || undefined}
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

function calculateLineDiff(arg0: any, arg1: any): { additions: any; deletions: any } {
  throw new Error('Function not implemented.');
}
