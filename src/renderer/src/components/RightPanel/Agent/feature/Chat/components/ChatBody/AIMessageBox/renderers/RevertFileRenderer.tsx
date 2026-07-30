import React from 'react';
import { cn } from '@renderer/shared/lib/utils';

// CONSTANTS
import { getToolLabel } from '../../../../constants/constants';

// TYPES
import { BaseRendererProps, DiffStats } from '../../../../types/renderer-types';
import {
  getDisplayPath,
  collectConvFilePaths,
  getNextUserMessage,
} from '../../../../utils/renderer-utils';

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

  const nextUserMessage = getNextUserMessage(allMessages || [], messageId);

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

  const hasValidationError = !!action.isError;

  const statusColor = isError
    ? 'rgb(255, 45, 85)'
    : isCompleted
      ? 'rgb(255, 159, 10)'
      : 'rgb(10, 132, 255)';

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
      className={cn(
        'flex flex-col gap-1.5 pb-1',
        isLastItemInList ? 'mb-0' : 'mb-0.5'
      )}
    >
      <TagHeader
        title={
          <div className="flex items-center gap-2 text-xs text-text-primary">
            <span
              className="font-semibold opacity-80 cursor-pointer transition-[text-decoration] duration-150"
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
            <span className="font-medium opacity-80 font-mono text-[11px]">
              {getDisplayPath(rawPath, allPaths) || '...'}
            </span>
            {diffStats && (
              <>
                <span className="text-success font-semibold text-[11px]">
                  +{diffStats.added}
                </span>
                <span className="text-error font-semibold text-[11px]">
                  -{diffStats.removed}
                </span>
              </>
            )}
            {isCompleted && !isError && (
              <span className="text-[10px] opacity-50 text-text-secondary">
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
        <div className="pr-3 pb-2">
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