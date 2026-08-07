import React, { useState } from 'react';
import { cn } from '@renderer/shared/utils/cn';

// Constants
import { getToolLabel } from '../../../../../constants/constants';

// Types
import { BaseRendererProps } from '../../../../../types/renderer-types';

// ICONS
import FileIcon from '@renderer/components/common/FileIcon';

// Components
import { TagHeader } from '../../TagHeader';
import ErrorBlock from '../../blocks/other/ErrorBlock';

/**
 * Renderer for view_replace_history tool type
 * Shows history of replace operations for a file
 */
export const ViewReplaceHistoryRenderer: React.FC<BaseRendererProps> = ({
  action,
  actionIndex,
  messageId,
  isLastItemInList,
  toolOutputs,
}) => {
  const actionId = `${messageId}-action-${actionIndex}`;
  const [isExpanded, setIsExpanded] = useState(false);

  const filePath = action.params.file_path || action.params.path || '';
  const outputData = toolOutputs?.[actionId];
  const isError = outputData?.isError || false;
  const isCompleted = !!outputData;

  // Parse histories from output
  let histories: any[] = [];
  let currentVersion: number | undefined;
  try {
    if (outputData?.output && typeof outputData.output === 'string') {
      if (outputData.output === 'No history') {
        histories = [];
      } else {
        histories = JSON.parse(outputData.output);
        // Current version là version cao nhất
        if (histories.length > 0) {
          currentVersion = Math.max(...histories.map((h: any) => h.version));
        }
      }
    }
  } catch (e) {
    // Ignore parse error - histories will remain empty array
  }

  // Determine color based on status
  const historyColor = isError
    ? 'rgb(255, 45, 85)'
    : isCompleted
      ? 'rgb(48, 209, 88)'
      : 'rgb(10, 132, 255)';

  // Summary result for TagHeader
  const summaryResult =
    isCompleted && !isError && histories.length > 0
      ? `${histories.length} ${histories.length === 1 ? 'version' : 'versions'}`
      : undefined;

  const handleTagClick = () => {
    if (isCompleted && !isError && histories.length > 0) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className={cn('relative flex flex-col gap-2', isLastItemInList ? 'mb-0' : 'mb-2')}>
      <div
        onClick={handleTagClick}
        className={
          isCompleted && !isError && histories.length > 0 ? 'cursor-pointer' : 'cursor-default'
        }
      >
        <TagHeader
          title={
            <div className="flex items-center gap-2 text-xs text-text-primary">
              <span className="font-semibold opacity-80">
                {getToolLabel('view_replace_history')}
              </span>
              <span className="flex items-center">
                <FileIcon
                  path={filePath}
                  isFolder={false}
                  style={{ width: '16px', height: '16px' }}
                />
              </span>
              <span className="font-mono text-[11px] font-medium opacity-90">
                {filePath.split('/').pop() || filePath}
              </span>
              {summaryResult && (
                <span className="opacity-50 text-[10px] text-text-secondary">{summaryResult}</span>
              )}
            </div>
          }
          path={filePath}
          statusColor={historyColor}
          isPartial={false}
          isError={isError}
          toolType="view_replace_history"
          tooltipMeta={{
            fileCount: histories.length,
          }}
        />
      </div>
      {isError && (
        <ErrorBlock
          content={outputData?.output || 'Failed to load history'}
          showHeader={false}
          maxHeight="300px"
        />
      )}
    </div>
  );
};
