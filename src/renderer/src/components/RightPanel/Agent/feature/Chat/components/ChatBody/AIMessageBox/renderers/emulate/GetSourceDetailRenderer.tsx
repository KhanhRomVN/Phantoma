import React from 'react';
import { cn } from '@renderer/shared/utils/cn';

// ── Constants ──
import { getToolLabel } from '../../../../../constants/constants';

// ── Types ──
import { BaseRendererProps } from '../../../../../types/renderer-types';

// ── Utils ──
import { getFileIconPath } from '@renderer/shared/utils/fileIconMapper';

// ── Components ──
import { TagHeader } from '../../TagHeader';
import ErrorBlock from '../../blocks/other/ErrorBlock';

export const GetSourceDetailRenderer: React.FC<BaseRendererProps> = ({
  action,
  actionIndex,
  messageId,
  isActionClicked,
  isActiveGroup,
  isLastItemInList,
  toolOutputs,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const actionId = `${messageId}-action-${actionIndex}`;
  const filepath = action.params.filepath || '';
  const filename = filepath.split('/').pop() || filepath;
  const output = toolOutputs?.[actionId]?.output;
  const isError = !!toolOutputs?.[actionId]?.isError;
  const errorMessage = isError ? output || '' : '';

  const isCompleted = Boolean(isActionClicked || isError || (output && output.trim().length > 0));

  const fileIconPath = getFileIconPath(filename);

  return (
    <div className={cn('flex flex-col gap-1.5 pb-1', isLastItemInList ? 'mb-0' : 'mb-0.5')}>
      <TagHeader
        title={
          <div className="flex items-center gap-2 text-xs text-text-primary">
            <span className="font-semibold opacity-80">{getToolLabel('get_source_detail')}</span>
            {isCompleted && !isError && filename && (
              <>
                <img
                  src={fileIconPath}
                  alt=""
                  className="w-4 h-4 shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <span className="font-medium opacity-90 font-mono text-[11px]">{filename}</span>
              </>
            )}
            {!isCompleted && (
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
        toolType="get_source_detail"
        isPartial={!isCompleted}
        onClick={() => setIsCollapsed((v) => !v)}
        path={filepath}
      />

      {isError && errorMessage && (
        <ErrorBlock content={errorMessage} compact={true} maxHeight="300px" />
      )}
    </div>
  );
};
