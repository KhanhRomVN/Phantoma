import React from 'react';
import { cn } from '@renderer/shared/utils/cn';

// ── Constants ──
import { getToolLabel } from '@renderer/components/RightPanel/Zen/feature/Chat/constants/tag-registry';

// ── Types ──
import { getNextUserMessage } from '@renderer/components/RightPanel/Zen/feature/Chat/utils/message-navigator';

const getDisplayPath = (fullPath: string, allPaths: string[]): string => {
  const sep = /[\/\\]/;
  const parts = fullPath.split(sep).filter(Boolean);
  if (parts.length === 0) return fullPath;
  for (let depth = 1; depth <= parts.length; depth++) {
    const candidate = parts.slice(-depth).join('/');
    const conflicts = allPaths.filter((p) => {
      const ps = p.split(sep).filter(Boolean);
      return ps.slice(-depth).join('/') === candidate && p !== fullPath;
    });
    if (conflicts.length === 0) return candidate;
  }
  return parts.join('/');
};

const collectConvFilePaths = (allMessages: any[]): string[] => {
  const paths: string[] = [];
  const filePathRegex = /<file_path>([\s\S]*?)<\/file_path>/g;
  for (const msg of allMessages) {
    if (msg.role !== 'assistant') continue;
    let m: RegExpExecArray | null;
    while ((m = filePathRegex.exec(msg.content)) !== null) {
      if (m[1].trim()) paths.push(m[1].trim());
    }
    filePathRegex.lastIndex = 0;
  }
  return paths;
};

const getFilename = (action: any): string => {
  if (action.type === 'run_command') {
    const id = action.params.terminal_id || '';
    const cmd = action.params.command || action.params.text || '';
    if (id && cmd) return `${id}: ${cmd.substring(0, 30)}${cmd.length > 30 ? '...' : ''}`;
    if (id) return id;
    return cmd.length > 50 ? cmd.substring(0, 50) + '...' : cmd;
  }
  const path = action.params.file_path || action.params.folder_path || action.params.path || '';
  return path.split('/').pop() || path || '';
};

import { BaseRendererProps } from '@renderer/components/RightPanel/Zen/feature/Chat/types/renderer-types';

// ── Utils ──

import { getFileIconPath } from '@renderer/shared/utils/fileIconMapper';

// ── Components ──
import { TagHeader } from '@renderer/components/RightPanel/Zen/feature/Chat/components/ChatBody/AIMessageBox/TagHeader';
import ActionBar from '@renderer/components/RightPanel/Zen/feature/Chat/components/ChatBody/AIMessageBox/ActionBar';
import ErrorBlock from '@renderer/components/RightPanel/Zen/feature/Chat/components/ChatBody/AIMessageBox/ErrorBlock';

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
  moduleId,
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
            <span className="font-semibold opacity-80">
              {getToolLabel('delete_file', moduleId)}
            </span>
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
        compactPath
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
