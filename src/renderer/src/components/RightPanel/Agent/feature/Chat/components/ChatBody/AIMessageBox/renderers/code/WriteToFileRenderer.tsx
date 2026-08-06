import React from 'react';
import { cn } from '@renderer/shared/utils/cn';

// HOOKS
import { useSettings } from '../../../../../../../context/SettingsContext';

// SERVICES
import { extensionService } from '@renderer/components/RightPanel/Agent/services/ExtensionService';

// CONSTANTS
import { getToolLabel } from '../../../../../constants/constants';

// UTILS
import { collectConvFilePaths, getNextUserMessage } from '../../../../../utils/renderer-utils';
import { getPermissionDecision } from '../../../../../utils/permissionUtils';

// ICONS
import FileIcon from '@renderer/components/common/FileIcon';

// COMPONENTS
import { TagHeader } from '../../TagHeader';
import ActionBar from '../../ActionBar';
import ErrorBlock from '../../blocks/other/ErrorBlock';
import { MergedRendererProps } from '../../../../../types/renderer-types';

export const WriteToFileRenderer: React.FC<MergedRendererProps> = ({
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
  singleLineReviewActions,
  onConfirmSingleLineAction,
  onRejectSingleLineAction,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(true);
  const { permissionMode } = useSettings();

  const actionId = `${messageId}-action-${actionIndex}`;
  const rawPath = action.params.file_path || action.params.path || '';
  const displayName = rawPath ? rawPath.split('/').pop() || rawPath : '';

  const allPaths = React.useMemo(() => collectConvFilePaths(allMessages || []), [allMessages]);

  const nextUserMessage = getNextUserMessage(allMessages || [], messageId);

  const isPartial = false;
  const isError = !!toolOutputs?.[actionId]?.isError;
  const errorMessage = isError ? toolOutputs?.[actionId]?.output || '' : '';

  const linesCount = action.params.content?.split('\n').length || 0;

  const isCompleted = Boolean(
    !isPartial && (!!isActionClicked || isError || !!toolOutputs?.[actionId] || !!nextUserMessage),
  );

  const shouldHideContent = false;

  const hasValidationError = !!action.isError;

  const permissionDecision = getPermissionDecision(permissionMode, 'write_to_file');
  const shouldShowExecuteButton =
    !shouldHideContent &&
    !isCompleted &&
    !isPartial &&
    !hasValidationError &&
    permissionDecision === 'confirm';

  React.useEffect(() => {
    if (hasValidationError) {
      console.log('[WriteToFileRenderer] Validation error detected:', {
        actionId,
        filePath: rawPath,
        errorCode: action.errorCode,
        errorMessage: action.errorMessage,
        shouldShowExecuteButton,
        actionParams: action.params,
      });
    }
  }, [
    hasValidationError,
    actionId,
    rawPath,
    action.errorCode,
    action.errorMessage,
    shouldShowExecuteButton,
  ]);

  const handleToolClickWithLog = React.useCallback(
    (e: React.MouseEvent, type: any) => {
      onToolClick(action, messageId, actionIndex, type);
    },
    [action, messageId, actionIndex, onToolClick, actionId, rawPath],
  );

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
                  const content = action.params.content || '';
                  extensionService.postMessage({
                    command: 'openWriteToFile',
                    filePath: rawPath,
                    content,
                  });
                }
              }}
            >
              {getToolLabel('write_to_file')}
            </span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                if (rawPath) {
                  const content = action.params.content || '';
                  extensionService.postMessage({
                    command: 'openWriteToFile',
                    filePath: rawPath,
                    content,
                  });
                }
              }}
              className="flex items-center"
            >
              <FileIcon
                path={rawPath}
                isFolder={false}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
            </span>
            <span
              className="font-medium opacity-90 font-mono text-[11px] cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (rawPath) {
                  const content = action.params.content || '';
                  extensionService.postMessage({
                    command: 'openWriteToFile',
                    filePath: rawPath,
                    content,
                  });
                }
              }}
            >
              {displayName || (isPartial && !rawPath ? '...' : '')}
            </span>
            {linesCount > 0 && (
              <span className="opacity-70 text-[11px] ml-1.5 font-medium">
                +{linesCount} {linesCount === 1 ? 'line' : 'lines'}
              </span>
            )}
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
        toolType="write_to_file"
        tooltipMeta={{
          lineCount: linesCount,
        }}
        isPartial={isPartial}
        onClick={() => {
          setIsCollapsed((v) => !v);
          if (rawPath) {
            extensionService.postMessage({
              command: 'openFile',
              path: rawPath,
            });
          }
        }}
        path={rawPath}
        onPathClick={(clickedPath) => {
          extensionService.postMessage({
            command: 'openFile',
            path: clickedPath,
          });
        }}
      />

      {/* Single-line review UI */}
      {!shouldHideContent &&
        singleLineReviewActions?.[actionId] &&
        (() => {
          const reviewContent = action.params.content || '';
          return (
            <div className="mt-2 flex flex-col gap-1.5">
              <textarea
                readOnly
                value={reviewContent}
                className="w-full min-h-[200px] max-h-[400px] py-2 px-2.5 font-mono text-[11px] leading-[1.5] text-text-primary bg-card-background border-[1.5px] border-dashed border-[#e5a100] rounded resize-y outline-none whitespace-pre-wrap break-all"
              />
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-[#e5a100] font-medium flex items-center gap-1">
                  <span className="codicon codicon-warning text-[11px]" />
                  Nội dung file bị dồn vào 1 dòng ({reviewContent.length} ký tự)
                </span>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRejectSingleLineAction?.(actionId);
                    }}
                    className="flex items-center gap-1 px-3 py-1 text-[11px] font-semibold rounded bg-error/10 border border-error/40 text-error cursor-pointer"
                  >
                    <span className="codicon codicon-close text-[11px]" />
                    Từ chối
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onConfirmSingleLineAction?.(actionId);
                    }}
                    className="flex items-center gap-1 px-3 py-1 text-[11px] font-semibold rounded bg-success/10 border border-success/40 text-success cursor-pointer"
                  >
                    <span className="codicon codicon-check text-[11px]" />
                    Xác nhận
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {!shouldHideContent && !isCompleted && (
        <div className="my-2 order-1">
          <ActionBar
            action={action}
            messageId={messageId}
            actionIndex={actionIndex}
            hasError={hasValidationError || isError}
            isCompleted={isCompleted}
            onAction={handleToolClickWithLog}
          />
        </div>
      )}

      {!shouldHideContent && isError && errorMessage && (
        <ErrorBlock content={errorMessage} compact={true} maxHeight="300px" />
      )}

      {!shouldHideContent && hasValidationError && action.errorMessage && (
        <ErrorBlock
          content={`Validation Error: ${action.errorMessage}`}
          compact={true}
          maxHeight="300px"
        />
      )}
    </div>
  );
};
