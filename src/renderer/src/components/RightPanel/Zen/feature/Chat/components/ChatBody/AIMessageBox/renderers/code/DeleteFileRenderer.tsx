import React from 'react';
import { cn } from '@renderer/shared/utils/cn';

// ── Constants ──
import { getToolLabel } from '../../../../../constants/constants';

// ── Types ──
import {
  getDisplayPath,
  collectConvFilePaths,
  getNextUserMessage,
} from '../../../../../utils/renderer-utils';
import { BaseRendererProps } from '../../../../../types/renderer-types';

// ── Utils ──
import { getFilename } from '../../../../../utils/toolUtils';

import { getFileIconPath } from '@renderer/shared/utils/fileIconMapper';

// ── Components ──
import { TagHeader } from '../../TagHeader';
import ActionBar from '../../ActionBar';
import ErrorBlock from '../../blocks/other/ErrorBlock';

/**
 * Renderer cho loại tool delete_file
 */
export const DeleteFileRenderer: React.FC<BaseRendererProps> = ({
  action,
  actionIndex,
  messageId,
  isActionClicked,
  isLastItemInList,
  toolOutputs,
  allMessages,
  onToolClick,
}) => {
  const toolType = action.type;
  const actionId = `${messageId}-action-${actionIndex}`;

  const rawPath =
    action.params.file_path ||
    action.params.folder_path ||
    action.params.path ||
    getFilename(action);

  const allPaths = React.useMemo(() => collectConvFilePaths(allMessages || []), [allMessages]);

  const nextUserMessage = getNextUserMessage(allMessages || [], messageId);

  const isCompleted: boolean = Boolean(
    !!isActionClicked || !!toolOutputs?.[actionId] || !!nextUserMessage,
  );

  const isError = !!toolOutputs?.[actionId]?.isError;
  const errorMessage = isError ? toolOutputs?.[actionId]?.output || '' : '';

  const hasValidationError = !!action.isError;

  return (
    <div className={cn('flex flex-col gap-1.5 pb-1', isLastItemInList ? 'mb-0' : 'mb-0.5')}>
      <TagHeader
        title={
          <div className="flex items-center gap-2 text-xs text-text-primary">
            <span className="font-semibold opacity-80">{getToolLabel('delete_file')}</span>
            <img src={getFileIconPath(rawPath)} alt="" style={{ width: '14px', height: '14px' }} />
            <span className="font-medium opacity-80 font-mono text-[11px]">
              {getDisplayPath(rawPath, allPaths) || '...'}
            </span>
            {isCompleted && !isError && (
              <span className="text-[10px] opacity-50 text-text-secondary">deleted</span>
            )}
          </div>
        }
        path={rawPath}
        statusColor={
          isError ? 'rgb(255, 45, 85)' : isCompleted ? 'rgb(255, 45, 85)' : 'rgb(10, 132, 255)'
        }
        isPartial={false}
        isError={isError}
        toolType={toolType}
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
            onAction={(_e, type) => onToolClick(action, messageId, actionIndex, type)}
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
